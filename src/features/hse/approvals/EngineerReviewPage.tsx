import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { InspectionDetails } from '../../../domain/hse';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { useToast } from '../../../shared/ui/ToastProvider';
import { useAuth } from '../../auth/AuthProvider';
import { ChecklistDialog } from '../checklist/ChecklistDialog';
import { InspectionRecord } from '../inspections/InspectionRecord';
import { inspectionError, inspectionPath } from '../inspections/inspectionPresentation';
import { useHSEInspection, useHSEInspectionActions } from '../queries';
import {
  approvalReadiness,
  approvalRecovery,
  engineerAttestation,
  signRecovery,
} from './approvalModel';
import './approvals.css';

export function EngineerReviewPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { user, isHSEEngineer } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const query = useHSEInspection(id);
  const actions = useHSEInspectionActions();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'sign' | 'approve' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const details = query.data;
  const readiness = details ? approvalReadiness(details, user?.id ?? null, isHSEEngineer) : null;
  const mayAct = !busy && !uncertain && !query.isFetching && !query.isError;

  async function refresh(): Promise<InspectionDetails | null> {
    const result = await query.refetch();
    if (result.isError || !result.data) {
      setUncertain(true);
      return null;
    }
    setUncertain(false);
    return result.data;
  }

  async function sign() {
    if (busyRef.current || !confirmed || !mayAct || !readiness?.canSign) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const current = await refresh();
      if (!current) {
        setError(t('approvalUI.refreshRequired'));
        return;
      }
      if (!approvalReadiness(current, user?.id ?? null, isHSEEngineer).canSign) {
        setMessage(t('approvalUI.stateChanged'));
        setDialog(null);
        return;
      }
      await actions.signAsEngineer.mutateAsync(id);
      const updated = await refresh();
      setDialog(null);
      setConfirmed(false);
      if (
        updated?.signatures.some(
          (signature) =>
            signature.signer_role === 'hse_engineer' && signature.signed_by === user?.id,
        )
      ) {
        setMessage(t('approvalUI.signed'));
        toast.show(t('approvalUI.signed'));
      } else setError(t('approvalUI.refreshRequired'));
    } catch (cause) {
      const updated = await refresh();
      setDialog(null);
      setConfirmed(false);
      if (!updated) setError(t('approvalUI.refreshRequired'));
      else {
        const outcome = signRecovery(updated, user?.id ?? null);
        if (outcome === 'signed') setMessage(t('approvalUI.signedRecovered'));
        else if (outcome === 'other_signer') setMessage(t('approvalUI.otherSigner'));
        else if (outcome === 'state_changed') setMessage(t('approvalUI.stateChanged'));
        else setError(inspectionError(cause, t));
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function approve() {
    if (busyRef.current || !confirmed || !mayAct || !readiness?.canApprove) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const current = await refresh();
      if (!current) {
        setError(t('approvalUI.refreshRequired'));
        return;
      }
      if (!approvalReadiness(current, user?.id ?? null, isHSEEngineer).canApprove) {
        setMessage(
          current.inspection.status === 'approved'
            ? t('approvalUI.alreadyProcessed')
            : t('approvalUI.stateChanged'),
        );
        setDialog(null);
        return;
      }
      await actions.approve.mutateAsync(id);
      setDialog(null);
      setConfirmed(false);
      const updated = await refresh();
      if (updated?.inspection.status === 'approved') {
        toast.show(t('approvalUI.approved'));
        navigate(inspectionPath(id));
      } else setError(t('approvalUI.refreshRequired'));
    } catch (cause) {
      const updated = await refresh();
      setDialog(null);
      setConfirmed(false);
      if (!updated) setError(t('approvalUI.refreshRequired'));
      else {
        const outcome = approvalRecovery(updated, user?.id ?? null, isHSEEngineer);
        if (outcome === 'approved') setMessage(t('approvalUI.alreadyProcessed'));
        else if (outcome === 'retry') setError(t('approvalUI.approvalFailed'));
        else setError(inspectionError(cause, t));
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="hse-page approval-page inspection-page" aria-labelledby="hse-page-title">
      <Link className="inspection-back" to="/hse/approvals">
        ← {t('approvalUI.back')}
      </Link>
      {query.isPending && <p role="status">{t('inspectionUI.loading')}</p>}
      {query.isError && (
        <ErrorMessage
          error={inspectionError(query.error, t)}
          retry={() => {
            void refresh();
          }}
        />
      )}
      {query.data === null && <ErrorMessage error={t('inspectionUI.notFound')} />}
      {details && (
        <>
          <InspectionRecord details={details} />
          <div className="approval-actions inspection-panel">
            <h2>{t('approvalUI.actions')}</h2>
            {details.inspection.status === 'approved' && (
              <p role="status">{t('approvalUI.alreadyProcessed')}</p>
            )}
            {details.inspection.status === 'draft' && <p>{t('approvalUI.notSubmitted')}</p>}
            {readiness?.pending && !readiness.inspectorSignature && (
              <p className="inspection-integrity" role="alert">
                {t('approvalUI.missingInspectorSignature')}
              </p>
            )}
            {readiness?.pending && !readiness.complete && (
              <p className="inspection-integrity" role="alert">
                {t('approvalUI.incomplete')}
              </p>
            )}
            {readiness?.pending && readiness.engineerSignature && (
              <p>
                {readiness.engineerSignature.signed_by === user?.id
                  ? t('approvalUI.signedPending')
                  : t('approvalUI.otherSigner')}
              </p>
            )}
            {message && <p role="status">{message}</p>}
            {error && (
              <ErrorMessage
                error={error}
                retry={() => {
                  void refresh();
                }}
              />
            )}
            {uncertain && (
              <p className="inspection-integrity" role="alert">
                {t('approvalUI.refreshRequired')}
              </p>
            )}
            <div className="inspection-form-actions">
              <button
                type="button"
                className="inspection-button"
                disabled={busy}
                onClick={() => {
                  void refresh();
                }}
              >
                {t('approvalUI.refresh')}
              </button>
              {readiness?.canSign && (
                <button
                  type="button"
                  className="inspection-button inspection-primary"
                  disabled={!mayAct}
                  onClick={() => {
                    setConfirmed(false);
                    setDialog('sign');
                  }}
                >
                  {t('approvalUI.sign')}
                </button>
              )}
              {readiness?.canApprove && (
                <button
                  type="button"
                  className="inspection-button inspection-primary"
                  disabled={!mayAct}
                  onClick={() => {
                    setConfirmed(false);
                    setDialog('approve');
                  }}
                >
                  {error ? t('approvalUI.retryApproval') : t('approvalUI.approve')}
                </button>
              )}
              <Link className="inspection-button" to={inspectionPath(id)}>
                {t('inspectionUI.details')}
              </Link>
            </div>
          </div>
        </>
      )}
      {details && dialog === 'sign' && (
        <ChecklistDialog
          title={t('approvalUI.signTitle')}
          onClose={() => {
            if (!busy) setDialog(null);
          }}
        >
          <div className="inspection-confirm">
            <p>{t('approvalUI.signHint')}</p>
            <p>
              {t('inspectionUI.reference')}: <span dir="ltr">{details.inspection.id}</span>
            </p>
            <blockquote lang="en" dir="ltr">
              {engineerAttestation}
            </blockquote>
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              {t('approvalUI.signConfirm')}
            </label>
            <div className="inspection-form-actions">
              <button
                type="button"
                className="inspection-button"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                {t('inspectionUI.cancel')}
              </button>
              <button
                type="button"
                className="inspection-button inspection-primary"
                disabled={!confirmed || !mayAct}
                onClick={() => {
                  void sign();
                }}
              >
                {busy ? t('approvalUI.signing') : t('approvalUI.sign')}
              </button>
            </div>
          </div>
        </ChecklistDialog>
      )}
      {details && dialog === 'approve' && (
        <ChecklistDialog
          title={t('approvalUI.approveTitle')}
          onClose={() => {
            if (!busy) setDialog(null);
          }}
        >
          <div className="inspection-confirm">
            <p>{t('approvalUI.approveHint')}</p>
            <p>
              {t('inspectionUI.reference')}: <span dir="ltr">{details.inspection.id}</span>
            </p>
            <p className="inspection-record-note">{t('approvalUI.administrativeNote')}</p>
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              {t('approvalUI.approveConfirm')}
            </label>
            <div className="inspection-form-actions">
              <button
                type="button"
                className="inspection-button"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                {t('inspectionUI.cancel')}
              </button>
              <button
                type="button"
                className="inspection-button inspection-primary"
                disabled={!confirmed || !mayAct}
                onClick={() => {
                  void approve();
                }}
              >
                {busy ? t('approvalUI.approving') : t('approvalUI.approve')}
              </button>
            </div>
          </div>
        </ChecklistDialog>
      )}
    </section>
  );
}
