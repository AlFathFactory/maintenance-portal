import type { SupabaseClient } from '@supabase/supabase-js';
import type { HSERepository } from '../hseRepository';
import type {
  Chain,
  Checklist,
  ChecklistItem,
  ChecklistSection,
  ChecklistVersion,
  ChainInspection,
  CheckpointResult,
  SectionComment,
  InspectionSignature,
  InspectionListItem,
  HSEPeriod,
  InspectionReportingData,
  InspectionResultRow,
} from '../../domain/hse';
import { HSEError, hseError } from './errors';
import {
  assertDate,
  assertInspectionResult,
  isUUID,
  assertPositiveInteger,
  assertUUID,
  pageRange,
  validateChainCreate,
  validateChainFields,
  validateItemCreate,
  validateItemUpdate,
  validateScrap,
  validateSectionCreate,
  validateSectionUpdate,
} from './validation';

type DB = SupabaseClient;
function checked<T>(data: T, error: unknown): T {
  if (error) throw hseError(error);
  return data;
}
function exactCount(count: number | null): number {
  if (count === null) throw new HSEError('UNKNOWN_ERROR');
  return count;
}
function required<T>(data: T | null): T {
  if (data === null) throw new HSEError('NOT_FOUND');
  return data;
}
function one<T>(data: T | null, error: unknown): T {
  return required(checked(data, error));
}

function tagPattern(tag: string): string {
  return `%${tag.trim().replace(/[\\%_]/g, '\\$&')}%`;
}

