import type { TFunction } from 'i18next';
import type { Chain, ChainLegCount } from '../../../domain/hse';
import { HSEError } from '../../../services/hse/errors';

export const pageSize = 20;
export const legOptions: ChainLegCount[] = [1, 2, 3, 4];

export function chainPath(id: string): string {
  return `/hse/chains/${id}`;
}

export function replacementPath(id: string): string {
  return `/hse/chains/new?replaces=${id}`;
}

export function chainStatus(chain: Chain, t: TFunction): string {
  return t(chain.status === 'active' ? 'chainUI.active' : 'chainUI.scrapped');
}

export function chainError(error: unknown, t: TFunction): string {
  if (error instanceof HSEError) {
    if (error.code === 'DUPLICATE_TAG') return t('chainUI.duplicate');
    if (error.code === 'INVALID_LINEAGE' || error.code === 'DUPLICATE_RECORD')
      return t('chainUI.invalidLineage');
    if (error.code === 'SUPABASE_UNAVAILABLE') return t('chainUI.unavailable');
    if (error.code === 'INVALID_INPUT') return t('chainUI.required');
    if (error.code === 'FORBIDDEN') return t('errors.forbidden');
    if (error.code === 'NETWORK_ERROR') return t('errors.network');
  }
  return t('chainUI.failed');
}
