import type { HSEPeriod } from '../../../domain/hse';

export type PeriodPreset = 'today' | 'last7' | 'last30' | 'month' | 'year' | 'custom' | 'all';
export const reportingTimeZone = 'Africa/Cairo';

export function formatReportingTimestamp(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: reportingTimeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function cairoToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: reportingTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function shiftDate(date: string, days: number): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

export function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function resolvePeriod(
  preset: PeriodPreset,
  custom: HSEPeriod,
  today = cairoToday(),
): HSEPeriod | null {
  if (preset === 'all') return {};
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'last7') return { from: shiftDate(today, -6), to: today };
  if (preset === 'last30') return { from: shiftDate(today, -29), to: today };
  if (preset === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (preset === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today };
  if (
    !custom.from ||
    !custom.to ||
    !validDate(custom.from) ||
    !validDate(custom.to) ||
    custom.from > custom.to
  )
    return null;
  return custom;
}

export function trendBucket(date: string, grouping: 'day' | 'week' | 'month'): string {
  if (grouping === 'day') return date;
  if (grouping === 'month') return date.slice(0, 7);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return shiftDate(date, -((weekday + 6) % 7));
}
