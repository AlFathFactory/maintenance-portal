import type { TFunction } from 'i18next';
import type {
  ChecklistSection,
  ChecklistVersion,
  ChecklistVersionState,
} from '../../../domain/hse';
import type { HSERole } from '../../auth/hseMembership';
import { HSEError } from '../../../services/hse/errors';

export function selectedVersion(
  versions: ChecklistVersion[],
  requested: string | null,
): number | null {
  if (requested !== null) {
    const number = Number(requested);
    return Number.isInteger(number) && number > 0 ? number : null;
  }
  return (
    versions.find((version) => version.state === 'published')?.version ??
    versions[0]?.version ??
    null
  );
}

export function canEditChecklist(role: HSERole | null, state: ChecklistVersionState): boolean {
  return role === 'hse_engineer' && state === 'draft';
}

export function nextSortOrder(orders: number[]): number {
  return orders.reduce((highest, order) => Math.max(highest, order), 0) + 1;
}

export function assertUniqueSectionKey(
  sections: ChecklistSection[],
  key: string,
  currentId?: string,
): void {
  if (sections.some((section) => section.id !== currentId && section.section_key === key))
    throw new HSEError('DUPLICATE_RECORD', { cause: 'SECTION_KEY' });
}

export function checklistError(cause: unknown, t: TFunction): string {
  if (cause instanceof HSEError) {
    if (cause.code === 'INVALID_INPUT') return t('checklistUI.invalid');
    if (cause.code === 'DUPLICATE_RECORD') return t('checklistUI.duplicateOrder');
    if (cause.code === 'IMMUTABLE_RECORD' || cause.code === 'FORBIDDEN')
      return t('errors.forbidden');
    if (cause.code === 'NETWORK_ERROR') return t('errors.network');
    if (cause.code === 'SUPABASE_UNAVAILABLE') return t('errors.supabaseUnavailable');
  }
  return t('checklistUI.failed');
}
