import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { InspectionDetails, InspectionSignature } from '../../../domain/hse';
import { formatDate } from '../../../shared/date';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { Field } from '../../../shared/ui/Field';
import { useToast } from '../../../shared/ui/ToastProvider';
import { useAuth } from '../../auth/AuthProvider';
import { ChecklistDialog } from '../checklist/ChecklistDialog';
import { useHSEInspection, useHSEInspectionActions } from '../queries';
import { InspectionChecklist } from './InspectionChecklist';
import { InspectionProgress } from './InspectionProgress';
import {
  changedAnswers,
  changedComments,
  canEditInspection,
  inspectionProgress,
  savedAnswers,
  savedComments,
  type AnswerMap,
  type CommentMap,
} from './inspectionModel';
import {
  inspectorAttestation,
  inspectionError,
  inspectionPath,
  inspectionStatus,
} from './inspectionPresentation';
import { useUnsavedWarning } from './useUnsavedWarning';
import './inspections.css';

export function InspectionFormPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const query = useHSEInspection(id);
  return (
    <section className="hse-page inspection-page" aria-labelledby="hse-page-title">
      <Link to="/hse/inspections" className="inspection-back">
        ← {t('inspectionUI.back')}
      </Link>
      {query.isPending && <p role="status">{t('inspectionUI.loading')}</p>}
      {query.isError && (
        <ErrorMessage error={inspectionError(query.error, t)} retry={() => void query.refetch()} />
      )}
      {query.data === null && <ErrorMessage error={t('inspectionUI.notFound')} />}
      {query.data && <InspectionEditor key={query.data.inspection.id} details={query.data} />}
    </section>
  );
}

