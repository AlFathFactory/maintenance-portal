import type { MaintenanceRecord } from '../../domain/maintenance';
import { formatDate } from '../../shared/date';

export function MaintenanceHistory({ records }: { records: MaintenanceRecord[] }) {
  if (!records.length)
    return (
      <div className="history-empty">
        <span>⚙</span>
        <strong>لا توجد عمليات صيانة مسجلة</strong>
        <p>أضف أول عملية صيانة لتظهر هنا.</p>
      </div>
    );
  return (
    <div className="timeline">
      {records.map((record) => (
        <div className="timeline-item" key={record.id}>
          <span className="timeline-dot" />
          <div>
            <div className="timeline-top">
              <strong>{record.kind === 'periodic' ? 'صيانة دورية' : 'إصلاح عطل'}</strong>
              <time>{formatDate(record.performed_on)}</time>
            </div>
            <p>{record.notes}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
