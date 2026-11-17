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
let checklistModel;
let inspectionModel;

before(async () => {
  for (const [name, input] of [
    ['repository', 'src/services/hse/repository.ts'],
    ['validation', 'src/services/hse/validation.ts'],
    ['errors', 'src/services/hse/errors.ts'],
    ['queryKeys', 'src/features/hse/queryKeys.ts'],
    ['checklistModel', 'src/features/hse/checklist/checklistModel.ts'],
    ['inspectionModel', 'src/features/hse/inspections/inspectionModel.ts'],
  ]) {
    const bundle = await rolldown({ input });
    await bundle.write({ dir: output, format: 'cjs' });
    await bundle.close();
  }
  repository = require(path.join(output, 'repository.js'));
  validation = require(path.join(output, 'validation.js'));
  errors = require(path.join(output, 'errors.js'));
  queryKeys = require(path.join(output, 'queryKeys.js'));
  checklistModel = require(path.join(output, 'checklistModel.js'));
  inspectionModel = require(path.join(output, 'inspectionModel.js'));
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
        or(value) {
          calls.push({ table, operation: 'or', value });
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
        order(column) {
          calls.push({ table, operation: 'order', column });
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
    hse_inspection_signatures: null,
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

test('version selection prefers actual published state and keeps explicit selection', () => {
  const versions = [
    { version: 2, state: 'draft' },
    { version: 1, state: 'published' },
    { version: 3, state: 'archived' },
  ];
  assert.equal(checklistModel.selectedVersion(versions, null), 1);
  assert.equal(checklistModel.selectedVersion(versions, '3'), 3);
  assert.equal(checklistModel.selectedVersion(versions, 'missing'), null);
  assert.equal(checklistModel.selectedVersion([], null), null);
  assert.equal(checklistModel.canEditChecklist('hse_engineer', 'draft'), true);
  assert.equal(checklistModel.canEditChecklist('hse_engineer', 'published'), false);
  assert.equal(checklistModel.canEditChecklist('hse_engineer', 'archived'), false);
  assert.equal(checklistModel.canEditChecklist('hse_supervisor', 'draft'), false);
});

test('new checklist positions append without changing existing orders', () => {
  assert.equal(checklistModel.nextSortOrder([]), 1);
  assert.equal(checklistModel.nextSortOrder([1, 3, 2]), 4);
  assert.throws(
    () => checklistModel.assertUniqueSectionKey([{ id, section_key: 'hooks' }], 'hooks'),
    { code: 'DUPLICATE_RECORD' },
  );
  checklistModel.assertUniqueSectionKey([{ id, section_key: 'hooks' }], 'hooks', id);
});

test('checklist read nests checkpoints under backend-ordered sections', async () => {
  const secondId = '33333333-3333-4333-8333-333333333333';
  const { database, calls } = fakeDatabase({
    hse_chain_checklist_versions: { version: 1, state: 'published', published_at: '2026-11-16' },
    hse_chain_checklist_sections: [
      { id, template_version: 1, sort_order: 1 },
      { id: secondId, template_version: 1, sort_order: 2 },
    ],
    hse_chain_checklist_items: [
      { id: 'a', section_id: id, sort_order: 1 },
      { id: 'b', section_id: secondId, sort_order: 1 },
    ],
  });
  const checklist = await repository.createHSERepository(database).getChecklist(1);
  assert.equal(checklist.sections.length, 2);
  assert.deepEqual(
    checklist.sections.map((section) => section.items[0].id),
    ['a', 'b'],
  );
  assert.ok(
    calls.some(
      (call) =>
        call.table === 'hse_chain_checklist_sections' &&
        call.operation === 'order' &&
        call.column === 'sort_order',
    ),
  );
  assert.ok(
    calls.some(
      (call) =>
        call.table === 'hse_chain_checklist_items' &&
        call.operation === 'order' &&
        call.column === 'sort_order',
    ),
  );
});

test('Draft section and checkpoint writes use verified tables and stable IDs', async () => {
  const { database, calls } = fakeDatabase({
    hse_chain_checklist_versions: { version: 2, state: 'draft' },
    hse_chain_checklist_sections: { id, template_version: 2 },
    hse_chain_checklist_items: { id, template_version: 2 },
  });
  const repo = repository.createHSERepository(database);
  await repo.createChecklistSection({
    template_version: 2,
    section_key: 'hooks',
    sort_order: 7,
    name_en: 'Hooks',
    name_ar: 'خطاطيف',
  });
  await repo.updateChecklistSection(id, { name_en: 'Hooks and links' });
  await repo.createChecklistItem({
    template_version: 2,
    section_id: id,
    sort_order: 30,
    check_text_en: 'Check hooks',
  });
  await repo.updateChecklistItem(id, { check_text_en: 'Check all hooks' });
  assert.ok(
    calls.some(
      (call) =>
        call.table === 'hse_chain_checklist_sections' &&
        call.operation === 'insert' &&
        call.payload.sort_order === 7,
    ),
  );
  assert.ok(
    calls.some(
      (call) =>
        call.table === 'hse_chain_checklist_items' &&
        call.operation === 'insert' &&
        call.payload.section_id === id,
    ),
  );
  assert.ok(
    calls.some(
      (call) =>
        call.table === 'hse_chain_checklist_items' &&
        call.operation === 'update' &&
        call.payload.check_text_en === 'Check all hooks' &&
        !('id' in call.payload),
    ),
  );
});

test('Archived checklist rejects edits and supervisor rejects Draft writes', async () => {
  const input = {
    template_version: 3,
    section_key: 'hooks',
    sort_order: 1,
    name_en: 'Hooks',
    name_ar: 'خطاطيف',
  };
  const archived = fakeDatabase({
    hse_chain_checklist_versions: { version: 3, state: 'archived' },
  });
  await assert.rejects(
    repository.createHSERepository(archived.database).createChecklistSection(input),
    { code: 'IMMUTABLE_RECORD' },
  );
  assert.equal(
    archived.calls.some((call) => call.operation === 'insert'),
    false,
  );
  const supervisor = fakeDatabase(
    { hse_chain_checklist_versions: { version: 3, state: 'draft' } },
    'hse_supervisor',
  );
  await assert.rejects(
    repository.createHSERepository(supervisor.database).createChecklistSection(input),
    { code: 'FORBIDDEN' },
  );
  assert.equal(
    supervisor.calls.some((call) => call.operation === 'insert'),
    false,
  );
});

test('Draft section deletion is one database delete, not browser checkpoint deletes', async () => {
  const { database, calls } = fakeDatabase({
    hse_chain_checklist_versions: { version: 2, state: 'draft' },
    hse_chain_checklist_sections: { id, template_version: 2 },
  });
  await repository.createHSERepository(database).deleteChecklistSection(id);
  assert.equal(
    calls.filter(
      (call) => call.operation === 'delete' && call.table === 'hse_chain_checklist_sections',
    ).length,
    1,
  );
  assert.equal(
    calls.some((call) => call.operation === 'delete' && call.table === 'hse_chain_checklist_items'),
    false,
  );
});

test('Draft checkpoint deletion targets only its UUID', async () => {
  const { database, calls } = fakeDatabase({
    hse_chain_checklist_versions: { version: 2, state: 'draft' },
    hse_chain_checklist_items: { id, template_version: 2 },
  });
  await repository.createHSERepository(database).deleteChecklistItem(id);
  assert.equal(
    calls.filter(
      (call) => call.operation === 'delete' && call.table === 'hse_chain_checklist_items',
    ).length,
    1,
  );
  assert.ok(
    calls.some(
      (call) =>
        call.table === 'hse_chain_checklist_items' &&
        call.operation === 'eq' &&
        call.column === 'id' &&
        call.value === id,
    ),
  );
});

test('published checkpoint update and invalid Draft input are rejected before writes', async () => {
  const published = fakeDatabase({
    hse_chain_checklist_versions: { version: 1, state: 'published' },
    hse_chain_checklist_items: { id, template_version: 1 },
  });
  await assert.rejects(
    repository
      .createHSERepository(published.database)
      .updateChecklistItem(id, { check_text_en: 'Changed' }),
    { code: 'IMMUTABLE_RECORD' },
  );
  assert.equal(
    published.calls.some((call) => call.operation === 'update'),
    false,
  );
  assert.throws(
    () =>
      validation.validateSectionCreate({
        template_version: 2,
        section_key: ' ',
        sort_order: 1,
        name_en: 'Hooks',
        name_ar: 'خطاطيف',
      }),
    { code: 'INVALID_INPUT' },
  );
  assert.throws(
    () =>
      validation.validateItemCreate({
        template_version: 2,
        section_id: id,
        sort_order: 0,
        check_text_en: 'Check',
      }),
    { code: 'INVALID_INPUT' },
  );
});

test('empty checklist is a valid loaded version with no sections', async () => {
  const { database } = fakeDatabase({
    hse_chain_checklist_versions: { version: 2, state: 'draft', published_at: null },
    hse_chain_checklist_sections: [],
    hse_chain_checklist_items: [],
  });
  const result = await repository.createHSERepository(database).getChecklist(2);
  assert.equal(result.version.published_at, null);
  assert.deepEqual(result.sections, []);
});

test('inspection progress treats N/A as completed and excludes stale item IDs', () => {
  const checklist = { sections: [{ id, items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }] };
  const answers = { a: 'OK', b: 'N/A', obsolete: 'Faulty' };
  assert.deepEqual(inspectionModel.inspectionProgress(checklist, answers), {
    total: 3,
    completed: 2,
    unanswered: 1,
    OK: 1,
    Faulty: 0,
    'N/A': 1,
  });
  assert.deepEqual(inspectionModel.changedAnswers(checklist, answers, { a: 'OK' }), [
    { itemId: 'b', result: 'N/A' },
  ]);
});

test('inspection draft editing requires owner, Draft status, and no signature', () => {
  const record = { status: 'draft', inspector_id: userId };
  assert.equal(inspectionModel.canEditInspection(record, userId, false), true);
  assert.equal(inspectionModel.canEditInspection(record, id, false), false);
  assert.equal(inspectionModel.canEditInspection(record, userId, true), false);
  assert.equal(
    inspectionModel.canEditInspection({ ...record, status: 'pending_approval' }, userId, false),
    false,
  );
});

test('inspection list and count apply the same UUID, status, and date filters', async () => {
  const { database, calls } = fakeDatabase({ hse_chain_inspections: [], count: 2 });
  const repo = repository.createHSERepository(database);
  const filter = { search: id, status: 'draft', dateFrom: '2026-01-01', dateTo: '2026-12-31' };
  await repo.listInspections(filter);
  assert.equal(await repo.countInspections(filter), 2);
  assert.equal(calls.filter((call) => call.operation === 'or').length, 2);
  assert.equal(calls.filter((call) => call.operation === 'gte').length, 2);
  assert.equal(calls.filter((call) => call.operation === 'lte').length, 2);
  assert.ok(
    calls.some((call) => call.operation === 'select' && call.columns.includes('template_version')),
  );
});

test('inspection creation rejects scrapped chains and unpublished checklists before insert', async () => {
  const input = { chain_id: id, template_version: 2, inspection_date: '2026-11-17' };
  const scrapped = fakeDatabase({ hse_chains: { id, status: 'scrapped' } });
  await assert.rejects(repository.createHSERepository(scrapped.database).createInspection(input), {
    code: 'INVALID_STATE',
  });
  assert.equal(
    scrapped.calls.some((call) => call.operation === 'insert'),
    false,
  );
  const draft = fakeDatabase({
    hse_chains: { id, status: 'active' },
    hse_chain_checklist_versions: { version: 2, state: 'draft' },
  });
  await assert.rejects(repository.createHSERepository(draft.database).createInspection(input), {
    code: 'INVALID_STATE',
  });
  assert.equal(
    draft.calls.some((call) => call.operation === 'insert'),
    false,
  );
});

test('signature insertion uses authenticated inspector identity on an owned Draft', async () => {
  const { database, calls } = fakeDatabase({
    hse_chain_inspections: { id, inspector_id: userId, status: 'draft' },
    hse_inspection_signatures: null,
  });
  await repository.createHSERepository(database).signAsInspector(id);
  assert.deepEqual(
    calls.find((call) => call.table === 'hse_inspection_signatures' && call.operation === 'insert')
      .payload,
    {
      inspection_id: id,
      signer_role: 'inspector',
      signed_by: userId,
    },
  );
});

test('Draft results and section comments save under inspection UUID with matching checklist version', async () => {
  const { database, calls } = fakeDatabase({
    hse_chain_inspections: { id, inspector_id: userId, status: 'draft', template_version: 1 },
    hse_inspection_signatures: null,
    hse_chain_checklist_items: { id, template_version: 1 },
    hse_chain_checklist_sections: { id, template_version: 1 },
  });
  const repo = repository.createHSERepository(database);
  await repo.saveInspectionResult({ inspectionId: id, itemId: id, result: 'Faulty' });
  await repo.saveInspectionComment({ inspectionId: id, sectionId: id, comments: 'Replace hook' });
  assert.deepEqual(
    calls.find(
      (call) => call.table === 'hse_chain_inspection_results' && call.operation === 'upsert',
    ).payload,
    {
      inspection_id: id,
      item_id: id,
      result: 'Faulty',
    },
  );
  assert.deepEqual(
    calls.find(
      (call) => call.table === 'hse_chain_inspection_comments' && call.operation === 'upsert',
    ).payload,
    {
      inspection_id: id,
      section_id: id,
      comments_corrective_actions: 'Replace hook',
    },
  );
});

test('signed Draft rejects further result edits before upsert', async () => {
  const { database, calls } = fakeDatabase({
    hse_chain_inspections: { id, inspector_id: userId, status: 'draft', template_version: 1 },
    hse_inspection_signatures: { signer_role: 'inspector' },
  });
  await assert.rejects(
    repository
      .createHSERepository(database)
      .saveInspectionResult({ inspectionId: id, itemId: id, result: 'OK' }),
    {
      code: 'IMMUTABLE_RECORD',
    },
  );
  assert.equal(
    calls.some((call) => call.operation === 'upsert'),
    false,
  );
});
