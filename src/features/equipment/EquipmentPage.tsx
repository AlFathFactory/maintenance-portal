import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Equipment, EquipmentTextField } from '../../domain/equipment';
import { equipmentText } from '../../domain/localizedEquipment';
import type { AppLanguage } from '../../i18n';
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
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.language === 'en' ? 'en' : 'ar';
  const fields: [string, string][] = [
    [t('equipment.name'), equipmentText(item, 'name', language)],
    [t('equipment.code'), item.code],
    ...(['model', 'power', 'made_in', 'location'] as EquipmentTextField[]).map(
      (field) =>
        [t(`equipment.${field}`), equipmentText(item, field, language)] as [string, string],
    ),
    ...(item.type === 'crane'
      ? (['max_load', 'height', 'width'] as EquipmentTextField[]).map(
          (field) =>
            [t(`equipment.${field}`), equipmentText(item, field, language)] as [string, string],
        )
      : (['length_spec', 'p_spec'] as EquipmentTextField[]).map(
          (field) =>
            [t(`equipment.${field}`), equipmentText(item, field, language)] as [string, string],
        )),
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
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.language === 'en' ? 'en' : 'ar';
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [form, setForm] = useState<FormKind>(null);
  const query = useEquipment(slug);
  const item = query.data;
  const history = useMaintenance(item?.id ?? '', true);
  if (query.isPending) return <div className="loading">{t('equipment.loading')}</div>;
  if (query.error) return <ErrorMessage error={query.error} retry={() => void query.refetch()} />;
  if (!item)
    return (
      <div className="not-found">
        <h1>{t('equipment.notFound')}</h1>
        <Link to="/">{t('equipment.back')}</Link>
      </div>
    );

  return (
    <div className="detail">
      <Link to="/" className="back-link">
        {language === 'ar' ? '→' : '←'} {t('equipment.back')}
      </Link>
      <div className="detail-hero">
        <div>
          <div className="detail-kicker">
            <EquipmentIcon type={item.type} />
            {t(`equipmentType.${item.type}`)} <span className="divider-dot">•</span>{' '}
            {item.code || item.slug}
          </div>
          <h1 dir="auto">{equipmentText(item, 'name', language)}</h1>
          <div className="hero-meta">
            <StatusBadge status={item.status} />
            <span>
              ⌖ {equipmentText(item, 'location', language) || t('equipment.locationMissing')}
            </span>
          </div>
        </div>
        <div className="hero-actions">
          {isAdmin && (
            <>
              <button className="outline-button" onClick={() => setForm('equipment')}>
                {t('equipment.edit')}
              </button>
              <button className="primary-button" onClick={() => setForm('status')}>
                {t('equipment.changeStatus')}
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
                <h2>{t('equipment.details')}</h2>
                <p>{t('equipment.detailsHint')}</p>
              </div>
            </div>
            <EquipmentFields item={item} />
          </section>
          <section className="panel history-panel">
            <div className="panel-heading">
              <div>
                <h2>{t('equipment.history')}</h2>
                <p>{t('equipment.historyHint')}</p>
              </div>
              {isAdmin && (
                <button className="small-primary" onClick={() => setForm('maintenance')}>
                  ＋ {t('equipment.recordMaintenance')}
                </button>
              )}
            </div>
            {history.isPending ? (
              <div className="loading">{t('equipment.historyLoading')}</div>
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
              <small>{t('equipment.lastRecorded')}</small>
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