export function createHSERepository(database: DB | null): HSERepository {
  function db(): DB {
    if (!database) throw new HSEError('SUPABASE_UNAVAILABLE');
    return database;
  }
  async function member(engineer = false): Promise<string> {
    const { data: auth, error } = await db().auth.getUser();
    if (error || !auth.user) throw new HSEError('UNAUTHORIZED', { cause: error });
    const result = await db()
      .from('hse_members')
      .select('role,is_active')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    checked(result.data, result.error);
    if (!result.data?.is_active || (engineer && result.data.role !== 'hse_engineer'))
      throw new HSEError('FORBIDDEN');
    return auth.user.id;
  }
  async function version(number: number): Promise<ChecklistVersion | null> {
    assertPositiveInteger(number);
    const result = await db()
      .from('hse_chain_checklist_versions')
      .select('*')
      .eq('version', number)
      .maybeSingle();
    return checked(result.data as ChecklistVersion | null, result.error);
  }
  async function draft(number: number): Promise<void> {
    await member(true);
    const item = required(await version(number));
    if (item.state !== 'draft') throw new HSEError('IMMUTABLE_RECORD');
  }
  async function inspection(id: string): Promise<ChainInspection> {
    assertUUID(id);
    const result = await db().from('hse_chain_inspections').select('*').eq('id', id).maybeSingle();
    return required(checked(result.data as ChainInspection | null, result.error));
  }
  async function ownDraft(id: string): Promise<ChainInspection> {
    const userId = await member();
    const record = await inspection(id);
    if (record.inspector_id !== userId) throw new HSEError('FORBIDDEN');
    if (record.status !== 'draft') throw new HSEError('IMMUTABLE_RECORD');
    const signed = await db()
      .from('hse_inspection_signatures')
      .select('signer_role')
      .eq('inspection_id', id)
      .eq('signer_role', 'inspector')
      .maybeSingle();
    checked(signed.data, signed.error);
    if (signed.data) throw new HSEError('IMMUTABLE_RECORD');
    return record;
  }
  const repo: HSERepository = {
    async listChains(filter) {
      const [from, to] = pageRange(filter.offset, filter.limit);
      let query = db().from('hse_chains').select('*');
      if (filter.chainId) {
        assertUUID(filter.chainId);
        query = query.eq('id', filter.chainId);
      }
      if (filter.status) query = query.eq('status', filter.status);
      if (filter.replacedOnly) query = query.not('replaces_chain_id', 'is', null);
      if (filter.tagNo?.trim()) query = query.ilike('tag_no', tagPattern(filter.tagNo));
      if (filter.legs) query = query.eq('number_of_legs', filter.legs);
      if (filter.scrappedFrom) {
        assertDate(filter.scrappedFrom);
        query = query.gte('scrapping_date', filter.scrappedFrom);
      }
      if (filter.scrappedTo) {
        assertDate(filter.scrappedTo);
        query = query.lte('scrapping_date', filter.scrappedTo);
      }
      const result = await query
        .order(filter.sortBy ?? 'tag_no', { ascending: filter.ascending ?? true })
        .range(from, to);
      return checked(result.data as Chain[] | null, result.error) ?? [];
    },
    async countChains(filter) {
      let query = db().from('hse_chains').select('id', { count: 'exact', head: true });
      if (filter.chainId) {
        assertUUID(filter.chainId);
        query = query.eq('id', filter.chainId);
      }
      if (filter.status) query = query.eq('status', filter.status);
      if (filter.replacedOnly) query = query.not('replaces_chain_id', 'is', null);
      if (filter.tagNo?.trim()) query = query.ilike('tag_no', tagPattern(filter.tagNo));
      if (filter.legs) query = query.eq('number_of_legs', filter.legs);
      if (filter.scrappedFrom) {
        assertDate(filter.scrappedFrom);
        query = query.gte('scrapping_date', filter.scrappedFrom);
      }
      if (filter.scrappedTo) {
        assertDate(filter.scrappedTo);
        query = query.lte('scrapping_date', filter.scrappedTo);
      }
      const result = await query;
      checked(result.data, result.error);
      return exactCount(result.count);
    },
    async countInspectionsByChain(ids) {
      await member();
      ids.forEach(assertUUID);
      if (!ids.length) return {};
      if (ids.length > 100) throw new HSEError('INVALID_INPUT');
      const head = await db()
        .from('hse_chain_inspections')
        .select('chain_id', { count: 'exact', head: true })
        .in('chain_id', ids);
      checked(head.data, head.error);
      const total = exactCount(head.count);
      if (total > 5_000) return null;
      const counts = Object.fromEntries(ids.map((id) => [id, 0]));
      for (let offset = 0; offset < total; offset += 1000) {
        const page = await db()
          .from('hse_chain_inspections')
          .select('chain_id')
          .in('chain_id', ids)
          .order('chain_id')
          .order('id')
          .range(offset, Math.min(offset + 999, total - 1));
        const rows = checked(page.data as Array<{ chain_id: string }> | null, page.error) ?? [];
        rows.forEach((row) => {
          counts[row.chain_id] = (counts[row.chain_id] ?? 0) + 1;
        });
        if (!rows.length) return null;
      }
      if (Object.values(counts).reduce((sum, value) => sum + value, 0) !== total) return null;
      return counts;
    },
    async listChainReplacements(predecessorIds) {
      predecessorIds.forEach(assertUUID);
      if (!predecessorIds.length) return [];
      const result = await db()
        .from('hse_chains')
        .select('*')
        .in('replaces_chain_id', predecessorIds);
      return checked(result.data as Chain[] | null, result.error) ?? [];
    },
    async getChain(id) {
      assertUUID(id);
      const result = await db().from('hse_chains').select('*').eq('id', id).maybeSingle();
      return checked(result.data as Chain | null, result.error);
    },
    async createChain(input) {
      validateChainCreate(input);
      await member(true);
      if (input.replaces_chain_id) {
        const previous = required(await repo.getChain(input.replaces_chain_id));
        if (
          previous.status !== 'scrapped' ||
          previous.tag_no.toLowerCase() !== input.tag_no.toLowerCase()
        )
          throw new HSEError('INVALID_LINEAGE');
      }
      const result = await db()
        .from('hse_chains')
        .insert({ ...input, replaces_chain_id: input.replaces_chain_id ?? null })
        .select('*')
        .single();
      return one(result.data as Chain | null, result.error);
    },
    async updateChain(id, input) {
      assertUUID(id);
      validateChainFields(input);
      await member(true);
      const previous = required(await repo.getChain(id));
      if (previous.status !== 'active') throw new HSEError('IMMUTABLE_RECORD');
      const result = await db()
        .from('hse_chains')
        .update(input)
        .eq('id', id)
        .eq('status', 'active')
        .select('*')
        .single();
      return one(result.data as Chain | null, result.error);
    },
    async scrapChain(input) {
      await member(true);
      const chain = required(await repo.getChain(input.chainId));
      if (chain.status !== 'active') throw new HSEError('IMMUTABLE_RECORD');
      validateScrap(input, chain.start_working_date);
      const replacement = input.replacement;
      const result = await db().rpc('hse_scrap_chain', {
        p_chain_id: input.chainId,
        p_scrapping_date: input.scrappingDate,
        p_scrapping_reason: input.reason ?? null,
        p_create_replacement: Boolean(replacement),
        p_number_of_legs: replacement?.number_of_legs ?? null,
        p_working_load_limit_tons: replacement?.working_load_limit_tons ?? null,
        p_length_m: replacement?.length_m ?? null,
        p_start_working_date: replacement?.start_working_date ?? null,
      });
      return checked(result.data as string | null, result.error);
    },
    async getChainLineage(id) {
      const chain = required(await repo.getChain(id));
      const seen = new Set([id]);
      const ancestors: Chain[] = [],
        successors: Chain[] = [];
      let current = chain;
      while (current.replaces_chain_id) {
        if (seen.has(current.replaces_chain_id)) throw new HSEError('INVALID_LINEAGE');
        seen.add(current.replaces_chain_id);
        current = required(await repo.getChain(current.replaces_chain_id));
        ancestors.unshift(current);
      }
      current = chain;
      for (;;) {
        const result = await db()
          .from('hse_chains')
          .select('*')
          .eq('replaces_chain_id', current.id)
          .maybeSingle();
        const next = checked(result.data as Chain | null, result.error);
        if (!next) break;
        if (seen.has(next.id)) throw new HSEError('INVALID_LINEAGE');
        seen.add(next.id);
        successors.push(next);
        current = next;
      }
      return { ancestors, chain, successors };
    },
    async listChecklistVersions() {
      const result = await db()
        .from('hse_chain_checklist_versions')
        .select('*')
        .order('version', { ascending: false });
      return checked(result.data as ChecklistVersion[] | null, result.error) ?? [];
    },
    async getChecklist(number) {
      const selected = await version(number);
      if (!selected) return null;
      const [sectionsResult, itemsResult] = await Promise.all([
        db()
          .from('hse_chain_checklist_sections')
          .select('*')
          .eq('template_version', number)
          .order('sort_order'),
        db()
          .from('hse_chain_checklist_items')
          .select('*')
          .eq('template_version', number)
          .order('sort_order'),
      ]);
      const sections =
        checked(sectionsResult.data as ChecklistSection[] | null, sectionsResult.error) ?? [];
      const items = checked(itemsResult.data as ChecklistItem[] | null, itemsResult.error) ?? [];
      return {
        version: selected,
        sections: sections.map((section) => ({
          ...section,
          items: items.filter((item) => item.section_id === section.id),
        })),
      } satisfies Checklist;
    },
    async getCurrentChecklist(state) {
      const result = await db()
        .from('hse_chain_checklist_versions')
        .select('version')
        .eq('state', state)
        .maybeSingle();
      const current = checked(result.data as { version: number } | null, result.error);
      return current ? repo.getChecklist(current.version) : null;
    },
    async createChecklistSection(input) {
      validateSectionCreate(input);
      await draft(input.template_version);
      const result = await db()
        .from('hse_chain_checklist_sections')
        .insert(input)
        .select('*')
        .single();
      return one(result.data as ChecklistSection | null, result.error);
    },
    async updateChecklistSection(id, input) {
      assertUUID(id);
      validateSectionUpdate(input);
      const current = await db()
        .from('hse_chain_checklist_sections')
        .select('template_version')
        .eq('id', id)
        .maybeSingle();
      const row = required(
        checked(current.data as { template_version: number } | null, current.error),
      );
      await draft(row.template_version);
      const result = await db()
        .from('hse_chain_checklist_sections')
        .update(input)
        .eq('id', id)
        .select('*')
        .single();
      return one(result.data as ChecklistSection | null, result.error);
    },
    async deleteChecklistSection(id) {
      assertUUID(id);
      const current = await db()
        .from('hse_chain_checklist_sections')
        .select('template_version')
        .eq('id', id)
        .maybeSingle();
      const row = required(
        checked(current.data as { template_version: number } | null, current.error),
      );
      await draft(row.template_version);
      const result = await db()
        .from('hse_chain_checklist_sections')
        .delete()
        .eq('id', id)
        .select('id')
        .single();
      checked(result.data, result.error);
    },
    async createChecklistItem(input) {
      validateItemCreate(input);
      await draft(input.template_version);
      const section = await db()
        .from('hse_chain_checklist_sections')
        .select('template_version')
        .eq('id', input.section_id)
        .maybeSingle();
      if (
        required(checked(section.data as { template_version: number } | null, section.error))
          .template_version !== input.template_version
      )
        throw new HSEError('INVALID_INPUT');
      const result = await db()
        .from('hse_chain_checklist_items')
        .insert(input)
        .select('*')
        .single();
      return one(result.data as ChecklistItem | null, result.error);
    },
    async updateChecklistItem(id, input) {
      assertUUID(id);
      validateItemUpdate(input);
      const current = await db()
        .from('hse_chain_checklist_items')
        .select('template_version')
        .eq('id', id)
        .maybeSingle();
      const row = required(
        checked(current.data as { template_version: number } | null, current.error),
      );
      await draft(row.template_version);
      const result = await db()
        .from('hse_chain_checklist_items')
        .update(input)
        .eq('id', id)
        .select('*')
        .single();
      return one(result.data as ChecklistItem | null, result.error);
    },
    async deleteChecklistItem(id) {
      assertUUID(id);
      const current = await db()
        .from('hse_chain_checklist_items')
        .select('template_version')
        .eq('id', id)
        .maybeSingle();
      const row = required(
        checked(current.data as { template_version: number } | null, current.error),
      );
      await draft(row.template_version);
      const result = await db()
        .from('hse_chain_checklist_items')
        .delete()
        .eq('id', id)
        .select('id')
        .single();
      checked(result.data, result.error);
    },
    async listInspections(filter = {}) {
      const [from, to] = pageRange(filter.offset, filter.limit);
      let query = db()
        .from('hse_chain_inspections')
        .select(
          'id,chain_id,chain_tag_snapshot,inspection_date,inspector_id,template_version,status,submitted_at,approved_by,approved_at',
        );
      if (filter.chainId) {
        assertUUID(filter.chainId);
        query = query.eq('chain_id', filter.chainId);
      }
      if (filter.inspectorId) {
        assertUUID(filter.inspectorId);
        query = query.eq('inspector_id', filter.inspectorId);
      }
      if (filter.status) query = query.eq('status', filter.status);
      if (filter.search?.trim()) {
        const search = filter.search.trim();
        query = isUUID(search)
          ? query.or(`id.eq.${search},chain_id.eq.${search}`)
          : query.ilike('chain_tag_snapshot', tagPattern(search));
      }
      if (filter.dateFrom) {
        assertDate(filter.dateFrom);
        query = query.gte('inspection_date', filter.dateFrom);
      }
      if (filter.dateTo) {
        assertDate(filter.dateTo);
        query = query.lte('inspection_date', filter.dateTo);
      }
      const result = await query
        .order(filter.sortBy ?? 'inspection_date', { ascending: filter.ascending ?? false })
        .order('id', { ascending: true })
        .range(from, to);
      return checked(result.data as InspectionListItem[] | null, result.error) ?? [];
    },
    async countInspections(filter = {}) {
      let query = db().from('hse_chain_inspections').select('id', { count: 'exact', head: true });
      if (filter.chainId) {
        assertUUID(filter.chainId);
        query = query.eq('chain_id', filter.chainId);
      }
      if (filter.inspectorId) {
        assertUUID(filter.inspectorId);
        query = query.eq('inspector_id', filter.inspectorId);
      }
      if (filter.status) query = query.eq('status', filter.status);
      if (filter.search?.trim()) {
        const search = filter.search.trim();
        query = isUUID(search)
          ? query.or(`id.eq.${search},chain_id.eq.${search}`)
          : query.ilike('chain_tag_snapshot', tagPattern(search));
      }
      if (filter.dateFrom) {
        assertDate(filter.dateFrom);
        query = query.gte('inspection_date', filter.dateFrom);
      }
      if (filter.dateTo) {
        assertDate(filter.dateTo);
        query = query.lte('inspection_date', filter.dateTo);
      }
      const result = await query;
      checked(result.data, result.error);
      return exactCount(result.count);
    },
    async getInspectionReportingData(period: HSEPeriod): Promise<InspectionReportingData> {
      await member();
      if (period.from) assertDate(period.from);
      if (period.to) assertDate(period.to);
      if (period.from && period.to && period.from > period.to) throw new HSEError('INVALID_INPUT');
      const filter = { dateFrom: period.from, dateTo: period.to };
      const total = await repo.countInspections(filter);
      const inspectionLimit = 500;
      if (total > inspectionLimit)
        return {
          total,
          inspectionLimit,
          inspections: null,
          results: null,
          checklistItemCounts: null,
        };
      const inspections: InspectionListItem[] = [];
      for (let offset = 0; offset < total; offset += 100) {
        const page = await repo.listInspections({
          ...filter,
          sortBy: 'created_at',
          ascending: true,
          offset,
          limit: 100,
        });
        inspections.push(...page);
      }
      if (inspections.length !== total || new Set(inspections.map((row) => row.id)).size !== total)
        return {
          total,
          inspectionLimit,
          inspections: null,
          results: null,
          checklistItemCounts: null,
        };
      if (total === 0)
        return { total, inspectionLimit, inspections, results: [], checklistItemCounts: {} };

      const resultLimit = 20_000;
      const results: InspectionResultRow[] = [];
      for (let offset = 0; offset < inspections.length; offset += 40) {
        const ids = inspections.slice(offset, offset + 40).map((row) => row.id);
        const head = await db()
          .from('hse_chain_inspection_results')
          .select('inspection_id', { count: 'exact', head: true })
          .in('inspection_id', ids);
        checked(head.data, head.error);
        const expected = exactCount(head.count);
        if (results.length + expected > resultLimit)
          return { total, inspectionLimit, inspections, results: null, checklistItemCounts: null };
        let loaded = 0;
        while (loaded < expected) {
          const page = await db()
            .from('hse_chain_inspection_results')
            .select('inspection_id,item_id,result')
            .in('inspection_id', ids)
            .order('inspection_id')
            .order('item_id')
            .range(loaded, Math.min(loaded + 999, expected - 1));
          results.push(...(checked(page.data as InspectionResultRow[] | null, page.error) ?? []));
          loaded += page.data?.length ?? 0;
          if (!page.data?.length) break;
        }
        if (loaded !== expected)
          return { total, inspectionLimit, inspections, results: null, checklistItemCounts: null };
      }

      const versions = [...new Set(inspections.map((row) => row.template_version))];
      const checklistItemCounts: Record<number, number> = {};
      let itemTotal = 0;
      for (let offset = 0; offset < versions.length; offset += 40) {
        const batch = versions.slice(offset, offset + 40);
        const head = await db()
          .from('hse_chain_checklist_items')
          .select('template_version', { count: 'exact', head: true })
          .in('template_version', batch);
        checked(head.data, head.error);
        const expected = exactCount(head.count);
        itemTotal += expected;
        if (itemTotal > resultLimit)
          return { total, inspectionLimit, inspections, results, checklistItemCounts: null };
        let loaded = 0;
        while (loaded < expected) {
          const page = await db()
            .from('hse_chain_checklist_items')
            .select('template_version')
            .in('template_version', batch)
            .order('template_version')
            .order('id')
            .range(loaded, Math.min(loaded + 999, expected - 1));
          const rows =
            checked(page.data as Array<{ template_version: number }> | null, page.error) ?? [];
          rows.forEach((row) => {
            checklistItemCounts[row.template_version] =
              (checklistItemCounts[row.template_version] ?? 0) + 1;
          });
          loaded += rows.length;
          if (!rows.length) break;
        }
        if (loaded !== expected)
          return { total, inspectionLimit, inspections, results, checklistItemCounts: null };
      }
      return { total, inspectionLimit, inspections, results, checklistItemCounts };
    },
    async getInspection(id) {
      const record = await inspection(id).catch((error) => {
        if (error instanceof HSEError && error.code === 'NOT_FOUND') return null;
        throw error;
      });
      if (!record) return null;
      const [checklist, results, comments, signatures] = await Promise.all([
        repo.getChecklist(record.template_version),
        db().from('hse_chain_inspection_results').select('*').eq('inspection_id', id),
        db().from('hse_chain_inspection_comments').select('*').eq('inspection_id', id),
        repo.listSignatures(id),
      ]);
      return {
        inspection: record,
        checklist: required(checklist),
        results: checked(results.data as CheckpointResult[] | null, results.error) ?? [],
        comments: checked(comments.data as SectionComment[] | null, comments.error) ?? [],
        signatures,
      };
    },
    async createInspection(input) {
      await member();
      assertUUID(input.chain_id);
      assertPositiveInteger(input.template_version);
      assertDate(input.inspection_date);
      const chain = required(await repo.getChain(input.chain_id));
      if (chain.status !== 'active') throw new HSEError('INVALID_STATE');
      const checklist = required(await version(input.template_version));
      if (checklist.state !== 'published') throw new HSEError('INVALID_STATE');
      const result = await db().from('hse_chain_inspections').insert(input).select('*').single();
      return one(result.data as ChainInspection | null, result.error);
    },
    async updateInspectionDraft(id, input) {
      await ownDraft(id);
      assertDate(input.inspection_date);
      const result = await db()
        .from('hse_chain_inspections')
        .update(input)
        .eq('id', id)
        .eq('status', 'draft')
        .select('*')
        .single();
      return one(result.data as ChainInspection | null, result.error);
    },
    async saveInspectionResult(input) {
      const record = await ownDraft(input.inspectionId);
      assertUUID(input.itemId);
      assertInspectionResult(input.result);
      const item = await db()
        .from('hse_chain_checklist_items')
        .select('template_version')
        .eq('id', input.itemId)
        .maybeSingle();
      if (
        required(checked(item.data as { template_version: number } | null, item.error))
          .template_version !== record.template_version
      )
        throw new HSEError('INVALID_INPUT');
      const result = await db()
        .from('hse_chain_inspection_results')
        .upsert(
          { inspection_id: input.inspectionId, item_id: input.itemId, result: input.result },
          { onConflict: 'inspection_id,item_id' },
        )
        .select('*')
        .single();
      return one(result.data as CheckpointResult | null, result.error);
    },
    async saveInspectionComment(input) {
      const record = await ownDraft(input.inspectionId);
      assertUUID(input.sectionId);
      const section = await db()
        .from('hse_chain_checklist_sections')
        .select('template_version')
        .eq('id', input.sectionId)
        .maybeSingle();
      if (
        required(checked(section.data as { template_version: number } | null, section.error))
          .template_version !== record.template_version
      )
        throw new HSEError('INVALID_INPUT');
      const result = await db()
        .from('hse_chain_inspection_comments')
        .upsert(
          {
            inspection_id: input.inspectionId,
            section_id: input.sectionId,
            comments_corrective_actions: input.comments,
          },
          { onConflict: 'inspection_id,section_id' },
        )
        .select('*')
        .single();
      return one(result.data as SectionComment | null, result.error);
    },
    async submitInspection(id) {
      const userId = await member();
      const record = await inspection(id);
      if (record.inspector_id !== userId) throw new HSEError('FORBIDDEN');
      if (record.status !== 'draft') throw new HSEError('INVALID_STATE');
      const signatures = await repo.listSignatures(id);
      if (
        !signatures.some(
          (signature) => signature.signer_role === 'inspector' && signature.signed_by === userId,
        )
      )
        throw new HSEError('MISSING_SIGNATURE');
      const result = await db().rpc('hse_submit_chain_inspection', { p_inspection_id: id });
      return one(result.data as ChainInspection | null, result.error);
    },
    async listSignatures(inspectionId) {
      assertUUID(inspectionId);
      const result = await db()
        .from('hse_inspection_signatures')
        .select('*')
        .eq('inspection_id', inspectionId);
      return checked(result.data as InspectionSignature[] | null, result.error) ?? [];
    },
    async signAsInspector(inspectionId) {
      const record = await ownDraft(inspectionId);
      const result = await db()
        .from('hse_inspection_signatures')
        .insert({
          inspection_id: inspectionId,
          signer_role: 'inspector',
          signed_by: record.inspector_id,
        })
        .select('*')
        .single();
      return one(result.data as InspectionSignature | null, result.error);
    },
    async signAsEngineer(inspectionId) {
      const userId = await member(true);
      const record = await inspection(inspectionId);
      if (record.status !== 'pending_approval') throw new HSEError('INVALID_STATE');
      const signatures = await repo.listSignatures(inspectionId);
      if (
        !signatures.some(
          (signature) =>
            signature.signer_role === 'inspector' && signature.signed_by === record.inspector_id,
        )
      )
        throw new HSEError('MISSING_SIGNATURE');
      if (signatures.some((signature) => signature.signer_role === 'hse_engineer'))
        throw new HSEError('DUPLICATE_RECORD');
      const result = await db()
        .from('hse_inspection_signatures')
        .insert({ inspection_id: inspectionId, signer_role: 'hse_engineer', signed_by: userId })
        .select('*')
        .single();
      return one(result.data as InspectionSignature | null, result.error);
    },
    async approveInspection(id) {
      const userId = await member(true);
      const record = await inspection(id);
      if (record.status !== 'pending_approval') throw new HSEError('INVALID_STATE');
      const signatures = await repo.listSignatures(id);
      if (
        !signatures.some(
          (signature) => signature.signer_role === 'hse_engineer' && signature.signed_by === userId,
        )
      )
        throw new HSEError('MISSING_SIGNATURE');
      const result = await db().rpc('hse_approve_chain_inspection', { p_inspection_id: id });
      return one(result.data as ChainInspection | null, result.error);
    },
  };
  return repo;
}
