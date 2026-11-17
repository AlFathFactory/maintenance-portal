import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type {
  ChainListFilter,
  HSEPeriod,
  InspectionListFilter,
  InspectionStatus,
} from '../../../domain/hse';
import { formatDate } from '../../../shared/date';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { isUUID } from '../../../services/hse/validation';
import { chainPath } from '../chains/chainPresentation';
import { cairoToday, reportingTimeZone, resolvePeriod } from '../analytics/dateRanges';
import { ReportingPeriodControl } from '../analytics/ReportingPeriodControl';
import { buildReportingView } from '../analytics/reportingModel';
import {
  useHSEChainCount,
  useHSEChainInspectionCounts,
  useHSEChains,
  useHSEInspectionCount,
  useHSEInspectionReportingData,
  useHSEInspections,
} from '../queries';
import {
  inspectionError,
  inspectionPath,
  inspectionStatus,
} from '../inspections/inspectionPresentation';
import { downloadCsv } from './exportCsv';
import '../dashboard/dashboard.css';
import './reports.css';

type ReportType = 'inspections' | 'active' | 'scrapped' | 'replacements' | 'findings';
const pageSize = 20;

export function HSEReportsPage() {
  const { t } = useTranslation();
  const [report, setReport] = useState<ReportType>('inspections');
  const [period, setPeriod] = useState<HSEPeriod>(() => resolvePeriod('last30', {}, cairoToday())!);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InspectionStatus | ''>('');
  const [inspectorInput, setInspectorInput] = useState('');
  const [page, setPage] = useState(1);
  const isInspection = report === 'inspections';
  const isFindings = report === 'findings';
  const isChain = !isInspection && !isFindings;
  const validInspector = !inspectorInput.trim() || isUUID(inspectorInput.trim());
  const chainFilter: ChainListFilter = {
    status: report === 'active' ? 'active' : report === 'scrapped' ? 'scrapped' : undefined,
    replacedOnly: report === 'replacements',
    chainId: isChain && isUUID(search.trim()) ? search.trim() : undefined,
    tagNo: isChain && !isUUID(search.trim()) ? search.trim() || undefined : undefined,
    scrappedFrom: report === 'scrapped' ? period.from : undefined,
    scrappedTo: report === 'scrapped' ? period.to : undefined,
    sortBy: report === 'scrapped' ? 'scrapping_date' : 'tag_no',
    ascending: report !== 'scrapped',
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
  const inspectionFilter: InspectionListFilter = {
    search: isInspection ? search.trim() || undefined : undefined,
    status: status || undefined,
    dateFrom: period.from,
    dateTo: period.to,
    inspectorId: isUUID(inspectorInput.trim()) ? inspectorInput.trim() : undefined,
    sortBy: 'inspection_date',
    ascending: false,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
  const chainList = useHSEChains(chainFilter, isChain);
  const chainCount = useHSEChainCount(chainFilter, isChain);
  const inspectionList = useHSEInspections(inspectionFilter, isInspection && validInspector);
  const inspectionCount = useHSEInspectionCount(inspectionFilter, isInspection && validInspector);
  const findingsData = useHSEInspectionReportingData(period, isFindings);
  const chainIds = isChain ? (chainList.data ?? []).map((row) => row.id) : [];
  const chainInspections = useHSEChainInspectionCounts(chainIds);
  const findings = findingsData.data
    ? buildReportingView(findingsData.data, 'month').findings
    : null;
  const total = isInspection
    ? validInspector
      ? inspectionCount.data
      : undefined
    : isChain
      ? chainCount.data
      : findingsData.data?.total;
  const pages = Math.max(1, Math.ceil((total ?? 0) / pageSize));
  useEffect(() => {
    if (total !== undefined && page > pages) setPage(pages);
  }, [total, page, pages]);
  function changeReport(value: ReportType) {
    setReport(value);
    setPage(1);
    setSearch('');
    setStatus('');
    setInspectorInput('');
  }
  function exportPage() {
    if (isInspection && validInspector && inspectionList.data) {
      downloadCsv(
        'hse-inspections-visible-page.csv',
        [
          'Inspection UUID',
          'Physical Chain UUID',
          'Chain tag at inspection',
          'Inspection date',
          'Inspector UUID',
          'Checklist version',
          'Status',
          'Submitted at',
          'Approved by UUID',
          'Approved at',
        ],
        inspectionList.data.map((row) => [
          row.id,
          row.chain_id,
          row.chain_tag_snapshot,
          row.inspection_date,
          row.inspector_id,
          row.template_version,
          row.status,
          row.submitted_at,
          row.approved_by,
          row.approved_at,
        ]),
      );
    } else if (isChain && chainList.data) {
      downloadCsv(
        `hse-${report}-chains-visible-page.csv`,
        [
          'Physical Chain UUID',
          'Tag number',
          'Legs',
          'Working load limit (tons)',
          'Length (m)',
          'Start working date',
          'Current status',
          'Scrapping date',
          'Scrapping reason',
          'Replaces physical chain UUID',
          'All-time inspection count',
        ],
        chainList.data.map((row) => [
          row.id,
          row.tag_no,
          row.number_of_legs,
          row.working_load_limit_tons,
          row.length_m,
          row.start_working_date,
          row.status,
          row.scrapping_date,
          row.scrapping_reason,
          row.replaces_chain_id,
          chainInspections.data?.[row.id] ?? 'Unavailable',
        ]),
      );
    } else if (isFindings && findings) {
      downloadCsv(
        'hse-findings-period-summary.csv',
        ['Metric', 'Count', 'Period start', 'Period end', 'Time zone'],
        [
          ['OK checkpoints', findings.OK, period.from ?? '', period.to ?? '', reportingTimeZone],
          [
            'Faulty checkpoints',
            findings.Faulty,
            period.from ?? '',
            period.to ?? '',
            reportingTimeZone,
          ],
          [
            'N/A checkpoints',
            findings['N/A'],
            period.from ?? '',
            period.to ?? '',
            reportingTimeZone,
          ],
          [
            'Unanswered checkpoints',
            findings.unanswered,
            period.from ?? '',
            period.to ?? '',
            reportingTimeZone,
          ],
          [
            'Distinct inspections with Faulty findings',
            findings.faultyInspections,
            period.from ?? '',
            period.to ?? '',
            reportingTimeZone,
          ],
        ],
      );
    }
  }
  const errors = [
    ...(isChain ? [chainList, chainCount, chainInspections] : []),
    ...(isInspection && validInspector ? [inspectionList, inspectionCount] : []),
    ...(isFindings ? [findingsData] : []),
  ].filter((query) => query.isError);
  return (
    <section className="hse-page hse-reports" aria-labelledby="hse-page-title">
      <div className="hse-page-heading">
        <span className="hse-page-kicker">{t('hse.title')}</span>
        <h1 id="hse-page-title">{t('reportUI.reports')}</h1>
        <p>{t('reportUI.reportsIntro')}</p>
      </div>
      <div className="inspection-panel hse-report-toolbar">
        <label>
          {t('reportUI.reportType')}
          <select
            value={report}
            onChange={(event) => changeReport(event.target.value as ReportType)}
          >
            {(['inspections', 'active', 'scrapped', 'replacements', 'findings'] as const).map(
              (value) => (
                <option key={value} value={value}>
                  {t(`reportUI.type_${value}`)}
                </option>
              ),
            )}
          </select>
        </label>
        <ReportingPeriodControl
          period={period}
          onChange={(value) => {
            setPeriod(value);
            setPage(1);
          }}
        />
        <p className="hse-report-note">
          {report === 'active' || report === 'replacements'
            ? t('reportUI.snapshotIgnoresPeriod')
            : t('reportUI.periodMetric')}{' '}
          · {t('reportUI.timezone', { zone: reportingTimeZone })}
        </p>
      </div>
      {!isFindings && (
        <div className="inspection-panel hse-report-filters">
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
          {isInspection && (
            <>
              <label>
                {t('inspectionUI.status')}
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as InspectionStatus | '');
                    setPage(1);
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
                  value={inspectorInput}
                  onChange={(event) => {
                    setInspectorInput(event.target.value);
                    setPage(1);
                  }}
                  dir="ltr"
                />
              </label>
              {inspectorInput.trim() && !isUUID(inspectorInput.trim()) && (
                <p role="alert">{t('approvalUI.invalidInspector')}</p>
              )}
            </>
          )}
        </div>
      )}
      {errors.map((query, index) => (
        <ErrorMessage
          key={index}
          error={inspectionError(query.error, t)}
          retry={() => void query.refetch()}
        />
      ))}
      <div className="inspection-panel">
        <div className="hse-section-head">
          <div>
            <h2>{t(`reportUI.type_${report}`)}</h2>
            <p>{total !== undefined ? t('inspectionUI.records', { count: total }) : '—'}</p>
          </div>
          <button
            className="inspection-button"
            type="button"
            disabled={
              isFindings
                ? !findings || findingsData.isError
                : isInspection
                  ? !validInspector || !inspectionList.data || inspectionList.isError
                  : !chainList.data || chainList.isError
            }
            onClick={exportPage}
          >
            {isFindings ? t('reportUI.exportSummary') : t('reportUI.exportPage')}
          </button>
        </div>
        {isInspection &&
          !inspectionList.isError &&
          (validInspector ? (
            inspectionList.isPending ? (
              <p role="status">{t('inspectionUI.loading')}</p>
            ) : inspectionList.data?.length ? (
              <div className="inspection-table-wrap">
                <table className="inspection-table">
                  <thead>
                    <tr>
                      <th>{t('inspectionUI.chainTag')}</th>
                      <th>{t('inspectionUI.chainId')}</th>
                      <th>{t('inspectionUI.date')}</th>
                      <th>{t('inspectionUI.status')}</th>
                      <th>{t('approvalUI.findings')}</th>
                      <th>{t('chainUI.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionList.data.map((row) => (
                      <tr key={row.id}>
                        <td data-label={t('inspectionUI.chainTag')}>
                          <strong dir="auto">{row.chain_tag_snapshot}</strong>
                        </td>
                        <td data-label={t('inspectionUI.chainId')}>
                          <span dir="ltr">{row.chain_id.slice(0, 8)}</span>
                        </td>
                        <td data-label={t('inspectionUI.date')}>
                          {formatDate(row.inspection_date)}
                        </td>
                        <td data-label={t('inspectionUI.status')}>
                          {inspectionStatus(row.status, t)}
                        </td>
                        <td data-label={t('approvalUI.findings')}>
                          {t('reportUI.openForFindings')}
                        </td>
                        <td data-label={t('chainUI.actions')}>
                          <Link to={inspectionPath(row.id)}>{t('chainUI.view')}</Link> ·{' '}
                          <Link to={chainPath(row.chain_id)}>{t('inspectionUI.chain')}</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>{t('inspectionUI.noResults')}</p>
            )
          ) : (
            <p role="alert">{t('approvalUI.invalidInspector')}</p>
          ))}
        {isChain &&
          !chainList.isError &&
          (chainList.isPending ? (
            <p role="status">{t('inspectionUI.loading')}</p>
          ) : chainList.data?.length ? (
            <div className="inspection-table-wrap">
              <table className="inspection-table">
                <thead>
                  <tr>
                    <th>{t('inspectionUI.chainTag')}</th>
                    <th>{t('inspectionUI.chainId')}</th>
                    <th>{t('chainUI.legs')}</th>
                    <th>{t('chainUI.wll')}</th>
                    <th>{t('chainUI.length')}</th>
                    <th>{t('chainUI.startDate')}</th>
                    <th>{t('chainUI.status')}</th>
                    {report !== 'active' && <th>{t('chainUI.scrapDate')}</th>}
                    {report !== 'active' && <th>{t('chainUI.scrapReason')}</th>}
                    {report === 'replacements' && <th>{t('reportUI.predecessor')}</th>}
                    <th>{t('reportUI.inspectionCount')}</th>
                    <th>{t('chainUI.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chainList.data.map((row) => (
                    <tr key={row.id}>
                      <td data-label={t('inspectionUI.chainTag')}>
                        <strong dir="auto">{row.tag_no}</strong>
                      </td>
                      <td data-label={t('inspectionUI.chainId')}>
                        <span dir="ltr">{row.id.slice(0, 8)}</span>
                      </td>
                      <td data-label={t('chainUI.legs')}>{row.number_of_legs}</td>
                      <td data-label={t('chainUI.wll')}>{row.working_load_limit_tons}</td>
                      <td data-label={t('chainUI.length')}>{row.length_m}</td>
                      <td data-label={t('chainUI.startDate')}>
                        {formatDate(row.start_working_date)}
                      </td>
                      <td data-label={t('chainUI.status')}>
                        {t(row.status === 'active' ? 'chainUI.active' : 'chainUI.scrapped')}
                      </td>
                      {report !== 'active' && (
                        <td data-label={t('chainUI.scrapDate')}>
                          {row.scrapping_date ? formatDate(row.scrapping_date) : '—'}
                        </td>
                      )}
                      {report !== 'active' && (
                        <td data-label={t('chainUI.scrapReason')}>{row.scrapping_reason || '—'}</td>
                      )}
                      {report === 'replacements' && (
                        <td data-label={t('reportUI.predecessor')}>
                          {row.replaces_chain_id ? (
                            <Link to={chainPath(row.replaces_chain_id)} dir="ltr">
                              {row.replaces_chain_id.slice(0, 8)}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td data-label={t('reportUI.inspectionCount')}>
                        {chainInspections.data?.[row.id] ?? '—'}
                      </td>
                      <td data-label={t('chainUI.actions')}>
                        <Link to={chainPath(row.id)}>{t('chainUI.view')}</Link>
                        {row.replaces_chain_id && (
                          <>
                            {' '}
                            ·{' '}
                            <Link to={chainPath(row.replaces_chain_id)}>
                              {t('reportUI.predecessor')}
                            </Link>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>{t('reportUI.noChains')}</p>
          ))}
        {isFindings &&
          !findingsData.isError &&
          (findingsData.isPending ? (
            <p role="status">{t('inspectionUI.loading')}</p>
          ) : findings ? (
            <div className="hse-report-findings">
              <p>{t('reportUI.findingsPopulation', { count: findingsData.data?.total ?? 0 })}</p>
              <div className="hse-findings-grid">
                <div>
                  <strong>{findings.OK}</strong>
                  <span>OK</span>
                </div>
                <div>
                  <strong>{findings.Faulty}</strong>
                  <span>Faulty</span>
                </div>
                <div>
                  <strong>{findings['N/A']}</strong>
                  <span>N/A</span>
                </div>
                <div>
                  <strong>{findings.unanswered}</strong>
                  <span>{t('inspectionUI.unanswered')}</span>
                </div>
              </div>
              <p>{t('reportUI.faultyDistinct', { count: findings.faultyInspections })}</p>
              <Link to="/hse/inspections">{t('reportUI.openHistory')}</Link>
            </div>
          ) : (
            <p>
              {t('reportUI.findingsUnavailable', {
                limit: findingsData.data?.inspectionLimit ?? 500,
              })}
            </p>
          ))}
        {!isFindings && total !== undefined && (
          <div className="inspection-pagination">
            <span>{t('inspectionUI.page', { page, pages })}</span>
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t('inspectionUI.previous')}
            </button>
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              {t('inspectionUI.next')}
            </button>
          </div>
        )}
      </div>
      <p className="hse-report-note">
        {t('reportUI.exportScope')} {t('approvalUI.administrativeNote')}
      </p>
    </section>
  );
}
