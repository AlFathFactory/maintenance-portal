import { useTranslation } from 'react-i18next';
import type { InspectionDetails, InspectionSignature } from '../../../domain/hse';
import { formatDate } from '../../../shared/date';
import { Field } from '../../../shared/ui/Field';
import { InspectionChecklist } from './InspectionChecklist';
import { InspectionProgress } from './InspectionProgress';
import { inspectionProgress, savedAnswers, savedComments } from './inspectionModel';
import { inspectionStatus } from './inspectionPresentation';

function SignatureDetails({ signature }: { signature: InspectionSignature }) {
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
        value={<span dir="ltr">{signature.signed_by}</span>}
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

export function InspectionRecord({ details }: { details: InspectionDetails }) {
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
      <div className="inspection-heading">
        <div className="hse-page-heading">
          <span className="hse-page-kicker">{t('inspectionUI.details')}</span>
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
      <p className="inspection-record-note">{t('approvalUI.administrativeNote')}</p>
      <div className="inspection-detail-panels">
        <section className="inspection-panel">
          <h2>{t('inspectionUI.details')}</h2>
          <div className="inspection-detail-grid">
            <Field label={t('inspectionUI.date')} value={formatDate(record.inspection_date)} />
            <Field
              label={t('inspectionUI.inspector')}
              value={<span dir="ltr">{record.inspector_id}</span>}
            />
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
            <Field
              label={t('inspectionUI.chainId')}
              value={<span dir="ltr">{record.chain_id}</span>}
            />
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
      <InspectionProgress progress={progress} unsaved={false} />
      {progress.unanswered > 0 && (
        <p className="inspection-integrity" role="alert">
          {t('approvalUI.unansweredWarning', { count: progress.unanswered })}
        </p>
      )}
      <section className="inspection-panel" aria-label={t('approvalUI.findings')}>
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
                  <strong>{t('approvalUI.faulty')}</strong>{' '}
                  <span lang="en" dir="ltr">
                    {item.check_text_en}
                  </span>
                  <small dir="auto">
                    {i18n.language === 'ar' ? section.name_ar : section.name_en}
                  </small>
                </button>
                {comments[section.id] && (
                  <p>
                    {t('inspectionUI.comments')}: {comments[section.id]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('approvalUI.noFaulty')}</p>
        )}
      </section>
      <InspectionChecklist
        checklist={details.checklist}
        answers={answers}
        comments={comments}
        editable={false}
      />
      <section className="inspection-panel">
        <h2>{t('inspectionUI.signTitle')}</h2>
        {inspectorSignature ? (
          <SignatureDetails signature={inspectorSignature} />
        ) : (
          <p className="inspection-integrity" role="alert">
            {t('approvalUI.missingInspectorSignature')}
          </p>
        )}
      </section>
      <section className="inspection-panel">
        <h2>{t('approvalUI.engineerAttestation')}</h2>
        {engineerSignature ? (
          <SignatureDetails signature={engineerSignature} />
        ) : (
          <p>{t('approvalUI.noEngineerSignature')}</p>
        )}
      </section>
      <section className="inspection-panel">
        <h2>{t('inspectionUI.approval')}</h2>
        {record.status === 'pending_approval' && <p>{t('inspectionUI.pending_approval')}</p>}
        {record.approved_by && record.approved_at ? (
          <div className="inspection-detail-grid">
            <Field
              label={t('inspectionUI.approvedBy')}
              value={<span dir="ltr">{record.approved_by}</span>}
            />
            <Field label={t('inspectionUI.approvedAt')} value={dateTime(record.approved_at)} />
          </div>
        ) : (
          record.status !== 'pending_approval' && <p>{t('inspectionUI.noApproval')}</p>
        )}
      </section>
    </>
  );
}
