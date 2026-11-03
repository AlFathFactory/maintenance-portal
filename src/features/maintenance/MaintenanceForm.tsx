import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Equipment } from '../../domain/equipment';
import type { MaintenanceInput } from '../../domain/maintenance';
import { Modal } from '../../shared/ui/Modal';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { useToast } from '../../shared/ui/ToastProvider';
import { todayLocal } from '../../shared/date';
import { useCreateMaintenance } from './queries';
import { equipmentText } from '../../domain/localizedEquipment';

export function MaintenanceForm({ equipment, onClose }: { equipment: Equipment; onClose(): void }) {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState<unknown>(null);
  const create = useCreateMaintenance();
  const toast = useToast();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const input: MaintenanceInput = {
      equipment_id: equipment.id,
      kind: data.get('kind') === 'periodic' ? 'periodic' : 'repair',
      performed_on: String(data.get('performed_on')),
      notes: String(data.get('notes') ?? '').trim(),
      status_after: (data.get('status_after') || null) as MaintenanceInput['status_after'],
    };
    if (!input.notes) {
      setError(new Error(t('maintenance.notesRequired')));
      return;
    }
    try {
      await create.mutateAsync(input);
      toast.show(t('maintenance.saved'));
      onClose();
    } catch (cause) {
      setError(cause);
    }
  }
  return (
    <Modal
      title={t('maintenance.formTitle')}
      subtitle={equipmentText(equipment, 'name', i18n.language === 'en' ? 'en' : 'ar')}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <ErrorMessage error={error} />
        <div className="form-grid">
          <label>
            {t('maintenance.kind')}
            <select name="kind">
              <option value="repair">{t('maintenance.repair')}</option>
              <option value="periodic">{t('maintenance.periodic')}</option>
            </select>
          </label>
          <label>
            {t('maintenance.date')}
            <input type="date" name="performed_on" defaultValue={todayLocal()} required />
          </label>
        </div>
        <label>
          {t('maintenance.notes')}
          <textarea
            name="notes"
            rows={5}
            placeholder={t('maintenance.notesPlaceholder')}
            required
          />
        </label>
        <label>
          {t('maintenance.afterStatus')}
          <select name="status_after">
            <option value="">{t('maintenance.keepStatus')}</option>
            <option value="operational">{t('status.operational')}</option>
            <option value="out_of_service">{t('status.out_of_service')}</option>
            <option value="maintenance">{t('status.maintenance')}</option>
          </select>
        </label>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="primary-button" disabled={create.isPending}>
            {create.isPending ? t('common.saving') : t('maintenance.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
