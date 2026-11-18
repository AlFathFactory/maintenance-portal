import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { HSEPeriod, HSETrendGrouping } from '../../../domain/hse';
import { formatDate } from '../../../shared/date';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { useAuth } from '../../auth/AuthProvider';
import { chainPath } from '../chains/chainPresentation';
import {
  inspectionError,
  inspectionPath,
  inspectionStatus,
} from '../inspections/inspectionPresentation';
import {
  useHSEChainCount,
  useHSEChains,
  useHSEInspectionCount,
  useHSEInspectionReportingData,
  useHSEInspections,
  hseKeys,
} from '../queries';
import {
  cairoToday,
  formatReportingTimestamp,
  reportingTimeZone,
  resolvePeriod,
} from '../analytics/dateRanges';
import { ReportingPeriodControl } from '../analytics/ReportingPeriodControl';
import { buildReportingView } from '../analytics/reportingModel';
import { TrendChart } from '../analytics/TrendChart';
import './dashboard.css';

function Metric({
  label,
  value,
  description,
  to,
}: {
  label: string;
  value: number | undefined;
  description: string;
  to?: string;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      <small>{description}</small>
    </>
  );
  return to ? (
    <Link className="hse-metric" to={to}>
      {content}
    </Link>
  ) : (
    <div className="hse-metric">{content}</div>
  );
}

