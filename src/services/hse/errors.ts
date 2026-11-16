export type HSEErrorCode =
  | 'SUPABASE_UNAVAILABLE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'DUPLICATE_TAG'
  | 'DUPLICATE_RECORD'
  | 'INVALID_INPUT'
  | 'INVALID_LINEAGE'
  | 'INVALID_STATE'
  | 'IMMUTABLE_RECORD'
  | 'INCOMPLETE_INSPECTION'
  | 'MISSING_SIGNATURE'
  | 'UNSUPPORTED_OPERATION'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

const messages: Record<HSEErrorCode, string> = {
  SUPABASE_UNAVAILABLE: 'HSE data requires a Supabase connection.',
  UNAUTHORIZED: 'Sign in to access HSE data.',
  FORBIDDEN: 'This account cannot perform this HSE action.',
  NOT_FOUND: 'The requested HSE record was not found.',
  DUPLICATE_TAG: 'An active chain already uses this tag.',
  DUPLICATE_RECORD: 'This record already exists.',
  INVALID_INPUT: 'Check the HSE form values and try again.',
  INVALID_LINEAGE: 'The replacement chain must reference a scrapped chain with the same tag.',
  INVALID_STATE: 'This HSE action is unavailable in the current state.',
  IMMUTABLE_RECORD: 'This HSE record can no longer be edited.',
  INCOMPLETE_INSPECTION: 'Complete every checklist result before signing or submitting.',
  MISSING_SIGNATURE: 'The required attestation must be signed first.',
  UNSUPPORTED_OPERATION: 'This operation is not available from the application yet.',
  NETWORK_ERROR: 'Could not reach the HSE data service. Try again.',
  UNKNOWN_ERROR: 'The HSE action failed. Try again.',
};

export class HSEError extends Error {
  constructor(
    public readonly code: HSEErrorCode,
    options?: { cause?: unknown },
  ) {
    super(messages[code], options);
    this.name = 'HSEError';
  }
}

export function hseError(cause: unknown): HSEError {
  if (cause instanceof HSEError) return cause;
  const value = cause && typeof cause === 'object' ? cause : null;
  const code = value && 'code' in value ? String(value.code) : '';
  const message = value && 'message' in value ? String(value.message) : String(cause);
  if (code === '42501' || /permission denied|row.level security/i.test(message))
    return new HSEError('FORBIDDEN', { cause });
  if (code === 'PGRST116') return new HSEError('NOT_FOUND', { cause });
  if (code === '23505')
    return new HSEError(
      /tag|hse_chains_active_tag/i.test(message) ? 'DUPLICATE_TAG' : 'DUPLICATE_RECORD',
      { cause },
    );
  if (/replacement|retired tag|archived predecessor/i.test(message))
    return new HSEError('INVALID_LINEAGE', { cause });
  if (/immutable|cannot be edited|cannot be changed|cannot be removed|signed draft/i.test(message))
    return new HSEError('IMMUTABLE_RECORD', { cause });
  if (/all published checklist|fully completed checklist/i.test(message))
    return new HSEError('INCOMPLETE_INSPECTION', { cause });
  if (/must explicitly sign|attestation is required|signatures are mandatory/i.test(message))
    return new HSEError('MISSING_SIGNATURE', { cause });
  if (code === '23503' || code === '23514' || code === '22P02')
    return new HSEError('INVALID_INPUT', { cause });
  if (/fetch|network|ECONN|timeout/i.test(message)) return new HSEError('NETWORK_ERROR', { cause });
  if (/draft|pending|approved|active chain|published checklist/i.test(message))
    return new HSEError('INVALID_STATE', { cause });
  return new HSEError('UNKNOWN_ERROR', { cause });
}
