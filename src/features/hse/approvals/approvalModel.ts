import type { InspectionDetails } from '../../../domain/hse';
import { inspectionProgress, savedAnswers } from '../inspections/inspectionModel';

export const engineerAttestation =
  'HSE engineer confirms review and administrative approval of this inspection record; approval is not an equipment pass decision.';

export function approvalReadiness(
  details: InspectionDetails,
  userId: string | null,
  isEngineer: boolean,
) {
  const record = details.inspection;
  const inspectorSignature = details.signatures.find(
    (signature) =>
      signature.signer_role === 'inspector' && signature.signed_by === record.inspector_id,
  );
  const engineerSignature = details.signatures.find(
    (signature) => signature.signer_role === 'hse_engineer',
  );
  const progress = inspectionProgress(details.checklist, savedAnswers(details));
  const pending = record.status === 'pending_approval';
  const complete = progress.total > 0 && progress.unanswered === 0;
  return {
    pending,
    complete,
    inspectorSignature,
    engineerSignature,
    canSign: Boolean(
      isEngineer && userId && pending && complete && inspectorSignature && !engineerSignature,
    ),
    canApprove: Boolean(
      isEngineer &&
      userId &&
      pending &&
      complete &&
      inspectorSignature &&
      engineerSignature?.signed_by === userId,
    ),
  };
}

export function signRecovery(
  details: InspectionDetails,
  userId: string | null,
): 'signed' | 'other_signer' | 'state_changed' | 'retry' {
  if (details.inspection.status !== 'pending_approval') return 'state_changed';
  const signer = details.signatures.find((signature) => signature.signer_role === 'hse_engineer');
  if (signer) return signer.signed_by === userId ? 'signed' : 'other_signer';
  return 'retry';
}

export function approvalRecovery(
  details: InspectionDetails,
  userId: string | null,
  isEngineer: boolean,
): 'approved' | 'retry' | 'state_changed' {
  if (details.inspection.status === 'approved') return 'approved';
  return approvalReadiness(details, userId, isEngineer).canApprove ? 'retry' : 'state_changed';
}
