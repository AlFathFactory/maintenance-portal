import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { rolldown } from 'rolldown';

const require = createRequire(import.meta.url);
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'hse-tests-'));
const id = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
let repository;
let validation;
let errors;
let queryKeys;

before(async () => {
  for (const [name, input] of [
    ['repository', 'src/services/hse/repository.ts'],
    ['validation', 'src/services/hse/validation.ts'],
    ['errors', 'src/services/hse/errors.ts'],
    ['queryKeys', 'src/features/hse/queryKeys.ts'],
  ]) {
    const bundle = await rolldown({ input });
    await bundle.write({ dir: output, format: 'cjs' });
    await bundle.close();
  }
  repository = require(path.join(output, 'repository.js'));
  validation = require(path.join(output, 'validation.js'));
  errors = require(path.join(output, 'errors.js'));
  queryKeys = require(path.join(output, 'queryKeys.js'));
});
after(() => fs.rmSync(output, { recursive: true, force: true }));

function fakeDatabase(rows = {}, role = 'hse_engineer') {
  const calls = [];
  const database = {
    auth: {
      async getUser() {
        return { data: { user: { id: userId } }, error: null };
      },
    },
    from(table) {
      calls.push({ table });
      const query = {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        order() {
          return this;
        },
        range() {
          return Promise.resolve({ data: rows[table] ?? [], error: null });
        },
        insert(payload) {
          calls.push({ table, operation: 'insert', payload });
          return this;
        },
        update(payload) {
          calls.push({ table, operation: 'update', payload });
          return this;
        },
        upsert(payload) {
          calls.push({ table, operation: 'upsert', payload });
          return this;
        },
        delete() {
          calls.push({ table, operation: 'delete' });
          return this;
        },
        async maybeSingle() {
          return {
            data: table === 'hse_members' ? { role, is_active: true } : (rows[table] ?? null),
            error: null,
          };
        },
        async single() {
          return { data: rows[table] ?? { id }, error: null };
        },
        then(resolve) {
          return Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve);
        },
      };
      return query;
    },
    async rpc(name, payload) {
      calls.push({ rpc: name, payload });
      return { data: rows.rpc ?? null, error: null };
    },
  };
  return { database, calls };
}

test('chain and checklist input validation rejects malformed values', () => {
  assert.throws(() =>
    validation.validateChainCreate({
      tag_no: ' A ',
      number_of_legs: 1,
      working_load_limit_tons: 2,
      length_m: 1,
      start_working_date: '2026-01-01',
    }),
  );
  assert.throws(() =>
    validation.validateChainFields({
      number_of_legs: 5,
      working_load_limit_tons: 2,
      length_m: 1,
      start_working_date: '2026-01-01',
    }),
  );
  assert.throws(() => validation.assertDate('2026-02-30'));
  assert.throws(() => validation.assertInspectionResult('Rejected'));
  assert.deepEqual(validation.pageRange(10, 25), [10, 34]);
});

test('database errors preserve cause while exposing safe codes', () => {
  const cause = { code: '23505', message: 'hse_chains_active_tag_unique_ci' };
  const mapped = errors.hseError(cause);
  assert.equal(mapped.code, 'DUPLICATE_TAG');
  assert.equal(mapped.cause, cause);
  assert.equal(errors.hseError({ code: '42501', message: 'permission denied' }).code, 'FORBIDDEN');
});

test('HSE queries stay disabled until authorization and use isolated keys', () => {
  assert.equal(queryKeys.canLoadHSE(userId, null, false), false);
  assert.equal(queryKeys.canLoadHSE(userId, 'hse_supervisor', true), false);
  assert.equal(queryKeys.canLoadHSE(null, 'hse_engineer', false), false);
  assert.equal(queryKeys.canLoadHSE(userId, 'hse_engineer', false), true);
  for (const key of [
    queryKeys.hseKeys.chain(id),
    queryKeys.hseKeys.checklistVersion(2),
    queryKeys.hseKeys.inspection(id),
  ]) {
    assert.equal(key[0], 'hse');
  }
});

test('demo mode fails explicitly', async () => {
  await assert.rejects(repository.createHSERepository(null).listChains({ status: 'active' }), {
    code: 'SUPABASE_UNAVAILABLE',
  });
});

