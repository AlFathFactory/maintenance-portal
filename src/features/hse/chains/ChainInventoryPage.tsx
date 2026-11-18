import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Chain, ChainLegCount, ChainListFilter, ChainStatus } from '../../../domain/hse';
import { useAuth } from '../../auth/AuthProvider';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { formatDate } from '../../../shared/date';
import { useHSEChainCount, useHSEChainReplacements, useHSEChains } from '../queries';
import { chainError, chainPath, chainStatus, pageSize, replacementPath } from './chainPresentation';
import { ScrapChainDialog } from './ScrapChainDialog';
import './chains.css';

export function ChainInventoryPage() {
  return <ChainListPage archive={false} />;
}
export function ScrappedChainsPage() {
  return <ChainListPage archive />;
}

function ChainListPage({ archive }: { archive: boolean }) {
  const { t } = useTranslation();
  const { isHSEEngineer } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ChainStatus | ''>(archive ? 'scrapped' : 'active');
  const [legs, setLegs] = useState<ChainLegCount | ''>('');
  const [sortBy, setSortBy] = useState<ChainListFilter['sortBy']>('tag_no');
  const [ascending, setAscending] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [scrap, setScrap] = useState<Chain | null>(null);
  const filter: ChainListFilter = {
    status: archive ? 'scrapped' : status || undefined,
    tagNo: search.trim() || undefined,
    legs: legs || undefined,
    scrappedFrom: archive ? from || undefined : undefined,
    scrappedTo: archive ? to || undefined : undefined,
    sortBy,
    ascending,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
  const list = useHSEChains(filter);
  const count = useHSEChainCount({
    status: filter.status,
    tagNo: filter.tagNo,
    legs: filter.legs,
    scrappedFrom: filter.scrappedFrom,
    scrappedTo: filter.scrappedTo,
  });
  const activeCount = useHSEChainCount({ status: 'active' });
  const scrappedCount = useHSEChainCount({ status: 'scrapped' });
  const ids = archive ? (list.data ?? []).map((chain) => chain.id) : [];
  const replacements = useHSEChainReplacements(ids);
  const successors = new Map(
    (replacements.data ?? []).map((chain) => [chain.replaces_chain_id, chain]),
  );
  const pages = Math.max(1, Math.ceil((count.data ?? 0) / pageSize));
  useEffect(() => {
    if (count.data !== undefined && page > pages) setPage(pages);
  }, [count.data, page, pages]);
  function reset() {
    setPage(1);
  }
  return (
    <section className="hse-page chain-page" aria-labelledby="hse-page-title">
      <div className="chain-heading">
        <div className="hse-page-heading">
          <span className="hse-page-kicker">{t('hse.title')}</span>
          <h1 id="hse-page-title">{t(archive ? 'chainUI.archive' : 'chainUI.inventory')}</h1>
          <p>{t(archive ? 'chainUI.archiveIntro' : 'chainUI.inventoryIntro')}</p>
        </div>
        {isHSEEngineer && !archive && (
          <Link className="chain-button chain-button-primary" to="/hse/chains/new">
            {t('chainUI.add')}
          </Link>
        )}
      </div>
      {!archive && (
        <div className="chain-summary" aria-label={t('chainUI.total')}>
          <div>
            <span>{t('chainUI.total')}</span>
            <strong>
              {activeCount.data !== undefined && scrappedCount.data !== undefined
                ? activeCount.data + scrappedCount.data
                : '—'}
            </strong>
          </div>
          <div>
            <span>{t('chainUI.activeCount')}</span>
            <strong>{activeCount.data ?? '—'}</strong>
          </div>
          <div>
            <span>{t('chainUI.scrappedCount')}</span>
            <strong>{scrappedCount.data ?? '—'}</strong>
          </div>
        </div>
      )}
      {!archive && activeCount.isError && (
        <ErrorMessage
          error={chainError(activeCount.error, t)}
          retry={() => void activeCount.refetch()}
        />
      )}
      {!archive && scrappedCount.isError && (
        <ErrorMessage
          error={chainError(scrappedCount.error, t)}
          retry={() => void scrappedCount.refetch()}
        />
      )}
      <div className="chain-panel">
        <div className="chain-toolbar">
          <label>
            {t('chainUI.search')}
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                reset();
              }}
            />
          </label>
          {!archive && (
            <label>
              {t('chainUI.status')}
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ChainStatus | '');
                  reset();
                }}
              >
                <option value="">{t('chainUI.all')}</option>
                <option value="active">{t('chainUI.active')}</option>
                <option value="scrapped">{t('chainUI.scrapped')}</option>
              </select>
            </label>
          )}
          <label>
            {t('chainUI.legs')}
            <select
              value={legs}
              onChange={(event) => {
                setLegs(event.target.value ? (Number(event.target.value) as ChainLegCount) : '');
                reset();
              }}
            >
              <option value="">{t('chainUI.anyLegs')}</option>
              {[1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          {archive && (
            <>
              <label>
                {t('chainUI.from')}
                <input
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    reset();
                  }}
                />
              </label>
              <label>
                {t('chainUI.to')}
                <input
                  type="date"
                  min={from || undefined}
                  value={to}
                  onChange={(event) => {
                    setTo(event.target.value);
                    reset();
                  }}
                />
              </label>
            </>
          )}
          <label>
            {t('chainUI.sort')}
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as ChainListFilter['sortBy']);
                reset();
              }}
            >
              <option value="tag_no">{t('chainUI.sortTag')}</option>
              <option value="start_working_date">{t('chainUI.sortWorking')}</option>
              <option value="created_at">{t('chainUI.sortCreated')}</option>
              {archive && <option value="scrapping_date">{t('chainUI.sortScrapped')}</option>}
            </select>
          </label>
          <label>
            {t('chainUI.ascending')}
            <select
              value={ascending ? 'asc' : 'desc'}
              onChange={(event) => {
                setAscending(event.target.value === 'asc');
                reset();
              }}
            >
              <option value="asc">{t('chainUI.ascending')}</option>
              <option value="desc">{t('chainUI.descending')}</option>
            </select>
          </label>
        </div>
        {(list.isPending ||
          count.isPending ||
          (archive && replacements.isPending && ids.length > 0)) && (
          <p role="status" className="chain-state">
            {t('chainUI.loading')}
          </p>
        )}
        {list.isError && (
          <ErrorMessage error={chainError(list.error, t)} retry={() => void list.refetch()} />
        )}
        {count.isError && (
          <ErrorMessage error={chainError(count.error, t)} retry={() => void count.refetch()} />
        )}
        {archive && replacements.isError && (
          <ErrorMessage
            error={chainError(replacements.error, t)}
            retry={() => void replacements.refetch()}
          />
        )}
        {list.data &&
          count.data !== undefined &&
          (!archive || !ids.length || replacements.data) && (
            <>
              <div className="chain-table-caption">
                {t('chainUI.records', { count: count.data })}
              </div>
              {list.data.length === 0 ? (
                <div className="chain-empty">
                  {count.data === 0 && !search && !legs && !from && !to
                    ? t('chainUI.empty')
                    : t('chainUI.noResults')}
                </div>
              ) : (
                <div className="chain-table-wrap">
                  <table className="chain-table">
                    <thead>
                      <tr>
                        <th>{t('chainUI.tag')}</th>
                        <th>{t('chainUI.legs')}</th>
                        <th>{t('chainUI.wll')}</th>
                        <th>{t('chainUI.length')}</th>
                        <th>{t('chainUI.startDate')}</th>
                        {archive ? (
                          <>
                            <th>{t('chainUI.scrapDate')}</th>
                            <th>{t('chainUI.scrapReason')}</th>
                            <th>{t('chainUI.replacement')}</th>
                          </>
                        ) : (
                          <th>{t('chainUI.status')}</th>
                        )}
                        <th>{t('chainUI.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.data.map((chain) => {
                        const successor = successors.get(chain.id);
                        return (
                          <tr key={chain.id}>
                            <td data-label={t('chainUI.tag')}>
                              <strong dir="auto">{chain.tag_no}</strong>
                            </td>
                            <td data-label={t('chainUI.legs')}>{chain.number_of_legs}</td>
                            <td data-label={t('chainUI.wll')}>{chain.working_load_limit_tons}</td>
                            <td data-label={t('chainUI.length')}>{chain.length_m}</td>
                            <td data-label={t('chainUI.startDate')}>
                              {formatDate(chain.start_working_date)}
                            </td>
                            {archive ? (
                              <>
                                <td data-label={t('chainUI.scrapDate')}>
                                  {formatDate(chain.scrapping_date)}
                                </td>
                                <td data-label={t('chainUI.scrapReason')}>
                                  {chain.scrapping_reason || '—'}
                                </td>
                                <td data-label={t('chainUI.replacement')}>
                                  {successor ? (
                                    <Link to={chainPath(successor.id)}>
                                      {t('chainUI.replaced')}
                                    </Link>
                                  ) : (
                                    t('chainUI.notReplaced')
                                  )}
                                </td>
                              </>
                            ) : (
                              <td data-label={t('chainUI.status')}>
                                <span className={`chain-status chain-status-${chain.status}`}>
                                  {chainStatus(chain, t)}
                                </span>
                              </td>
                            )}
                            <td data-label={t('chainUI.actions')}>
                              <div className="chain-row-actions">
                                <Link to={chainPath(chain.id)}>{t('chainUI.view')}</Link>
                                {isHSEEngineer && chain.status === 'active' && (
                                  <>
                                    <Link to={`${chainPath(chain.id)}?edit=1`}>
                                      {t('chainUI.edit')}
                                    </Link>
                                    <button type="button" onClick={() => setScrap(chain)}>
                                      {t('chainUI.scrap')}
                                    </button>
                                  </>
                                )}
                                {isHSEEngineer && archive && !successor && (
                                  <Link to={replacementPath(chain.id)}>{t('chainUI.replace')}</Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="chain-pagination">
                <span>{t('chainUI.page', { page, pages })}</span>
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {t('chainUI.previous')}
                </button>
                <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                  {t('chainUI.next')}
                </button>
              </div>
            </>
          )}
      </div>
      {scrap && <ScrapChainDialog chain={scrap} onClose={() => setScrap(null)} />}
    </section>
  );
}
