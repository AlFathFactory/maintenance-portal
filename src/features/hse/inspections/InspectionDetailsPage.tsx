import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { useAuth } from '../../auth/AuthProvider';
import { chainPath } from '../chains/chainPresentation';
import { useHSEInspection } from '../queries';
import { InspectionRecord } from './InspectionRecord';
import { inspectionEditPath, inspectionError } from './inspectionPresentation';
import './inspections.css';

export function InspectionDetailsPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { user, isHSEEngineer } = useAuth();
  const query = useHSEInspection(id);
  const details = query.data;
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
      {details && (
        <>
          <InspectionRecord details={details} />
          <div className="inspection-form-actions">
            <Link className="inspection-button" to={chainPath(details.inspection.chain_id)}>
              {t('inspectionUI.chain')}
            </Link>
            {details.inspection.status === 'draft' &&
              details.inspection.inspector_id === user?.id &&
              !details.signatures.some((signature) => signature.signer_role === 'inspector') && (
                <Link
                  className="inspection-button inspection-primary"
                  to={inspectionEditPath(details.inspection.id)}
                >
                  {t('inspectionUI.continue')}
                </Link>
              )}
            {isHSEEngineer && details.inspection.status === 'pending_approval' && (
              <Link
                className="inspection-button inspection-primary"
                to={`/hse/approvals/${details.inspection.id}`}
              >
                {t('approvalUI.review')}
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}