export function HSEDashboardPage() {
  const { t, i18n } = useTranslation();
  const { isHSEEngineer } = useAuth();
  const client = useQueryClient();
  const [period, setPeriod] = useState<HSEPeriod>(() => resolvePeriod('last30', {}, cairoToday())!);
  const [grouping, setGrouping] = useState<HSETrendGrouping>('week');
  const inspectionFilter = { dateFrom: period.from, dateTo: period.to };
  const chains = useHSEChainCount({});
  const active = useHSEChainCount({ status: 'active' });
  const scrapped = useHSEChainCount({ status: 'scrapped' });
  const scrappedPeriod = useHSEChainCount({
    status: 'scrapped',
    scrappedFrom: period.from,
    scrappedTo: period.to,
  });
  const inspections = useHSEInspectionCount(inspectionFilter);
  const drafts = useHSEInspectionCount({ ...inspectionFilter, status: 'draft' });
  const pending = useHSEInspectionCount({ ...inspectionFilter, status: 'pending_approval' });
  const pendingAllTime = useHSEInspectionCount({ status: 'pending_approval' }, isHSEEngineer);
  const approved = useHSEInspectionCount({ ...inspectionFilter, status: 'approved' });
  const analytics = useHSEInspectionReportingData(period);
  const recent = useHSEInspections({
    ...inspectionFilter,
    sortBy: 'inspection_date',
    ascending: false,
    limit: 5,
  });
  const pendingRecent = useHSEInspections(
    {
      status: 'pending_approval',
      sortBy: 'submitted_at',
      ascending: false,
      limit: 5,
    },
    isHSEEngineer,
  );
  const registered = useHSEChains({ sortBy: 'created_at', ascending: false, limit: 5 });
  const retired = useHSEChains({
    status: 'scrapped',
    sortBy: 'scrapping_date',
    ascending: false,
    limit: 5,
  });
  const view = analytics.data ? buildReportingView(analytics.data, grouping) : null;
  const statusRows = [
    ['draft', drafts.data],
    ['pending_approval', pending.data],
    ['approved', approved.data],
  ] as const;
  const statusMax = Math.max(1, ...statusRows.map(([, value]) => value ?? 0));
  const errors = [
    chains,
    active,
    scrapped,
    scrappedPeriod,
    inspections,
    drafts,
    pending,
    pendingAllTime,
    approved,
    analytics,
    recent,
    pendingRecent,
    registered,
    retired,
  ].filter((query) => query.isError);
  return (
    <section className="hse-page hse-dashboard" aria-labelledby="hse-page-title">
      <div className="hse-dashboard-heading">
        <div className="hse-page-heading">
          <span className="hse-page-kicker">{t('hse.title')}</span>
          <h1 id="hse-page-title">{t('reportUI.dashboard')}</h1>
          <p>{t('reportUI.dashboardIntro')}</p>
        </div>
        <button
          type="button"
          className="inspection-button"
          onClick={() => void client.invalidateQueries({ queryKey: hseKeys.all })}
        >
          {t('approvalUI.refresh')}
        </button>
      </div>
      <ReportingPeriodControl period={period} onChange={setPeriod} />
      <p className="hse-report-note">
        {t('reportUI.timezone', { zone: reportingTimeZone })} · {t('reportUI.snapshotNote')}
      </p>
      {errors.map((query, index) => (
        <ErrorMessage
          key={index}
          error={inspectionError(query.error, t)}
          retry={() => void query.refetch()}
        />
      ))}
      <div className="hse-dashboard-kpis" aria-label={t('reportUI.inventorySnapshot')}>
        <Metric
          label={t('reportUI.totalChains')}
          value={chains.data}
          description={t('reportUI.snapshot')}
          to="/hse/chains"
        />
        <Metric
          label={t('reportUI.activeChains')}
          value={active.data}
          description={t('reportUI.snapshot')}
          to="/hse/chains"
        />
        <Metric
          label={t('reportUI.scrappedChains')}
          value={scrapped.data}
          description={t('reportUI.snapshot')}
          to="/hse/scrapped"
        />
        <Metric
          label={t('reportUI.scrappedPeriod')}
          value={scrappedPeriod.data}
          description={t('reportUI.periodMetric')}
          to="/hse/scrapped"
        />
        <Metric
          label={t('reportUI.totalInspections')}
          value={inspections.data}
          description={t('reportUI.periodMetric')}
          to="/hse/inspections"
        />
        <Metric
          label={t('inspectionUI.draftCount')}
          value={drafts.data}
          description={t('reportUI.periodMetric')}
          to="/hse/inspections"
        />
        <Metric
          label={t('inspectionUI.pendingCount')}
          value={pending.data}
          description={t('reportUI.periodMetric')}
          to={isHSEEngineer ? '/hse/approvals' : undefined}
        />
        <Metric
          label={t('inspectionUI.approvedCount')}
          value={approved.data}
          description={t('reportUI.periodMetric')}
          to="/hse/inspections"
        />
        <Metric
          label={t('reportUI.faultyInspections')}
          value={view?.findings?.faultyInspections}
          description={view?.findings ? t('reportUI.periodMetric') : t('reportUI.unavailable')}
          to={view?.findings ? '/hse/inspections' : undefined}
        />
      </div>
      <div className="hse-dashboard-grid">
        <section className="inspection-panel">
          <div className="hse-section-head">
            <h2>{t('reportUI.activity')}</h2>
            <label>
              {t('reportUI.groupBy')}
              <select
                value={grouping}
                onChange={(event) => setGrouping(event.target.value as HSETrendGrouping)}
              >
                <option value="day">{t('reportUI.daily')}</option>
                <option value="week">{t('reportUI.weekly')}</option>
                <option value="month">{t('reportUI.monthly')}</option>
              </select>
            </label>
          </div>
          {analytics.isError ? (
            <p>{t('reportUI.unavailable')}</p>
          ) : analytics.isPending ? (
            <p role="status">{t('inspectionUI.loading')}</p>
          ) : view?.trend ? (
            <TrendChart
              points={view.trend}
              metric="inspections"
              title={t('reportUI.inspectionsTrend')}
            />
          ) : (
            <p>{t('reportUI.limitNotice', { limit: view?.limit ?? 500 })}</p>
          )}
        </section>
        <section className="inspection-panel">
          <h2>{t('reportUI.statusDistribution')}</h2>
          <div className="hse-distribution">
            {statusRows.map(([status, value]) => (
              <div key={status}>
                <span>{inspectionStatus(status, t)}</span>
                <div className="hse-distribution-track">
                  <div style={{ width: `${((value ?? 0) / statusMax) * 100}%` }} />
                </div>
                <strong>{value ?? '—'}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="inspection-panel">
          <h2>{t('reportUI.findingsDistribution')}</h2>
          {view?.findings ? (
            <>
              <div className="hse-findings-grid">
                <Metric
                  label="OK"
                  value={view.findings.OK}
                  description={t('reportUI.checkpoints')}
                />
                <Metric
                  label="Faulty"
                  value={view.findings.Faulty}
                  description={t('reportUI.checkpoints')}
                />
                <Metric
                  label="N/A"
                  value={view.findings['N/A']}
                  description={t('reportUI.checkpoints')}
                />
                <Metric
                  label={t('inspectionUI.unanswered')}
                  value={view.findings.unanswered}
                  description={t('reportUI.checkpoints')}
                />
              </div>
              <p className="hse-report-note">
                {t('reportUI.faultyDistinct', { count: view.findings.faultyInspections })}
              </p>
            </>
          ) : (
            <p>
              {analytics.isError
                ? t('reportUI.unavailable')
                : analytics.isPending
                  ? t('inspectionUI.loading')
                  : t('reportUI.findingsUnavailable', { limit: view?.limit ?? 500 })}
            </p>
          )}
        </section>
        <section className="inspection-panel">
          <h2>{t('reportUI.faultyTrend')}</h2>
          {view?.trend && view.faultyInspectionIds ? (
            <TrendChart
              points={view.trend}
              metric="faultyCheckpoints"
              title={t('reportUI.faultyCheckpointsTrend')}
            />
          ) : (
            <p>
              {analytics.isError
                ? t('reportUI.unavailable')
                : analytics.isPending
                  ? t('inspectionUI.loading')
                  : t('reportUI.findingsUnavailable', { limit: view?.limit ?? 500 })}
            </p>
          )}
        </section>
      </div>
      <div className="hse-dashboard-grid">
        <section className="inspection-panel">
          <div className="hse-section-head">
            <h2>{t('reportUI.recentInspections')}</h2>
            <Link to="/hse/inspections">{t('reportUI.viewAll')}</Link>
          </div>
          {recent.isError ? null : recent.isPending ? (
            <p role="status">{t('inspectionUI.loading')}</p>
          ) : recent.data?.length ? (
            <ul className="hse-activity-list">
              {recent.data.map((row) => (
                <li key={row.id}>
                  <Link to={inspectionPath(row.id)}>
                    <strong dir="auto">{row.chain_tag_snapshot}</strong>
                    <span>
                      {formatDate(row.inspection_date)} · {inspectionStatus(row.status, t)}
                    </span>
                    <small dir="ltr">{row.inspector_id.slice(0, 8)}</small>
                    {view?.faultyInspectionIds?.has(row.id) && <em>{t('approvalUI.faulty')}</em>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t('inspectionUI.empty')}</p>
          )}
        </section>
        {isHSEEngineer && (
          <section className="inspection-panel">
            <div className="hse-section-head">
              <h2>{t('approvalUI.title')}</h2>
              <Link to="/hse/approvals">{t('reportUI.viewAll')}</Link>
            </div>
            <p>
              {pendingAllTime.data !== undefined
                ? t('reportUI.awaitingAllTime', { count: pendingAllTime.data })
                : '—'}
            </p>
            {pendingRecent.isError ? null : pendingRecent.isPending ? (
              <p role="status">{t('inspectionUI.loading')}</p>
            ) : pendingRecent.data?.length ? (
              <ul className="hse-activity-list">
                {pendingRecent.data.map((row) => (
                  <li key={row.id}>
                    <Link to={`/hse/approvals/${row.id}`}>
                      <strong dir="auto">{row.chain_tag_snapshot}</strong>
                      <span>{formatDate(row.inspection_date)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t('approvalUI.empty')}</p>
            )}
          </section>
        )}
        <section className="inspection-panel">
          <div className="hse-section-head">
            <h2>{t('reportUI.recentRegistered')}</h2>
            <Link to="/hse/chains">{t('reportUI.viewAll')}</Link>
          </div>
          {registered.isError ? null : registered.isPending ? (
            <p role="status">{t('inspectionUI.loading')}</p>
          ) : registered.data?.length ? (
            <ul className="hse-activity-list">
              {registered.data.map((row) => (
                <li key={row.id}>
                  <Link to={chainPath(row.id)}>
                    <strong dir="auto">{row.tag_no}</strong>
                    <span dir="ltr">{row.id.slice(0, 8)}</span>
                    <span>{formatReportingTimestamp(row.created_at, i18n.language)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t('reportUI.noChains')}</p>
          )}
        </section>
        <section className="inspection-panel">
          <div className="hse-section-head">
            <h2>{t('reportUI.recentScrapped')}</h2>
            <Link to="/hse/scrapped">{t('reportUI.viewAll')}</Link>
          </div>
          {retired.isError ? null : retired.isPending ? (
            <p role="status">{t('inspectionUI.loading')}</p>
          ) : retired.data?.length ? (
            <ul className="hse-activity-list">
              {retired.data.map((row) => (
                <li key={row.id}>
                  <Link to={chainPath(row.id)}>
                    <strong dir="auto">{row.tag_no}</strong>
                    <span>{row.scrapping_date ? formatDate(row.scrapping_date) : '—'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t('reportUI.noChains')}</p>
          )}
        </section>
      </div>
      <p className="hse-report-note">{t('approvalUI.administrativeNote')}</p>
      <Link to="/hse/reports" className="inspection-button inspection-primary">
        {t('reportUI.openReports')}
      </Link>
    </section>
  );
}
