import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDate } from '../../../shared/date';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { isUUID } from '../../../services/hse/validation';
import type { InspectionListFilter } from '../../../domain/hse';
import { useHSEInspectionCount, useHSEInspections } from '../queries';
import {
  inspectionError,
  inspectionPageSize,
  inspectionStatus,
} from '../inspections/inspectionPresentation';
import './approvals.css';

export function PendingApprovalsPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [inspectorInput, setInspectorInput] = useState('');
  const [inspectorId, setInspectorId] = useState<string | undefined>();
  const [inspectorError, setInspectorError] = useState(false);
  const [sort, setSort] = useState<'submitted_at' | 'inspection_date'>('submitted_at');
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(1);
  const filters: InspectionListFilter = {
    status: 'pending_approval',
    search: search.trim() || undefined,
    dateFrom: from || undefined,
    dateTo: to || undefined,
    inspectorId,
  };
  const list = useHSEInspections({
    ...filters,
    sortBy: sort,
    ascending,
    offset: (page - 1) * inspectionPageSize,
    limit: inspectionPageSize,
  });
  const count = useHSEInspectionCount(filters);
  const pages = Math.max(1, Math.ceil((count.data ?? 0) / inspectionPageSize));
  useEffect(() => {
    if (count.data !== undefined && page > pages) setPage(pages);
  }, [count.data, page, pages]);
  const dateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  function applyInspector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = inspectorInput.trim();
    if (value && !isUUID(value)) {
      setInspectorError(true);
      return;
    }
    setInspectorError(false);
    setInspectorId(value || undefined);
    setPage(1);
  }
  function refresh() {
    void list.refetch();
    void count.refetch();
  }
  return (
    <section className="hse-page approval-page" aria-labelledby="hse-page-title">
      <div className="approval-heading">
        <div className="hse-page-heading">
          <span className="hse-page-kicker">{t('hse.title')}</span>
          <h1 id="hse-page-title">{t('approvalUI.title')}</h1>
          <p>{t('approvalUI.intro')}</p>
        </div>
        <button type="button" className="inspection-button" onClick={refresh}>
          {t('approvalUI.refresh')}
        </button>
      </div>
      <div className="approval-count" aria-live="polite">
        <strong>{count.data ?? '—'}</strong>
        <span>{t('approvalUI.awaiting')}</span>
      </div>
      <div className="inspection-panel">
        <div className="approval-filters">
          <label>
            {t('inspectionUI.search')}
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
            {t('inspectionUI.from')}
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            {t('inspectionUI.to')}
            <input
              type="date"
              min={from || undefined}
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            {t('inspectionUI.sort')}
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                setPage(1);
              }}
            >
              <option value="submitted_at">{t('approvalUI.submissionDate')}</option>
              <option value="inspection_date">{t('inspectionUI.date')}</option>
            </select>
          </label>
          <label>
            {t('approvalUI.direction')}
            <select
              value={ascending ? 'oldest' : 'newest'}
              onChange={(event) => {
                setAscending(event.target.value === 'oldest');
                setPage(1);
              }}
            >
              <option value="newest">{t('inspectionUI.newest')}</option>
              <option value="oldest">{t('inspectionUI.oldest')}</option>
            </select>
          </label>
        </div>
        <form className="approval-inspector-filter" onSubmit={applyInspector}>
          <label>
            {t('approvalUI.inspectorFilter')}
            <input
              type="text"
              value={inspectorInput}
              onChange={(event) => setInspectorInput(event.target.value)}
              dir="ltr"
            />
          </label>
          <button type="submit" className="inspection-button">
            {t('approvalUI.apply')}
          </button>
        </form>
        {inspectorError && (
          <p className="approval-error" role="alert">
            {t('approvalUI.invalidInspector')}
          </p>
        )}
        {inspectorId && (
          <p className="approval-filter-active">
            {t('approvalUI.filteredInspector')}: <span dir="ltr">{inspectorId}</span>
          </p>
        )}
        {(list.isPending || count.isPending) && <p role="status">{t('inspectionUI.loading')}</p>}
        {(list.isFetching || count.isFetching) && !list.isPending && (
          <p role="status">{t('inspectionUI.refreshing')}</p>
        )}
        {list.isError && (
          <ErrorMessage error={inspectionError(list.error, t)} retry={() => void list.refetch()} />
        )}
        {count.isError && (
          <ErrorMessage
            error={inspectionError(count.error, t)}
            retry={() => void count.refetch()}
          />
        )}
        {list.data && count.data !== undefined && (
          <>
            {list.data.length === 0 ? (
              <div className="inspection-empty">
                {count.data === 0 && !search && !from && !to && !inspectorId
                  ? t('approvalUI.empty')
                  : t('inspectionUI.noResults')}
              </div>
            ) : (
              <div className="inspection-table-wrap">
                <table className="inspection-table">
                  <thead>
                    <tr>
                      <th>{t('inspectionUI.chainTag')}</th>
                      <th>{t('inspectionUI.chainId')}</th>
                      <th>{t('inspectionUI.date')}</th>
                      <th>{t('inspectionUI.inspector')}</th>
                      <th>{t('inspectionUI.checklistVersion')}</th>
                      <th>{t('approvalUI.submittedAt')}</th>
                      <th>{t('inspectionUI.status')}</th>
                      <th>{t('chainUI.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.map((item) => (
                      <tr key={item.id}>
                        <td data-label={t('inspectionUI.chainTag')}>
                          <strong dir="auto">{item.chain_tag_snapshot}</strong>
                        </td>
                        <td data-label={t('inspectionUI.chainId')}>
                          <span title={item.chain_id} dir="ltr">
                            {item.chain_id.slice(0, 8)}
                          </span>
                        </td>
                        <td data-label={t('inspectionUI.date')}>
                          {formatDate(item.inspection_date)}
                        </td>
                        <td data-label={t('inspectionUI.inspector')}>
                          <span title={item.inspector_id} dir="ltr">
                            {item.inspector_id.slice(0, 8)}
                          </span>
                        </td>
                        <td data-label={t('inspectionUI.checklistVersion')}>
                          {item.template_version}
                        </td>
                        <td data-label={t('approvalUI.submittedAt')}>
                          {item.submitted_at ? dateTime(item.submitted_at) : '—'}
                        </td>
                        <td data-label={t('inspectionUI.status')}>
                          <span className="inspection-badge inspection-badge-pending_approval">
                            {inspectionStatus(item.status, t)}
                          </span>
                        </td>
                        <td data-label={t('chainUI.actions')}>
                          <Link to={`/hse/approvals/${item.id}`}>{t('approvalUI.review')}</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="inspection-pagination">
              <span>{t('inspectionUI.page', { page, pages })}</span>
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('inspectionUI.previous')}
              </button>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                {t('inspectionUI.next')}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
