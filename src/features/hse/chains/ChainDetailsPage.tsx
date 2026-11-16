import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { formatDate } from '../../../shared/date';
import { Field } from '../../../shared/ui/Field';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { useHSEChain, useHSEChainLineage, useHSEInspections } from '../queries';
import { chainError, chainPath, chainStatus, replacementPath } from './chainPresentation';
import { ChainForm } from './ChainForm';
import { ScrapChainDialog } from './ScrapChainDialog';
import './chains.css';

export function ChainDetailsPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { isHSEEngineer } = useAuth();
  const [params, setParams] = useSearchParams();
  const [scrapOpen, setScrapOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const chainQuery = useHSEChain(id);
  const lineageQuery = useHSEChainLineage(id);
  const history = useHSEInspections({ chainId: id, offset: (historyPage - 1) * 20, limit: 21 });
  const chain = chainQuery.data;
  const edit = params.has('edit') && isHSEEngineer && chain?.status === 'active';
  const successor = lineageQuery.data?.successors[0];
  const dateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  return (
    <section className="hse-page chain-page" aria-labelledby="hse-page-title">
      <Link
        className="chain-back"
        to={chain?.status === 'scrapped' ? '/hse/scrapped' : '/hse/chains'}
      >
        ← {t(chain?.status === 'scrapped' ? 'chainUI.backArchive' : 'chainUI.back')}
      </Link>
      {chainQuery.isPending && <p role="status">{t('chainUI.loading')}</p>}
      {chainQuery.isError && (
        <ErrorMessage
          error={chainError(chainQuery.error, t)}
          retry={() => void chainQuery.refetch()}
        />
      )}
      {chainQuery.data === null && <ErrorMessage error={t('errors.notFound')} />}
      {chain && (
        <>
          <div className="chain-heading">
            <div className="hse-page-heading">
              <span className="hse-page-kicker">{t('chainUI.details')}</span>
              <h1 id="hse-page-title" dir="auto">
                {chain.tag_no}
              </h1>
              <p className="chain-uuid">
                {t('chainUI.physicalId')}: <span dir="ltr">{chain.id}</span>
              </p>
            </div>
            <span className={`chain-status chain-status-${chain.status}`}>
              {chainStatus(chain, t)}
            </span>
          </div>
          <div className="chain-detail-actions">
            {isHSEEngineer && chain.status === 'active' && (
              <>
                <button
                  className="chain-button"
                  type="button"
                  onClick={() => setParams(edit ? {} : { edit: '1' })}
                >
                  {t(edit ? 'chainUI.cancel' : 'chainUI.edit')}
                </button>
                <button
                  className="chain-button chain-button-danger"
                  type="button"
                  onClick={() => setScrapOpen(true)}
                >
                  {t('chainUI.scrap')}
                </button>
              </>
            )}
            {isHSEEngineer && chain.status === 'scrapped' && lineageQuery.data && !successor && (
              <Link className="chain-button chain-button-primary" to={replacementPath(chain.id)}>
                {t('chainUI.replace')}
              </Link>
            )}
          </div>
          {edit && (
            <div className="chain-panel chain-form-panel">
              <h2>{t('chainUI.edit')}</h2>
              <ChainForm
                key={chain.id}
                chain={chain}
                onDone={() => setParams({})}
                onCancel={() => setParams({})}
              />
            </div>
          )}
          <div className="chain-detail-grid">
            <section className="chain-panel">
              <h2>{t('chainUI.technical')}</h2>
              <div className="chain-fields">
                <Field label={t('chainUI.tag')} value={chain.tag_no} />
                <Field label={t('chainUI.legs')} value={chain.number_of_legs} />
                <Field label={t('chainUI.wll')} value={chain.working_load_limit_tons} />
                <Field label={t('chainUI.length')} value={chain.length_m} />
                <Field
                  label={t('chainUI.startDate')}
                  value={formatDate(chain.start_working_date)}
                />
              </div>
            </section>
            <section className="chain-panel">
              <h2>{t('chainUI.lifecycle')}</h2>
              <div className="chain-fields">
                <Field label={t('chainUI.status')} value={chainStatus(chain, t)} />
                <Field label={t('chainUI.created')} value={dateTime(chain.created_at)} />
                <Field label={t('chainUI.updated')} value={dateTime(chain.updated_at)} />
                {chain.scrapping_date && (
                  <Field label={t('chainUI.scrapDate')} value={formatDate(chain.scrapping_date)} />
                )}
                {chain.scrapping_reason && (
                  <Field label={t('chainUI.scrapReason')} value={chain.scrapping_reason} />
                )}
              </div>
            </section>
          </div>
          <section className="chain-panel chain-section">
            <h2>{t('chainUI.replacement')}</h2>
            {lineageQuery.isPending && <p role="status">{t('chainUI.loading')}</p>}
            {lineageQuery.isError && (
              <ErrorMessage
                error={chainError(lineageQuery.error, t)}
                retry={() => void lineageQuery.refetch()}
              />
            )}
            {lineageQuery.data && (
              <>
                {!lineageQuery.data.ancestors.length && !lineageQuery.data.successors.length ? (
                  <p>{t('chainUI.noLineage')}</p>
                ) : (
                  <ol className="chain-lineage">
                    {[
                      ...lineageQuery.data.ancestors,
                      lineageQuery.data.chain,
                      ...lineageQuery.data.successors,
                    ].map((item) => (
                      <li key={item.id} aria-current={item.id === chain.id ? 'step' : undefined}>
                        <Link to={chainPath(item.id)}>
                          <strong dir="auto">{item.tag_no}</strong>
                          <small dir="ltr">{item.id}</small>
                          <span>{chainStatus(item, t)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </section>
          <section className="chain-panel chain-section">
            <h2>{t('chainUI.inspections')}</h2>
            {history.isPending && <p role="status">{t('chainUI.loading')}</p>}
            {history.isError && (
              <ErrorMessage
                error={chainError(history.error, t)}
                retry={() => void history.refetch()}
              />
            )}
            {history.data &&
              (history.data.length ? (
                <>
                  <ul className="chain-history">
                    {history.data.slice(0, 20).map((item) => (
                      <li key={item.id}>
                        <span>{formatDate(item.inspection_date)}</span>
                        <span>
                          {t(
                            item.status === 'draft'
                              ? 'chainUI.inspectionDraft'
                              : item.status === 'approved'
                                ? 'chainUI.inspectionApproved'
                                : 'chainUI.inspectionPending',
                          )}
                        </span>
                        <small dir="ltr">{item.id}</small>
                      </li>
                    ))}
                  </ul>
                  <div className="chain-pagination">
                    <button
                      type="button"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage(historyPage - 1)}
                    >
                      {t('chainUI.previous')}
                    </button>
                    <button
                      type="button"
                      disabled={history.data.length <= 20}
                      onClick={() => setHistoryPage(historyPage + 1)}
                    >
                      {t('chainUI.next')}
                    </button>
                  </div>
                </>
              ) : (
                <p>{t('chainUI.noInspections')}</p>
              ))}
          </section>
          {scrapOpen && <ScrapChainDialog chain={chain} onClose={() => setScrapOpen(false)} />}
        </>
      )}
    </section>
  );
}
