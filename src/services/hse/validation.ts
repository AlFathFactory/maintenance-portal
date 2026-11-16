import type {
  ChainCreateInput,
  ChainUpdateInput,
  ScrapChainInput,
  ChecklistSectionCreateInput,
  ChecklistSectionUpdateInput,
  ChecklistItemCreateInput,
  ChecklistItemUpdateInput,
  InspectionResultValue,
} from '../../domain/hse';
import { HSEError } from './errors';

export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function assertUUID(value: string): void {
  if (!isUUID(value)) throw new HSEError('INVALID_INPUT');
}

export function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new HSEError('INVALID_INPUT');
  }
  const parsed = new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10);
  if (parsed !== value) throw new HSEError('INVALID_INPUT');
}

export function assertPositiveInteger(value: number): void {
  if (!Number.isInteger(value) || value < 1) throw new HSEError('INVALID_INPUT');
}

function assertNonempty(value: string, maxLength?: number): void {
  if (!value.trim() || value !== value.trim() || (maxLength && value.length > maxLength)) {
    throw new HSEError('INVALID_INPUT');
  }
}

export function validateChainFields(input: ChainUpdateInput): void {
  if (![1, 2, 3, 4].includes(input.number_of_legs)) throw new HSEError('INVALID_INPUT');
  if (!Number.isFinite(input.working_load_limit_tons) || input.working_load_limit_tons <= 0)
    throw new HSEError('INVALID_INPUT');
  if (!Number.isFinite(input.length_m) || input.length_m <= 0) throw new HSEError('INVALID_INPUT');
  assertDate(input.start_working_date);
}

export function validateChainCreate(input: ChainCreateInput): void {
  assertNonempty(input.tag_no, 100);
  validateChainFields(input);
  if (input.replaces_chain_id) assertUUID(input.replaces_chain_id);
}

export function validateScrap(input: ScrapChainInput, startWorkingDate: string): void {
  assertUUID(input.chainId);
  assertDate(input.scrappingDate);
  if (input.scrappingDate < startWorkingDate) throw new HSEError('INVALID_INPUT');
  if (input.reason && input.reason !== input.reason.trim()) throw new HSEError('INVALID_INPUT');
  if (input.replacement) validateChainFields(input.replacement);
}

export function validateSectionCreate(input: ChecklistSectionCreateInput): void {
  assertPositiveInteger(input.template_version);
  assertPositiveInteger(input.sort_order);
  assertNonempty(input.section_key);
  assertNonempty(input.name_en);
  assertNonempty(input.name_ar);
}

export function validateSectionUpdate(input: ChecklistSectionUpdateInput): void {
  if (!Object.keys(input).length) throw new HSEError('INVALID_INPUT');
  if (input.sort_order !== undefined) assertPositiveInteger(input.sort_order);
  for (const value of [input.section_key, input.name_en, input.name_ar]) {
    if (value !== undefined) assertNonempty(value);
  }
}

export function validateItemCreate(input: ChecklistItemCreateInput): void {
  assertPositiveInteger(input.template_version);
  assertUUID(input.section_id);
  assertPositiveInteger(input.sort_order);
  assertNonempty(input.check_text_en);
}

export function validateItemUpdate(input: ChecklistItemUpdateInput): void {
  if (!Object.keys(input).length) throw new HSEError('INVALID_INPUT');
  if (input.sort_order !== undefined) assertPositiveInteger(input.sort_order);
  if (input.check_text_en !== undefined) assertNonempty(input.check_text_en);
}

export function assertInspectionResult(value: string): asserts value is InspectionResultValue {
  if (value !== 'OK' && value !== 'Faulty' && value !== 'N/A') throw new HSEError('INVALID_INPUT');
}

export function pageRange(offset = 0, limit = 50): [number, number] {
  if (
    !Number.isInteger(offset) ||
    offset < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new HSEError('INVALID_INPUT');
  return [offset, offset + limit - 1];
}
