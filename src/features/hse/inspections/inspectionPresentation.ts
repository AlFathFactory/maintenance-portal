import type { TFunction } from 'i18next';
import type { InspectionStatus } from '../../../domain/hse';
import { HSEError } from '../../../services/hse/errors';

export const inspectionPageSize = 20;
export const inspectorAttestation =
  'Inspector attests that the recorded checklist responses are accurate to their knowledge.';

export function inspectionPath(id: string): string {
  return `/hse/inspections/${id}`;
}
export function inspectionEditPath(id: string): string {
  return `/hse/inspections/${id}/edit`;
}
export function inspectionNewPath(chainId?: string): string {
  return chainId
    ? `/hse/inspections/new?chainId=${encodeURIComponent(chainId)}`
    : '/hse/inspections/new';
}
export function inspectionStatus(status: InspectionStatus, t: TFunction): string {
  return t(`inspectionUI.${status}`);
}
export function inspectionError(cause: unknown, t: TFunction): string {
  if (cause instanceof HSEError) {
    if (cause.code === 'FORBIDDEN') return t('errors.forbidden');
    if (cause.code === 'UNAUTHORIZED') return t('auth.invalid');
    if (cause.code === 'NETWORK_ERROR') return t('errors.network');
    if (cause.code === 'SUPABASE_UNAVAILABLE') return t('errors.supabaseUnavailable');
    if (cause.code === 'INCOMPLETE_INSPECTION') return t('inspectionUI.completeToSign');
    if (cause.code === 'MISSING_SIGNATURE') return t('inspectionUI.submitFailed');
    if (cause.code === 'INVALID_INPUT' || cause.code === 'INVALID_STATE')
      return t('inspectionUI.failed');
  }
  return t('inspectionUI.failed');
}
