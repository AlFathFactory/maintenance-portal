import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDate, todayLocal } from '../../../shared/date';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { useToast } from '../../../shared/ui/ToastProvider';
import {
  useHSEChain,
  useHSEChains,
  useHSECurrentChecklist,
  useHSEInspectionActions,
} from '../queries';
import { inspectionEditPath, inspectionError, inspectionPageSize } from './inspectionPresentation';
import './inspections.css';

export function InspectionCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const chainId = params.get('chainId') ?? '';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [date, setDate] = useState(todayLocal());
  const [error, setError] = useState<string | null>(null);
  const candidates = useHSEChains({
    status: 'active',
    tagNo: search.trim() || undefined,
    offset: (page - 1) * inspectionPageSize,
    limit: inspectionPageSize,
  });
  const chain = useHSEChain(chainId);
  const published = useHSECurrentChecklist('published');
  const action = useHSEInspectionActions().create;
  const eligible = chain.data?.status === 'active' && Boolean(published.data?.version);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action.isPending || !eligible || !chain.data || !published.data) return;
    setError(null);
    try {
      const record = await action.mutateAsync({
        chain_id: chain.data.id,
        template_version: published.data.version.version,
        inspection_date: date,
      });
      toast.show(t('inspectionUI.createdToast'));
      navigate(inspectionEditPath(record.id));
    } catch (cause) {
      const message = inspectionError(cause, t);
      setError(message);
      toast.show(message);
    }
  }
  return (
    <section className="hse-page inspection-page" aria-labelledby="hse-page-title">
      <Link to="/hse/inspections" className="inspection-back">
        ← {t('inspectionUI.back')}
      </Link>
      <div className="hse-page-heading">
        <span className="hse-page-kicker">{t('hse.title')}</span>
        <h1 id="hse-page-title">{t('inspectionUI.new')}</h1>
        <p>{t('inspectionUI.intro')}</p>
      </div>
      <div className="inspection-panel inspection-create">
        <form onSubmit={(event) => void create(event)}>
          <div className="inspection-chain-picker">
            <label>
              {t('inspectionUI.chainSearch')}
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              {t('inspectionUI.chooseChain')}
              <select
                value={chainId}
                onChange={(event) => setParams({ chainId: event.target.value })}
                required
              >
                <option value="">{t('inspectionUI.chooseChain')}</option>
                {(candidates.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.tag_no} · {item.id.slice(0, 8)}
                  </option>
                ))}
                {chain.data &&
                  !(candidates.data ?? []).some((item) => item.id === chain.data?.id) && (
                    <option value={chain.data.id}>
                      {chain.data.tag_no} · {chain.data.id.slice(0, 8)}
                    </option>
                  )}
              </select>
            </label>
          </div>
          {candidates.isPending && <p role="status">{t('inspectionUI.loading')}</p>}
          {candidates.isError && (
            <ErrorMessage
              error={inspectionError(candidates.error, t)}
              retry={() => void candidates.refetch()}
            />
          )}
          {candidates.data?.length === 0 && <p>{t('inspectionUI.noActiveChains')}</p>}
          <div className="inspection-pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t('inspectionUI.previous')}
            </button>
            <button
              type="button"
              disabled={(candidates.data?.length ?? 0) < inspectionPageSize}
              onClick={() => setPage(page + 1)}
            >
              {t('inspectionUI.next')}
            </button>
          </div>
          {chainId && chain.isPending && <p role="status">{t('inspectionUI.loading')}</p>}
          {chain.isError && (
            <ErrorMessage
              error={inspectionError(chain.error, t)}
              retry={() => void chain.refetch()}
            />
          )}
          {chainId && chain.data === null && (
            <ErrorMessage error={t('inspectionUI.chainUnavailable')} />
          )}
          {chain.data?.status === 'scrapped' && (
            <ErrorMessage error={t('inspectionUI.chainUnavailable')} />
          )}
          {chain.data?.status === 'active' && (
            <div className="inspection-chain-summary">
              <strong dir="auto">{chain.data.tag_no}</strong>
              <span>
                {t('chainUI.legs')}: {chain.data.number_of_legs}
              </span>
              <span>
                {t('chainUI.wll')}: {chain.data.working_load_limit_tons}
              </span>
              <span>
                {t('chainUI.length')}: {chain.data.length_m}
              </span>
              <span>
                {t('chainUI.startDate')}: {formatDate(chain.data.start_working_date)}
              </span>
              <small dir="ltr">{chain.data.id}</small>
            </div>
          )}
          <div className="inspection-create-grid">
            <label>
              {t('inspectionUI.date')}
              <input
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <div>
              <span>{t('inspectionUI.publishedChecklist')}</span>
              <strong>
                {published.data
                  ? `${t('checklistUI.version')} ${published.data.version.version}`
                  : '—'}
              </strong>
            </div>
          </div>
          {published.isPending && <p role="status">{t('inspectionUI.loading')}</p>}
          {published.isError && (
            <ErrorMessage
              error={inspectionError(published.error, t)}
              retry={() => void published.refetch()}
            />
          )}
          {published.data === null && <ErrorMessage error={t('inspectionUI.noPublished')} />}
          {published.data &&
            published.data.sections.every((section) => section.items.length === 0) && (
              <ErrorMessage error={t('inspectionUI.noCheckpoints')} />
            )}
          {error && <ErrorMessage error={error} />}
          <div className="inspection-form-actions">
            <button
              className="inspection-button inspection-primary"
              type="submit"
              disabled={
                action.isPending ||
                !eligible ||
                published.data?.sections.every((section) => section.items.length === 0)
              }
            >
              {t('inspectionUI.create')}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
