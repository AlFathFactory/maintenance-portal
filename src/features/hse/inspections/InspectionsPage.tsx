import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import type { InspectionListFilter, InspectionStatus } from '../../../domain/hse';
import { formatDate } from '../../../shared/date';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { isUUID } from '../../../services/hse/validation';
import { useAuth } from '../../auth/AuthProvider';
import { useHSEInspectionCount, useHSEInspections } from '../queries';
import {
  inspectionEditPath,
  inspectionError,
  inspectionNewPath,
  inspectionPageSize,
  inspectionPath,
  inspectionStatus,
} from './inspectionPresentation';
import './inspections.css';

export function InspectionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const chainId = params.get('chainId') ?? undefined;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InspectionStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [inspectorInput, setInspectorInput] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'status'>('newest');
  const [page, setPage] = useState(1);
  const validInspector = !inspectorInput.trim() || isUUID(inspectorInput.trim());
  const base: InspectionListFilter = {
    chainId,
    inspectorId: validInspector ? inspectorInput.trim() || undefined : undefined,
    status: status || undefined,
    search: search.trim() || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };
  const filter: InspectionListFilter = {
    ...base,
    sortBy: sort === 'status' ? 'status' : 'inspection_date',
    ascending: sort === 'oldest',
    offset: (page - 1) * inspectionPageSize,
    limit: inspectionPageSize,
  };
  const list = useHSEInspections(filter, validInspector);
  const count = useHSEInspectionCount(base, validInspector);
  const total = useHSEInspectionCount({});
  const drafts = useHSEInspectionCount({ status: 'draft' });
  const pending = useHSEInspectionCount({ status: 'pending_approval' });
  const approved = useHSEInspectionCount({ status: 'approved' });
  const pages = Math.max(1, Math.ceil((count.data ?? 0) / inspectionPageSize));
  useEffect(() => {
    if (count.data !== undefined && page > pages) setPage(pages);
  }, [count.data, page, pages]);
  function reset() {
    setPage(1);
  }
  return (
    <section className="hse-page inspection-page" aria-labelledby="hse-page-title">
      <div className="inspection-heading">
        <div className="hse-page-heading">
          <span className="hse-page-kicker">{t('hse.title')}</span>
          <h1 id="hse-page-title">{t('inspectionUI.title')}</h1>
          <p>{t('inspectionUI.intro')}</p>
        </div>
        <Link className="inspection-button inspection-primary" to={inspectionNewPath()}>
          {t('inspectionUI.new')}
        </Link>
      </div>
      <div className="inspection-stats">
        {[
          [t('inspectionUI.total'), total],
          [t('inspectionUI.draftCount'), drafts],
          [t('inspectionUI.pendingCount'), pending],
          [t('inspectionUI.approvedCount'), approved],
        ].map(([label, query]) => (
          <div key={String(label)}>
            <span>{label as string}</span>
            <strong>{(query as typeof total).data ?? '—'}</strong>
          </div>
        ))}
      </div>
      {[total, drafts, pending, approved]
        .filter((query) => query.isError)
        .map((query, index) => (
          <ErrorMessage
            key={index}
            error={inspectionError(query.error, t)}
            retry={() => void query.refetch()}
          />
        ))}
      <div className="inspection-panel">
        <div className="inspection-filters">
          <label>
            {t('inspectionUI.search')}
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                reset();
              }}
            />
          </label>
          <label>
            {t('inspectionUI.status')}
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as InspectionStatus | '');
                reset();
              }}
            >
              <option value="">{t('inspectionUI.allStatuses')}</option>
              {(['draft', 'pending_approval', 'approved'] as const).map((value) => (
                <option key={value} value={value}>
                  {inspectionStatus(value, t)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('approvalUI.inspectorFilter')}
            <input
              type="text"
              dir="ltr"
              value={inspectorInput}
              onChange={(event) => {
                setInspectorInput(event.target.value);
                reset();
              }}
            />
          </label>
          <label>
            {t('inspectionUI.from')}
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                reset();
              }}
            />
          </label>
          <label>
            {t('inspectionUI.to')}
            <input
              type="date"
              min={dateFrom || undefined}
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                reset();
              }}
            />
          </label>
          <label>
            {t('inspectionUI.sort')}
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                reset();
              }}
            >
              <option value="newest">{t('inspectionUI.newest')}</option>
              <option value="oldest">{t('inspectionUI.oldest')}</option>
              <option value="status">{t('inspectionUI.statusSort')}</option>
            </select>
          </label>
        </div>
        {!validInspector && <p role="alert">{t('approvalUI.invalidInspector')}</p>}
        {chainId && (
          <div className="inspection-filter-chip">
            {t('inspectionUI.chainId')}: <span dir="ltr">{chainId}</span>
            <button
              type="button"
              onClick={() => {
                setParams({});
                reset();
              }}
            >
              {t('inspectionUI.cancel')}
            </button>
          </div>
        )}
        {validInspector && (list.isPending || count.isPending) && (
          <p className="inspection-state" role="status">
            {t('inspectionUI.loading')}
          </p>
        )}
        {(list.isFetching || count.isFetching) && !list.isPending && (
          <p className="inspection-refresh" role="status">
            {t('inspectionUI.refreshing')}
          </p>
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
        {validInspector && list.data && count.data !== undefined && (
          <>
            <p className="inspection-count">{t('inspectionUI.records', { count: count.data })}</p>
            {list.data.length === 0 ? (
              <div className="inspection-empty">
                {count.data === 0 && !search && !status && !dateFrom && !dateTo && !chainId
                  ? t('inspectionUI.empty')
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
                        <td data-label={t('inspectionUI.status')}>
                          <span className={`inspection-badge inspection-badge-${item.status}`}>
                            {inspectionStatus(item.status, t)}
                          </span>
                        </td>
                        <td data-label={t('chainUI.actions')}>
                          <div className="inspection-actions">
                            <Link to={inspectionPath(item.id)}>{t('chainUI.view')}</Link>
                            {item.status === 'draft' && item.inspector_id === user?.id && (
                              <Link to={inspectionEditPath(item.id)}>
                                {t('inspectionUI.continue')}
                              </Link>
                            )}
                          </div>
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