test('scrapping uses the atomic RPC with exact parameters', async () => {
  const chain = { id, status: 'active', start_working_date: '2025-01-01' };
  const { database, calls } = fakeDatabase({ hse_chains: chain, rpc: null });
  await repository
    .createHSERepository(database)
    .scrapChain({ chainId: id, scrappingDate: '2026-01-01' });
  assert.equal(calls.find((call) => call.rpc)?.rpc, 'hse_scrap_chain');
  assert.deepEqual(calls.find((call) => call.rpc)?.payload, {
    p_chain_id: id,
    p_scrapping_date: '2026-01-01',
    p_scrapping_reason: null,
    p_create_replacement: false,
    p_number_of_legs: null,
    p_working_load_limit_tons: null,
    p_length_m: null,
    p_start_working_date: null,
  });
  assert.equal(
    calls.some((call) => call.operation === 'update' || call.operation === 'insert'),
    false,
  );
});

test('supervisor cannot start an engineer chain mutation', async () => {
  const { database, calls } = fakeDatabase({}, 'hse_supervisor');
  await assert.rejects(
    repository
      .createHSERepository(database)
      .scrapChain({ chainId: id, scrappingDate: '2026-01-01' }),
    { code: 'FORBIDDEN' },
  );
  assert.equal(
    calls.some((call) => call.rpc),
    false,
  );
});

test('published checklist cannot receive section writes', async () => {
  const { database, calls } = fakeDatabase({
    hse_chain_checklist_versions: { version: 1, state: 'published' },
  });
  await assert.rejects(
    repository.createHSERepository(database).createChecklistSection({
      template_version: 1,
      section_key: 'hooks',
      sort_order: 1,
      name_en: 'Hooks',
      name_ar: 'خطاطيف',
    }),
    { code: 'IMMUTABLE_RECORD' },
  );
  assert.equal(
    calls.some((call) => call.operation === 'insert'),
    false,
  );
});

test('submission requires a prior explicit inspector signature', async () => {
  const inspection = { id, inspector_id: userId, status: 'draft' };
  const { database, calls } = fakeDatabase({
    hse_chain_inspections: inspection,
    hse_inspection_signatures: [],
  });
  await assert.rejects(repository.createHSERepository(database).submitInspection(id), {
    code: 'MISSING_SIGNATURE',
  });
  assert.equal(
    calls.some((call) => call.rpc),
    false,
  );
});

test('missing chain returns null without inventing a record', async () => {
  const { database } = fakeDatabase();
  assert.equal(await repository.createHSERepository(database).getChain(id), null);
});

test('new inspection sends only editable fields and lets the database set identity and snapshot', async () => {
  const { database, calls } = fakeDatabase({
    hse_chains: { id, status: 'active' },
    hse_chain_checklist_versions: { version: 1, state: 'published' },
  });
  const input = { chain_id: id, template_version: 1, inspection_date: '2026-11-16' };
  await repository.createHSERepository(database).createInspection(input);
  assert.deepEqual(
    calls.find((call) => call.table === 'hse_chain_inspections' && call.operation === 'insert')
      ?.payload,
    input,
  );
});

test('signed inspection submission invokes the existing RPC without inserting another signature', async () => {
  const { database, calls } = fakeDatabase({
    hse_chain_inspections: { id, inspector_id: userId, status: 'draft' },
    hse_inspection_signatures: [{ signer_role: 'inspector', signed_by: userId }],
    rpc: { id, status: 'pending_approval' },
  });
  await repository.createHSERepository(database).submitInspection(id);
  assert.deepEqual(
    calls.find((call) => call.rpc),
    {
      rpc: 'hse_submit_chain_inspection',
      payload: { p_inspection_id: id },
    },
  );
  assert.equal(
    calls.some((call) => call.operation === 'insert'),
    false,
  );
});

test('approval waits for an explicit engineer signature', async () => {
  const { database, calls } = fakeDatabase({
    hse_chain_inspections: { id, status: 'pending_approval' },
    hse_inspection_signatures: [],
  });
  await assert.rejects(repository.createHSERepository(database).approveInspection(id), {
    code: 'MISSING_SIGNATURE',
  });
  assert.equal(
    calls.some((call) => call.rpc),
    false,
  );
});
