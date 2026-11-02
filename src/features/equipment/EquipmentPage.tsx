import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { typeLabels, type Equipment } from '../../domain/equipment';
import { useAuth } from '../auth/AuthProvider';
import { useMaintenance } from '../maintenance/queries';
import { MaintenanceForm } from '../maintenance/MaintenanceForm';
import { MaintenanceHistory } from '../maintenance/MaintenanceHistory';
import { EquipmentIcon } from '../../shared/ui/EquipmentIcon';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Field } from '../../shared/ui/Field';
import { QrCard } from '../../shared/ui/QrCard';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { formatDate } from '../../shared/date';
import { useEquipment } from './queries';
import { EquipmentForm } from './EquipmentForm';
import { StatusForm } from './StatusForm';

type FormKind = 'equipment' | 'status' | 'maintenance' | null;

function EquipmentFields({ item }: { item: Equipment }) {
  const fields = [
    ['الاسم', item.name],
    ['الكود', item.code],
    ['الموديل', item.model],
    ['القدرة', item.power],
    ['بلد الصنع', item.made_in],
    ['الموقع', item.location],
    ...(item.type === 'crane'
      ? [
          ['الحمولة القصوى', item.max_load],
          ['الارتفاع', item.height],
          ['العرض', item.width],
        ]
      : [
          ['L', item.length_spec],
          ['P', item.p_spec],
        ]),
  ];
  return (
    <div className="field-grid">
      {fields.map(([label, value]) => (
        <Field key={label} label={label} value={value} />
      ))}
    </div>
  );
}

export function EquipmentPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [form, setForm] = useState<FormKind>(null);
  const query = useEquipment(slug);
  const item = query.data;
  const history = useMaintenance(item?.id ?? '', true);
  if (query.isPending) return <div className="loading">جارٍ تحميل ملف المعدة...</div>;
  if (query.error) return <ErrorMessage error={query.error} retry={() => void query.refetch()} />;
  if (!item)
    return (
      <div className="not-found">
        <h1>المعدة غير موجودة</h1>
        <Link to="/">العودة إلى المعدات</Link>
      </div>
    );

  return (
    <div className="detail">
      <Link to="/" className="back-link">
        → العودة إلى المعدات
      </Link>
      <div className="detail-hero">
        <div>
          <div className="detail-kicker">
            <EquipmentIcon type={item.type} />
            {typeLabels[item.type]} <span className="divider-dot">•</span> {item.code || item.slug}
          </div>
          <h1>{item.name}</h1>
          <div className="hero-meta">
            <StatusBadge status={item.status} />
            <span>⌖ {item.location || 'الموقع غير مسجل'}</span>
          </div>
        </div>
        <div className="hero-actions">
          {isAdmin && (
            <>
              <button className="outline-button" onClick={() => setForm('equipment')}>
                تعديل البيانات
              </button>
              <button className="primary-button" onClick={() => setForm('status')}>
                تغيير الحالة
              </button>
            </>
          )}
        </div>
      </div>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>بيانات المعدة</h2>
                <p>المعلومات الثابتة الواردة في سجل المعدات.</p>
              </div>
            </div>
            <EquipmentFields item={item} />
          </section>
          <section className="panel history-panel">
            <div className="panel-heading">
              <div>
                <h2>سجل الصيانة</h2>
                <p>كل عمليات الصيانة المسجلة لهذه المعدة.</p>
              </div>
              {isAdmin && (
                <button className="small-primary" onClick={() => setForm('maintenance')}>
                  ＋ تسجيل صيانة
                </button>
              )}
            </div>
            {history.isPending ? (
              <div className="loading">جارٍ تحميل سجل الصيانة...</div>
            ) : history.error ? (
              <ErrorMessage error={history.error} retry={() => void history.refetch()} />
            ) : (
              <MaintenanceHistory records={history.data ?? []} />
            )}
          </section>
        </div>
        <aside className="detail-side">
          <QrCard equipment={item} />
          <section className="last-service">
            <span className="service-icon">⚙</span>
            <div>
              <small>آخر صيانة مسجلة</small>
              <strong>{formatDate(item.last_maintenance_on)}</strong>
            </div>
          </section>
        </aside>
      </div>
      {form === 'equipment' && (
        <EquipmentForm
          equipment={item}
          onClose={() => setForm(null)}
          onSaved={(saved) => {
            setForm(null);
            if (saved.slug !== slug) navigate(`/equipment/${saved.slug}`);
          }}
        />
      )}
      {form === 'status' && <StatusForm equipment={item} onClose={() => setForm(null)} />}
      {form === 'maintenance' && <MaintenanceForm equipment={item} onClose={() => setForm(null)} />}
    </div>
  );
}
