import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HSEPeriod } from '../../../domain/hse';
import { cairoToday, resolvePeriod, type PeriodPreset } from './dateRanges';

export function ReportingPeriodControl({
  period,
  onChange,
}: {
  period: HSEPeriod;
  onChange(period: HSEPeriod): void;
}) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<PeriodPreset>('last30');
  const [from, setFrom] = useState(period.from ?? '');
  const [to, setTo] = useState(period.to ?? '');
  const [invalid, setInvalid] = useState(false);
  function choose(next: PeriodPreset) {
    setPreset(next);
    setInvalid(false);
    if (next === 'custom') return;
    const value = resolvePeriod(next, {}, cairoToday());
    if (value) onChange(value);
  }
  function apply() {
    const value = resolvePeriod('custom', { from, to });
    if (!value) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(value);
  }
  return (
    <div className="hse-period-control">
      <label>
        {t('reportUI.period')}
        <select value={preset} onChange={(event) => choose(event.target.value as PeriodPreset)}>
          {(['today', 'last7', 'last30', 'month', 'year', 'custom', 'all'] as const).map(
            (value) => (
              <option key={value} value={value}>
                {t(`reportUI.${value}`)}
              </option>
            ),
          )}
        </select>
      </label>
      {preset === 'custom' && (
        <>
          <label>
            {t('inspectionUI.from')}
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            {t('inspectionUI.to')}
            <input
              type="date"
              min={from || undefined}
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <button type="button" onClick={apply}>
            {t('reportUI.apply')}
          </button>
        </>
      )}
      {invalid && <p role="alert">{t('reportUI.invalidRange')}</p>}
      <span className="hse-period-active">
        {period.from && period.to ? `${period.from} → ${period.to}` : t('reportUI.all')}
      </span>
    </div>
  );
}
