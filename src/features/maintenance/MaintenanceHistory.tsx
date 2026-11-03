import type { MaintenanceRecord } from '../../domain/maintenance';
import { formatDate } from '../../shared/date';
import { useTranslation } from 'react-i18next';

export function MaintenanceHistory({ records }: { records: MaintenanceRecord[] }) {
  const { t } = useTranslation();
  if (!records.length)
    return (
      <div className="history-empty">
        <span>⚙</span>
        <strong>{t('maintenance.empty')}</strong>
        <p>{t('maintenance.emptyHint')}</p>
      </div>
    );
  return (
    <div className="timeline">
      {records.map((record) => (
        <div className="timeline-item" key={record.id}>
          <span className="timeline-dot" />
          <div>
            <div className="timeline-top">
              <strong>
                {t(record.kind === 'periodic' ? 'maintenance.periodic' : 'maintenance.repair')}
              </strong>
              <time>{formatDate(record.performed_on)}</time>
            </div>
            <p>{record.notes}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
