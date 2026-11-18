import type {
  InspectionReportingData,
  HSETrendGrouping,
  InspectionStatus,
} from '../../../domain/hse';
import { trendBucket } from './dateRanges';

export interface TrendPoint {
  bucket: string;
  inspections: number;
  faultyCheckpoints: number;
  faultyInspections: number;
}
export interface FindingsCounts {
  OK: number;
  Faulty: number;
  'N/A': number;
  unanswered: number;
  faultyInspections: number;
}
export interface ReportingView {
  total: number;
  limit: number;
  trend: TrendPoint[] | null;
  status: Record<InspectionStatus, number> | null;
  findings: FindingsCounts | null;
  faultyInspectionIds: Set<string> | null;
}

export function buildReportingView(
  data: InspectionReportingData,
  grouping: HSETrendGrouping,
): ReportingView {
  const empty = {
    total: data.total,
    limit: data.inspectionLimit,
    trend: null,
    status: null,
    findings: null,
    faultyInspectionIds: null,
  };
  if (!data.inspections) return empty;
  const status: Record<InspectionStatus, number> = { draft: 0, pending_approval: 0, approved: 0 };
  const points = new Map<string, TrendPoint>();
  const inspectionById = new Map(data.inspections.map((row) => [row.id, row]));
  for (const row of data.inspections) {
    status[row.status]++;
    const bucket = trendBucket(row.inspection_date, grouping);
    const point = points.get(bucket) ?? {
      bucket,
      inspections: 0,
      faultyCheckpoints: 0,
      faultyInspections: 0,
    };
    point.inspections++;
    points.set(bucket, point);
  }
  const trend = [...points.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
  if (!data.results) return { ...empty, trend, status };
  const faultyInspectionIds = new Set<string>();
  const findings: FindingsCounts = {
    OK: 0,
    Faulty: 0,
    'N/A': 0,
    unanswered: 0,
    faultyInspections: 0,
  };
  for (const row of data.results) {
    if (!inspectionById.has(row.inspection_id)) continue;
    findings[row.result]++;
    if (row.result === 'Faulty') {
      faultyInspectionIds.add(row.inspection_id);
      const bucket = trendBucket(inspectionById.get(row.inspection_id)!.inspection_date, grouping);
      const point = points.get(bucket)!;
      point.faultyCheckpoints++;
    }
  }
  findings.faultyInspections = faultyInspectionIds.size;
  for (const id of faultyInspectionIds) {
    const bucket = trendBucket(inspectionById.get(id)!.inspection_date, grouping);
    points.get(bucket)!.faultyInspections++;
  }
  if (data.checklistItemCounts) {
    const expected = data.inspections.reduce(
      (sum, row) => sum + (data.checklistItemCounts?.[row.template_version] ?? 0),
      0,
    );
    if (expected < data.results.length) return { ...empty, trend, status, faultyInspectionIds };
    findings.unanswered = Math.max(0, expected - data.results.length);
  } else return { ...empty, trend, status, faultyInspectionIds };
  return { ...empty, trend, status, findings, faultyInspectionIds };
}
