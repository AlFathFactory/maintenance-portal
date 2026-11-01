import { useState, type FormEvent } from 'react';
import {
  equipmentStatuses,
  statusDetails,
  type Equipment,
  type EquipmentStatus,
} from '../../domain/equipment';
import { Modal } from '../../shared/ui/Modal';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { useToast } from '../../shared/ui/ToastProvider';
import { useEquipmentActions } from './queries';

export function StatusForm({ equipment, onClose }: { equipment: Equipment; onClose(): void }) {
  const [error, setError] = useState<unknown>(null);
  const { setStatus } = useEquipmentActions();
  const toast = useToast();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const status = String(new FormData(event.currentTarget).get('status')) as EquipmentStatus;
    try {
      await setStatus.mutateAsync({ id: equipment.id, status });
      toast.show('تم تحديث حالة المعدة');
      onClose();
    } catch (cause) {
      setError(cause);
    }
  }
  return (
    <Modal title="تغيير حالة المعدة" subtitle={equipment.name} onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorMessage error={error} />
        <label>
          الحالة الجديدة
          <select name="status" defaultValue={equipment.status}>
            {equipmentStatuses.map((status) => (
              <option key={status} value={status}>
                {statusDetails[status].label}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            إلغاء
          </button>
          <button className="primary-button" disabled={setStatus.isPending}>
            حفظ الحالة
          </button>
        </div>
      </form>
    </Modal>
  );
}
