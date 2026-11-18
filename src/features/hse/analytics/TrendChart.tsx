import { useTranslation } from 'react-i18next';
import type { TrendPoint } from './reportingModel';

export function TrendChart({
  points,
  metric,
  title,
}: {
  points: TrendPoint[];
  metric: 'inspections' | 'faultyCheckpoints' | 'faultyInspections';
  title: string;
}) {
  const { t } = useTranslation();
  if (!points.length) return <p>{t('reportUI.noActivity')}</p>;
  const max = Math.max(1, ...points.map((point) => point[metric]));
  return (
    <figure className="hse-chart">
      <figcaption>{title}</figcaption>
      <div
        className="hse-chart-bars"
        role="img"
        aria-label={points.map((point) => `${point.bucket}: ${point[metric]}`).join(', ')}
      >
        {points.map((point) => (
          <div className="hse-chart-column" key={point.bucket}>
            <span className="hse-chart-value">{point[metric]}</span>
            <div className="hse-chart-track">
              <div
                className="hse-chart-bar"
                style={{
                  height: `${Math.max(point[metric] ? 8 : 0, (point[metric] / max) * 100)}%`,
                }}
              />
            </div>
            <span className="hse-chart-label" dir="ltr">
              {point.bucket}
            </span>
          </div>
        ))}
      </div>
      <details>
        <summary>{t('reportUI.chartData')}</summary>
        <table>
          <thead>
            <tr>
              <th>{t('reportUI.bucket')}</th>
              <th>{title}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.bucket}>
                <td dir="ltr">{point.bucket}</td>
                <td>{point[metric]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
