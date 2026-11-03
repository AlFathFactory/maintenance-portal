import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { equipmentText } from '../../domain/localizedEquipment';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { Modal } from '../../shared/ui/Modal';
import { useToast } from '../../shared/ui/ToastProvider';
import { useEquipmentList } from './queries';
import { useRotateEquipmentQrToken } from './qrQueries';
import './qrSettings.css';

export function QrSettingsPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'en' ? 'en' : 'ar';
  const toast = useToast();
  const equipmentQuery = useEquipmentList();
  const [selectedId, setSelectedId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [rotateError, setRotateError] = useState<unknown>(null);
  const selected = equipmentQuery.data?.find((item) => item.id === selectedId);
  const rotate = useRotateEquipmentQrToken(selected?.id ?? '');

  function closeConfirmation() {
    if (rotate.isPending) return;
    setConfirmOpen(false);
    setConfirmation('');
    setRotateError(null);
  }

  async function confirmRotation() {
    if (!selected || confirmation !== selected.slug || rotate.isPending) return;
    setRotateError(null);
    try {
      await rotate.mutateAsync();
      setConfirmOpen(false);
      setConfirmation('');
      toast.show(t('qr.rotated'));
    } catch (error) {
      setRotateError(error);
    }
  }

  return (
    <div className="qr-settings">
      <div className="qr-settings-heading">
        <span className="detail-kicker">{t('shell.settings')}</span>
        <h1>{t('qrSettings.title')}</h1>
        <p>{t('qrSettings.description')}</p>
      </div>
      <section className="qr-settings-panel">
        <h2>{t('qrSettings.rotationTitle')}</h2>
        <p>{t('qrSettings.rotationDescription')}</p>
        {equipmentQuery.isPending ? (
          <div className="loading">{t('dashboard.loading')}</div>
        ) : equipmentQuery.error ? (
          <ErrorMessage error={equipmentQuery.error} retry={() => void equipmentQuery.refetch()} />
        ) : (
          <>
            <label className="qr-settings-label" htmlFor="qr-settings-equipment">
              {t('qrSettings.equipment')}
            </label>
            <select
              id="qr-settings-equipment"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">{t('qrSettings.chooseEquipment')}</option>
              {equipmentQuery.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {equipmentText(item, 'name', language)} · {item.code || item.slug}
                </option>
              ))}
            </select>
            {selected && (
              <div className="qr-settings-selection">
                <strong dir="auto">{equipmentText(selected, 'name', language)}</strong>
                <span dir="ltr">{selected.code || selected.slug}</span>
              </div>
            )}
            <button
              className="qr-settings-rotate"
              type="button"
              disabled={!selected}
              onClick={() => setConfirmOpen(true)}
            >
              {t('qr.rotate')}
            </button>
          </>
        )}
      </section>
      {confirmOpen && selected && (
        <Modal title={t('qr.rotateTitle')} onClose={closeConfirmation}>
          <p className="qr-settings-warning">{t('qr.rotateWarning')}</p>
          <label className="qr-settings-label" htmlFor="qr-confirm-slug">
            {t('qrSettings.confirmLabel', { slug: selected.slug })}
          </label>
          <input
            id="qr-confirm-slug"
            className="qr-settings-confirm"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            dir="ltr"
            disabled={rotate.isPending}
          />
          <ErrorMessage error={rotateError} />
          <div className="form-actions">
            <button
              className="outline-button"
              onClick={closeConfirmation}
              disabled={rotate.isPending}
            >
              {t('common.cancel')}
            </button>
            <button
              className="qr-settings-rotate"
              onClick={() => void confirmRotation()}
              disabled={confirmation !== selected.slug || rotate.isPending}
            >
              {rotate.isPending ? t('common.saving') : t('qr.rotateConfirm')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
