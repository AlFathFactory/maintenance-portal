import type { ChainListFilter, InspectionListFilter, HSEPeriod } from '../../domain/hse';
import type { HSERole } from '../auth/hseMembership';

export const hseKeys = {
  all: ['hse'] as const,
  chains: ['hse', 'chains'] as const,
  chainList: (filter: ChainListFilter) => ['hse', 'chains', 'list', filter] as const,
  chainCount: (filter: Partial<ChainListFilter>) => ['hse', 'chains', 'count', filter] as const,
  chainReplacements: (ids: string[]) => ['hse', 'chains', 'replacements', ids] as const,
  chainInspectionCountsAll: ['hse', 'chains', 'inspection-counts'] as const,
  chainInspectionCounts: (ids: string[]) => ['hse', 'chains', 'inspection-counts', ids] as const,
  chain: (id: string) => ['hse', 'chains', 'detail', id] as const,
  lineage: (id: string) => ['hse', 'chains', 'lineage', id] as const,
  checklist: ['hse', 'checklist'] as const,
  checklistVersions: ['hse', 'checklist', 'versions'] as const,
  checklistVersion: (version: number) => ['hse', 'checklist', version] as const,
  currentChecklist: (state: 'draft' | 'published') =>
    ['hse', 'checklist', 'current', state] as const,
  inspections: ['hse', 'inspections'] as const,
  inspectionList: (filter: InspectionListFilter) => ['hse', 'inspections', 'list', filter] as const,
  inspectionCount: (filter: InspectionListFilter) =>
    ['hse', 'inspections', 'count', filter] as const,
  inspection: (id: string) => ['hse', 'inspections', 'detail', id] as const,
  signatures: (id: string) => ['hse', 'inspections', 'signatures', id] as const,
  reporting: (period: HSEPeriod) => ['hse', 'inspections', 'reporting', period] as const,
};

export function canLoadHSE(userId: string | null, role: HSERole | null, loading: boolean): boolean {
  return Boolean(userId && role && !loading);
}
