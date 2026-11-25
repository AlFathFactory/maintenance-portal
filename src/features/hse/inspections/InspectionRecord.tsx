import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { InspectionDetails, InspectionSignature } from '../../../domain/hse';
import { formatDate } from '../../../shared/date';
import { Field } from '../../../shared/ui/Field';
import { InspectionChecklist } from './InspectionChecklist';
import { InspectionProgress } from './InspectionProgress';
import { inspectionProgress, savedAnswers, savedComments } from './inspectionModel';
import { inspectionStatus } from './inspectionPresentation';

function SignatureDetails({
  signature,
  email,
}: {
  signature: InspectionSignature;
  email?: string;
}) {
  const { t, i18n } = useTranslation();
  const signedAt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(signature.signed_at));
  return (
    <div className="inspection-detail-grid">
      <Field
        label={t('inspectionUI.signatureRole')}
        value={t(
          signature.signer_role === 'inspector' ? 'inspectionUI.inspector' : 'chainUI.engineer',
        )}
      />
      <Field
        label={t('approvalUI.signedBy')}
        value={email ? <span dir="ltr">{email}</span> : null}
      />
      <Field label={t('inspectionUI.signedAt')} value={signedAt} />
      <Field
        label={t('inspectionUI.signatureMethod')}
        value={t('inspectionUI.authenticatedAccount')}
      />
      <Field
        label={t('inspectionUI.attestation')}
        value={
          <span lang="en" dir="ltr">
            {signature.attestation_text}
          </span>
        }
      />
    </div>
  );
}

export function InspectionRecord({
  details,
  actions,
}: {
  details: InspectionDetails;
  actions?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const record = details.inspection;
  const answers = savedAnswers(details);
  const comments = savedComments(details);
  const progress = inspectionProgress(details.checklist, answers);
  const faulty = details.checklist.sections.flatMap((section) =>
    section.items
      .filter((item) => answers[item.id] === 'Faulty')
      .map((item) => ({ item, section })),
  );
  const inspectorSignature = details.signatures.find(
    (signature) => signature.signer_role === 'inspector',
  );
  const engineerSignature = details.signatures.find(
    (signature) => signature.signer_role === 'hse_engineer',
  );
  const dateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));

  return (
    <>
      <div className="inspection-heading inspection-record-heading">
        <div className="hse-page-heading">
          <span className="hse-page-kicker">{t('inspectionUI.details')}</span>
          <h1 id="hse-page-title" dir="auto">
            {record.chain_tag_snapshot}
          </h1>
        </div>
        <div className="inspection-record-heading-side">
          <span className={`inspection-badge inspection-badge-${record.status}`}>
            {inspectionStatus(record.status, t)}
          </span>
          {actions}
        </div>
      </div>
      <InspectionProgress progress={progress} unsaved={false} />
      <div className="inspection-detail-panels">
        <section className="inspection-panel">
          <h2>{t('inspectionUI.details')}</h2>
          <div className="inspection-detail-grid">
            <Field label={t('inspectionUI.date')} value={formatDate(record.inspection_date)} />
            <Field label={t('inspectionUI.checklistVersion')} value={record.template_version} />
            <Field label={t('inspectionUI.status')} value={inspectionStatus(record.status, t)} />
            {record.submitted_at && (
              <Field label={t('approvalUI.submittedAt')} value={dateTime(record.submitted_at)} />
            )}
          </div>
        </section>
        <section className="inspection-panel">
          <h2>{t('inspectionUI.snapshot')}</h2>
          <div className="inspection-detail-grid">
            <Field label={t('chainUI.legs')} value={record.chain_legs_snapshot} />
            <Field label={t('chainUI.wll')} value={record.chain_wll_tons_snapshot} />
            <Field label={t('chainUI.length')} value={record.chain_length_m_snapshot} />
            <Field
              label={t('chainUI.startDate')}
              value={formatDate(record.chain_start_working_date_snapshot)}
            />
          </div>
        </section>
      </div>
      {progress.unanswered > 0 && (
        <p className="inspection-integrity" role="alert">
          {t('approvalUI.unansweredWarning', { count: progress.unanswered })}
        </p>
      )}
      <section
        className="inspection-panel inspection-findings-panel"
        aria-label={t('approvalUI.findings')}
      >
        <h2>{t('approvalUI.findings')}</h2>
        {faulty.length ? (
          <ul className="inspection-findings">
            {faulty.map(({ item, section }) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(`inspection-item-${item.id}`)
                      ?.scrollIntoView({ block: 'center' })
                  }
                >
                  <span className="inspection-finding-top">
                    <strong>{t('approvalUI.faulty')}</strong>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </span>
                  <span className="inspection-finding-text" lang="en" dir="ltr">
                    {item.check_text_en}
                  </span>
                  <small dir="auto">
                    {i18n.language === 'ar' ? section.name_ar : section.name_en}
                  </small>
                  {comments[section.id] && (
                    <span className="inspection-finding-comment">
                      {t('inspectionUI.comments')}: {comments[section.id]}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('approvalUI.noFaulty')}</p>
        )}
      </section>
      <div className="inspection-checklist-heading">
        <h2>{t('inspectionUI.sections')}</h2>
      </div>
      <InspectionChecklist
        checklist={details.checklist}
        answers={answers}
        comments={comments}
        editable={false}
      />
      <div className="inspection-signoff">
        <p className="inspection-record-note">{t('approvalUI.administrativeNote')}</p>
        <div className="inspection-signoff-grid">
          <section className="inspection-panel">
            <h2>{t('inspectionUI.signTitle')}</h2>
            {inspectorSignature ? (
              <SignatureDetails
                signature={inspectorSignature}
                email={details.actorEmails[inspectorSignature.signed_by]}
              />
            ) : (
              <p className="inspection-integrity" role="alert">
                {t('approvalUI.missingInspectorSignature')}
              </p>
            )}
          </section>
          <section className="inspection-panel">
            <h2>{t('approvalUI.engineerAttestation')}</h2>
            {engineerSignature ? (
              <SignatureDetails
                signature={engineerSignature}
                email={details.actorEmails[engineerSignature.signed_by]}
              />
            ) : (
              <p>{t('approvalUI.noEngineerSignature')}</p>
            )}
          </section>
          <section className="inspection-panel inspection-approval-panel">
            <h2>{t('inspectionUI.approval')}</h2>
            {record.status === 'pending_approval' && <p>{t('inspectionUI.pending_approval')}</p>}
            {record.approved_by && record.approved_at ? (
              <div className="inspection-detail-grid">
                <Field
                  label={t('inspectionUI.approvedBy')}
                  value={
                    details.actorEmails[record.approved_by] ? (
                      <span dir="ltr">{details.actorEmails[record.approved_by]}</span>
                    ) : null
                  }
                />
                <Field label={t('inspectionUI.approvedAt')} value={dateTime(record.approved_at)} />
              </div>
            ) : (
              record.status !== 'pending_approval' && <p>{t('inspectionUI.noApproval')}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
