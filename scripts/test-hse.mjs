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
        select(columns, options) {
          calls.push({ table, operation: 'select', columns, options });
          return this;
        },
        eq(column, value) {
          calls.push({ table, operation: 'eq', column, value });
          return this;
        },
        ilike(column, value) {
          calls.push({ table, operation: 'ilike', column, value });
          return this;
        },
        gte(column, value) {
          calls.push({ table, operation: 'gte', column, value });
          return this;
        },
        lte(column, value) {
          calls.push({ table, operation: 'lte', column, value });
          return this;
        },
        in(column, value) {
          calls.push({ table, operation: 'in', column, value });
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
          return Promise.resolve({
            data: rows[table] ?? [],
            count: rows.count ?? null,
            error: null,
          }).then(resolve);
        },
      };
      return query;
    },
    async rpc(name, payload) {
      calls.push({ rpc: name, payload });
      return { data: rows.rpc ?? null, error: rows.rpcError ?? null };
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
    queryKeys.hseKeys.chainCount({ status: 'active' }),
    queryKeys.hseKeys.chainReplacements([id]),
    queryKeys.hseKeys.checklistVersion(2),
    queryKeys.hseKeys.inspection(id),
  ]) {
    assert.equal(key[0], 'hse');
  }
  assert.deepEqual(
    queryKeys.hseKeys.chainCount({ status: 'active' }).slice(0, 2),
    queryKeys.hseKeys.chains,
  );
  assert.deepEqual(queryKeys.hseKeys.chainReplacements([id]).slice(0, 2), queryKeys.hseKeys.chains);
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

test('inventory applies server filters, pagination, and exact count', async () => {
  const { database, calls } = fakeDatabase({ hse_chains: [], count: 137 });
  const repo = repository.createHSERepository(database);
  const filter = {
    status: 'scrapped',
    tagNo: 'CH-0',
    legs: 2,
    scrappedFrom: '2026-01-01',
    scrappedTo: '2026-12-31',
    offset: 20,
    limit: 20,
  };
  await repo.listChains(filter);
  assert.equal(await repo.countChains(filter), 137);
  assert.equal(calls.filter((call) => call.operation === 'ilike').length, 2);
  assert.equal(
    calls.filter((call) => call.operation === 'eq' && call.column === 'number_of_legs').length,
    2,
  );
  assert.equal(
    calls.filter((call) => call.operation === 'gte' && call.column === 'scrapping_date').length,
    2,
  );
  assert.equal(
    calls.filter((call) => call.operation === 'lte' && call.column === 'scrapping_date').length,
    2,
  );
  assert.ok(calls.some((call) => call.options?.count === 'exact' && call.options?.head === true));
});

test('replacement lookup batches predecessor UUIDs', async () => {
  const { database, calls } = fakeDatabase({ hse_chains: [] });
  await repository.createHSERepository(database).listChainReplacements([id]);
  assert.ok(
    calls.some(
      (call) =>
        call.operation === 'in' && call.column === 'replaces_chain_id' && call.value[0] === id,
    ),
  );
});

test('delayed replacement preserves predecessor UUID and reuses its tag', async () => {
  const { database, calls } = fakeDatabase({
    hse_chains: { id, status: 'scrapped', tag_no: 'CH-001' },
  });
  await repository.createHSERepository(database).createChain({
    tag_no: 'CH-001',
    replaces_chain_id: id,
    number_of_legs: 2,
    working_load_limit_tons: 3.15,
    length_m: 2.5,
    start_working_date: '2026-11-16',
  });
  const write = calls.find((call) => call.table === 'hse_chains' && call.operation === 'insert');
  assert.equal(write.payload.replaces_chain_id, id);
  assert.equal(write.payload.tag_no, 'CH-001');
  assert.equal(write.payload.id, undefined);
});

test('mismatched predecessor tag is refused before writing', async () => {
  const { database, calls } = fakeDatabase({
    hse_chains: { id, status: 'scrapped', tag_no: 'CH-001' },
  });
  await assert.rejects(
    repository.createHSERepository(database).createChain({
      tag_no: 'CH-002',
      replaces_chain_id: id,
      number_of_legs: 2,
      working_load_limit_tons: 3,
      length_m: 2,
      start_working_date: '2026-11-16',
    }),
    { code: 'INVALID_LINEAGE' },
  );
  assert.equal(
    calls.some((call) => call.operation === 'insert'),
    false,
  );
});

test('scrapped chain edit is refused and supervisor cannot edit', async () => {
  const input = {
    number_of_legs: 2,
    working_load_limit_tons: 3,
    length_m: 2,
    start_working_date: '2026-11-16',
  };
  const scrapped = fakeDatabase({ hse_chains: { id, status: 'scrapped' } });
  await assert.rejects(repository.createHSERepository(scrapped.database).updateChain(id, input), {
    code: 'IMMUTABLE_RECORD',
  });
  assert.equal(
    scrapped.calls.some((call) => call.operation === 'update'),
    false,
  );
  const supervisor = fakeDatabase({}, 'hse_supervisor');
  await assert.rejects(repository.createHSERepository(supervisor.database).updateChain(id, input), {
    code: 'FORBIDDEN',
  });
  assert.equal(
    supervisor.calls.some((call) => call.operation === 'update'),
    false,
  );
});

test('immediate replacement calls one atomic RPC and propagates failure', async () => {
  const { database, calls } = fakeDatabase({
    hse_chains: { id, status: 'active', start_working_date: '2025-01-01' },
    rpcError: { code: '42501', message: 'permission denied' },
  });
  await assert.rejects(
    repository.createHSERepository(database).scrapChain({
      chainId: id,
      scrappingDate: '2026-11-16',
      replacement: {
        number_of_legs: 4,
        working_load_limit_tons: 5,
        length_m: 3,
        start_working_date: '2026-11-16',
      },
    }),
    { code: 'FORBIDDEN' },
  );
  const rpc = calls.find((call) => call.rpc);
  assert.equal(rpc.rpc, 'hse_scrap_chain');
  assert.equal(rpc.payload.p_create_replacement, true);
  assert.equal(rpc.payload.p_number_of_legs, 4);
  assert.equal(
    calls.some((call) => call.operation === 'update' || call.operation === 'insert'),
    false,
  );
});
