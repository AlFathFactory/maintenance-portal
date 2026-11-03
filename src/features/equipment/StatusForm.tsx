import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { equipmentStatuses, type Equipment, type EquipmentStatus } from '../../domain/equipment';
import { Modal } from '../../shared/ui/Modal';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { useToast } from '../../shared/ui/ToastProvider';
import { useEquipmentActions } from './queries';
import { equipmentText } from '../../domain/localizedEquipment';

export function StatusForm({ equipment, onClose }: { equipment: Equipment; onClose(): void }) {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState<unknown>(null);
  const { setStatus } = useEquipmentActions();
  const toast = useToast();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const status = String(new FormData(event.currentTarget).get('status')) as EquipmentStatus;
    try {
      await setStatus.mutateAsync({ id: equipment.id, status });
      toast.show(t('statusForm.saved'));
      onClose();
    } catch (cause) {
      setError(cause);
    }
  }
  return (
    <Modal
      title={t('statusForm.title')}
      subtitle={equipmentText(equipment, 'name', i18n.language === 'en' ? 'en' : 'ar')}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <ErrorMessage error={error} />
        <label>
          {t('statusForm.newStatus')}
          <select name="status" defaultValue={equipment.status}>
            {equipmentStatuses.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="primary-button" disabled={setStatus.isPending}>
            {t('statusForm.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