function InspectionEditor({ details }: { details: InspectionDetails }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const actions = useHSEInspectionActions();
  const record = details.inspection;
  const savedAnswerRef = useRef<AnswerMap>(savedAnswers(details));
  const savedCommentRef = useRef<CommentMap>(savedComments(details));
  const savedDateRef = useRef(record.inspection_date);
  const [answers, setAnswers] = useState<AnswerMap>(() => savedAnswers(details));
  const [comments, setComments] = useState<CommentMap>(() => savedComments(details));
  const [date, setDate] = useState(record.inspection_date);
  const [saving, setSaving] = useState(false);
  const [localSignature, setLocalSignature] = useState<InspectionSignature | null>(null);
  const [dialog, setDialog] = useState<'sign' | 'submit' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signed = Boolean(
    localSignature || details.signatures.some((signature) => signature.signer_role === 'inspector'),
  );
  const owner = record.inspector_id === user?.id;
  const editable = canEditInspection(record, user?.id ?? null, signed);
  const answerChanges = changedAnswers(details.checklist, answers, savedAnswerRef.current);
  const commentChanges = changedComments(details.checklist, comments, savedCommentRef.current);
  const unsaved =
    date !== savedDateRef.current || answerChanges.length > 0 || commentChanges.length > 0;
  const progress = inspectionProgress(details.checklist, answers);
  const persistedProgress = inspectionProgress(details.checklist, savedAnswerRef.current);
  const canSign =
    owner &&
    record.status === 'draft' &&
    !signed &&
    !saving &&
    !unsaved &&
    persistedProgress.total > 0 &&
    persistedProgress.unanswered === 0;
  useUnsavedWarning(unsaved, t('inspectionUI.leaveWarning'));
  async function saveDraft() {
    if (!editable || saving || !unsaved) return;
    setError(null);
    setSaving(true);
    try {
      if (date !== savedDateRef.current) {
        await actions.updateDraft.mutateAsync({ id: record.id, input: { inspection_date: date } });
        savedDateRef.current = date;
      }
      for (const change of answerChanges) {
        await actions.saveResult.mutateAsync({ inspectionId: record.id, ...change });
        savedAnswerRef.current[change.itemId] = change.result;
      }
      for (const change of commentChanges) {
        await actions.saveComment.mutateAsync({ inspectionId: record.id, ...change });
        savedCommentRef.current[change.sectionId] = change.comments;
      }
      toast.show(t('inspectionUI.savedToast'));
    } catch (cause) {
      setError(t('inspectionUI.saveFailed'));
      toast.show(inspectionError(cause, t));
    } finally {
      setSaving(false);
    }
  }
  async function sign() {
    if (!canSign || !confirmed || actions.signAsInspector.isPending) return;
    setError(null);
    try {
      const signature = await actions.signAsInspector.mutateAsync(record.id);
      setLocalSignature(signature);
      toast.show(t('inspectionUI.signed'));
      setDialog(null);
      setConfirmed(false);
    } catch (cause) {
      setError(inspectionError(cause, t));
    }
  }
  async function submit() {
    if (!owner || !signed || record.status !== 'draft' || !confirmed || actions.submit.isPending)
      return;
    setError(null);
    try {
      await actions.submit.mutateAsync(record.id);
      toast.show(t('inspectionUI.submitted'));
      navigate(inspectionPath(record.id));
    } catch (cause) {
      setError(t('inspectionUI.submitFailed'));
      toast.show(inspectionError(cause, t));
      setDialog(null);
      setConfirmed(false);
    }
  }
  return (
    <>
      <div className="inspection-heading">
        <div className="hse-page-heading">
          <span className="hse-page-kicker">{t('inspectionUI.edit')}</span>
          <h1 id="hse-page-title" dir="auto">
            {record.chain_tag_snapshot}
          </h1>
          <p>
            {t('inspectionUI.reference')}: <span dir="ltr">{record.id}</span>
          </p>
        </div>
        <span className={`inspection-badge inspection-badge-${record.status}`}>
          {inspectionStatus(record.status, t)}
        </span>
      </div>
      <div className="inspection-panel">
        <div className="inspection-detail-grid">
          <Field
            label={t('inspectionUI.chainId')}
            value={<span dir="ltr">{record.chain_id}</span>}
          />
          <Field label={t('inspectionUI.checklistVersion')} value={record.template_version} />
          <Field
            label={t('inspectionUI.inspector')}
            value={<span dir="ltr">{record.inspector_id}</span>}
          />
          <Field
            label={t('inspectionUI.date')}
            value={
              editable ? (
                <input
                  type="date"
                  value={date}
                  disabled={saving}
                  onChange={(event) => setDate(event.target.value)}
                />
              ) : (
                formatDate(date)
              )
            }
          />
        </div>
      </div>
      {!owner && record.status === 'draft' && (
        <p className="inspection-notice">{t('inspectionUI.onlyOwner')}</p>
      )}
      {signed && record.status === 'draft' && (
        <p className="inspection-notice">{t('inspectionUI.signedDraft')}</p>
      )}
      {record.status !== 'draft' && <p className="inspection-notice">{t('inspectionUI.frozen')}</p>}
      <InspectionProgress progress={progress} unsaved={unsaved} />
      <InspectionChecklist
        checklist={details.checklist}
        answers={answers}
        comments={comments}
        editable={editable && !saving}
        onAnswer={(itemId, result) => setAnswers((current) => ({ ...current, [itemId]: result }))}
        onComment={(sectionId, value) =>
          setComments((current) => ({ ...current, [sectionId]: value }))
        }
      />
      {error && <ErrorMessage error={error} />}
      <div className="inspection-form-actions">
        <Link className="inspection-button" to={inspectionPath(record.id)}>
          {t('inspectionUI.details')}
        </Link>
        {editable && (
          <button
            className="inspection-button inspection-primary"
            type="button"
            disabled={!unsaved || saving}
            onClick={() => void saveDraft()}
          >
            {t(saving ? 'inspectionUI.saving' : 'inspectionUI.save')}
          </button>
        )}
        {editable && (
          <button
            className="inspection-button"
            type="button"
            disabled={!canSign}
            onClick={() => {
              setConfirmed(false);
              setDialog('sign');
            }}
          >
            {t('inspectionUI.sign')}
          </button>
        )}
        {owner && signed && record.status === 'draft' && (
          <button
            className="inspection-button inspection-primary"
            type="button"
            disabled={actions.submit.isPending}
            onClick={() => {
              setConfirmed(false);
              setDialog('submit');
            }}
          >
            {t(error ? 'inspectionUI.retrySubmit' : 'inspectionUI.submit')}
          </button>
        )}
      </div>
      {editable && !canSign && persistedProgress.unanswered > 0 && (
        <p className="inspection-help">{t('inspectionUI.completeToSign')}</p>
      )}
      {dialog === 'sign' && (
        <ChecklistDialog
          title={t('inspectionUI.signTitle')}
          onClose={() => {
            if (!actions.signAsInspector.isPending) setDialog(null);
          }}
        >
          <div className="inspection-confirm">
            <p>{t('inspectionUI.signHint')}</p>
            <blockquote lang="en" dir="ltr">
              {inspectorAttestation}
            </blockquote>
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              {t('inspectionUI.signConfirm')}
            </label>
            <div className="inspection-form-actions">
              <button
                type="button"
                className="inspection-button"
                disabled={actions.signAsInspector.isPending}
                onClick={() => setDialog(null)}
              >
                {t('inspectionUI.cancel')}
              </button>
              <button
                type="button"
                className="inspection-button inspection-primary"
                disabled={!confirmed || actions.signAsInspector.isPending}
                onClick={() => void sign()}
              >
                {t('inspectionUI.sign')}
              </button>
            </div>
          </div>
        </ChecklistDialog>
      )}
      {dialog === 'submit' && (
        <ChecklistDialog
          title={t('inspectionUI.submitTitle')}
          onClose={() => {
            if (!actions.submit.isPending) setDialog(null);
          }}
        >
          <div className="inspection-confirm">
            <p>{t('inspectionUI.submitHint')}</p>
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              {t('inspectionUI.submitConfirm')}
            </label>
            <div className="inspection-form-actions">
              <button
                type="button"
                className="inspection-button"
                disabled={actions.submit.isPending}
                onClick={() => setDialog(null)}
              >
                {t('inspectionUI.cancel')}
              </button>
              <button
                type="button"
                className="inspection-button inspection-primary"
                disabled={!confirmed || actions.submit.isPending}
                onClick={() => void submit()}
              >
                {t('inspectionUI.submit')}
              </button>
            </div>
          </div>
        </ChecklistDialog>
      )}
    </>
  );
}
