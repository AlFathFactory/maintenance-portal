import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { formatDate } from '../../../shared/date';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { Field } from '../../../shared/ui/Field';
import { useAuth } from '../../auth/AuthProvider';
import { chainPath } from '../chains/chainPresentation';
import { useHSEInspection } from '../queries';
import { InspectionChecklist } from './InspectionChecklist';
import { InspectionProgress } from './InspectionProgress';
import { inspectionProgress, savedAnswers, savedComments } from './inspectionModel';
import { inspectionEditPath, inspectionError, inspectionStatus } from './inspectionPresentation';
import './inspections.css';

export function InspectionDetailsPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const query = useHSEInspection(id);
  const details = query.data;
  const record = details?.inspection;
  const dateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  const inspectorSignature = details?.signatures.find(
    (signature) => signature.signer_role === 'inspector',
  );
  const engineerSignature = details?.signatures.find(
    (signature) => signature.signer_role === 'hse_engineer',
  );
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
      {details && record && (
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
          <div className="inspection-form-actions">
            <Link className="inspection-button" to={chainPath(record.chain_id)}>
              {t('inspectionUI.chain')}
            </Link>
            {record.status === 'draft' && record.inspector_id === user?.id && (
              <Link
                className="inspection-button inspection-primary"
                to={inspectionEditPath(record.id)}
              >
                {t('inspectionUI.continue')}
              </Link>
            )}
          </div>
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
                <Field
                  label={t('inspectionUI.status')}
                  value={inspectionStatus(record.status, t)}
                />
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
          <InspectionProgress
            progress={inspectionProgress(details.checklist, savedAnswers(details))}
            unsaved={false}
          />
          <InspectionChecklist
            checklist={details.checklist}
            answers={savedAnswers(details)}
            comments={savedComments(details)}
            editable={false}
          />
          <section className="inspection-panel">
            <h2>{t('inspectionUI.signTitle')}</h2>
            {inspectorSignature ? (
              <div className="inspection-detail-grid">
                <Field
                  label={t('inspectionUI.signatureRole')}
                  value={t('inspectionUI.inspector')}
                />
                <Field
                  label={t('inspectionUI.inspector')}
                  value={<span dir="ltr">{inspectorSignature.signed_by}</span>}
                />
                <Field
                  label={t('inspectionUI.signedAt')}
                  value={dateTime(inspectorSignature.signed_at)}
                />
                <Field
                  label={t('inspectionUI.signatureMethod')}
                  value={t('inspectionUI.authenticatedAccount')}
                />
                <Field
                  label={t('inspectionUI.attestation')}
                  value={
                    <span lang="en" dir="ltr">
                      {inspectorSignature.attestation_text}
                    </span>
                  }
                />
              </div>
            ) : (
              <p>{t('inspectionUI.noSignature')}</p>
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
                {engineerSignature && (
                  <Field label={t('inspectionUI.signatureRole')} value={t('chainUI.engineer')} />
                )}
                {engineerSignature && (
                  <Field
                    label={t('inspectionUI.attestation')}
                    value={
                      <span lang="en" dir="ltr">
                        {engineerSignature.attestation_text}
                      </span>
                    }
                  />
                )}
              </div>
            ) : (
              record.status !== 'pending_approval' && <p>{t('inspectionUI.noApproval')}</p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
