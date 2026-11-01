import { useState, type FormEvent } from 'react';
import type { Equipment } from '../../domain/equipment';
import type { MaintenanceInput } from '../../domain/maintenance';
import { Modal } from '../../shared/ui/Modal';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { useToast } from '../../shared/ui/ToastProvider';
import { todayLocal } from '../../shared/date';
import { useCreateMaintenance } from './queries';

export function MaintenanceForm({ equipment, onClose }: { equipment: Equipment; onClose(): void }) {
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
      setError(new Error('اكتب ملاحظات الصيانة.'));
      return;
    }
    try {
      await create.mutateAsync(input);
      toast.show('تم تسجيل عملية الصيانة');
      onClose();
    } catch (cause) {
      setError(cause);
    }
  }
  return (
    <Modal title="تسجيل عملية صيانة" subtitle={equipment.name} onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorMessage error={error} />
        <div className="form-grid">
          <label>
            نوع العملية
            <select name="kind">
              <option value="repair">إصلاح عطل</option>
              <option value="periodic">صيانة دورية</option>
            </select>
          </label>
          <label>
            تاريخ الصيانة
            <input type="date" name="performed_on" defaultValue={todayLocal()} required />
          </label>
        </div>
        <label>
          ملاحظات الصيانة
          <textarea
            name="notes"
            rows={5}
            placeholder="اكتب الأعمال التي تمت والنتيجة..."
            required
          />
        </label>
        <label>
          الحالة بعد الصيانة
          <select name="status_after">
            <option value="">لا تغيّر الحالة</option>
            <option value="operational">تعمل</option>
            <option value="out_of_service">خارج الخدمة</option>
            <option value="maintenance">تحت الصيانة</option>
          </select>
        </label>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            إلغاء
          </button>
          <button className="primary-button" disabled={create.isPending}>
            {create.isPending ? 'جارٍ الحفظ...' : 'حفظ الصيانة'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
