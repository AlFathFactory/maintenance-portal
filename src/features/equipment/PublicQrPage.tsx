import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { equipmentText } from '../../domain/localizedEquipment';
import type { AppLanguage } from '../../i18n';
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher';
import { EquipmentIcon } from '../../shared/ui/EquipmentIcon';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { MaintenanceHistory } from '../maintenance/MaintenanceHistory';
import { EquipmentFields } from './EquipmentFields';
import { isQrToken, useQrEquipment } from './qrQueries';

export function PublicQrPage() {
  const { token = '' } = useParams();
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.language === 'en' ? 'en' : 'ar';
  const query = useQrEquipment(token);
  const invalid = !isQrToken(token) || (!query.isPending && !query.isError && !query.data);
  const details = query.data;
  return (
    <div className="public-qr-page">
      <header className="public-qr-header">
        <div className="public-qr-brand"><span className="brand-mark">F</span><div><strong>{t('shell.factory')}</strong><small>{t('shell.department')}</small></div></div>
        <LanguageSwitcher />
      </header>
      <main className="public-qr-main">
        {invalid ? (
          <div className="public-qr-state"><span aria-hidden="true">⌁</span><h1>{t('qrPublic.invalidTitle')}</h1><p>{t('qrPublic.invalidDescription')}</p></div>
        ) : query.isPending ? (
          <div className="public-qr-state" role="status"><span className="public-qr-pulse" aria-hidden="true" /><h1>{t('qrPublic.loading')}</h1></div>
        ) : query.isError ? (
          <div className="public-qr-state" role="alert"><h1>{t('qrPublic.loadError')}</h1><button className="outline-button" onClick={() => void query.refetch()}>{t('common.retry')}</button></div>
        ) : details ? (
          <div className="public-qr-content">
            <div className="public-qr-eyebrow">{t('qrPublic.equipmentProfile')}</div>
            <section className="public-qr-hero">
              <div className="public-qr-type"><EquipmentIcon type={details.equipment.type} /> {t(`equipmentType.${details.equipment.type}`)} <span>•</span> <bdi>{details.equipment.code}</bdi></div>
              <h1 dir="auto">{equipmentText(details.equipment, 'name', language)}</h1>
              <div className="public-qr-meta"><StatusBadge status={details.equipment.status} /><span dir="auto">⌖ {equipmentText(details.equipment, 'location', language) || t('equipment.locationMissing')}</span></div>
            </section>
            <section className="public-qr-panel"><h2>{t('equipment.details')}</h2><p>{t('equipment.detailsHint')}</p><EquipmentFields item={details.equipment} /></section>
            <section className="public-qr-panel"><h2>{t('equipment.history')}</h2><p>{t('equipment.historyHint')}</p><MaintenanceHistory records={details.maintenanceRecords} /></section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
