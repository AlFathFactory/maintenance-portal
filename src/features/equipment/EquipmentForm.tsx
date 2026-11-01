import { useState, type FormEvent } from 'react';
import type { Equipment, EquipmentInput, EquipmentType } from '../../domain/equipment';
import { Modal } from '../../shared/ui/Modal';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { useToast } from '../../shared/ui/ToastProvider';
import { useEquipmentActions } from './queries';

const fields: { name: keyof EquipmentInput; label: string }[] = [
  { name: 'name', label: 'اسم المعدة' },
  { name: 'code', label: 'الكود' },
  { name: 'model', label: 'الموديل' },
  { name: 'power', label: 'القدرة' },
  { name: 'made_in', label: 'بلد الصنع' },
  { name: 'location', label: 'الموقع' },
];

function inputValue(data: FormData, key: string): string {
  return String(data.get(key) ?? '').trim();
}

export function EquipmentForm({
  equipment,
  onClose,
  onSaved,
}: {
  equipment?: Equipment;
  onClose(): void;
  onSaved(item: Equipment): void;
}) {
  const [type, setType] = useState<EquipmentType>(equipment?.type ?? 'machine');
  const [error, setError] = useState<unknown>(null);
  const { create, update } = useEquipmentActions();
  const toast = useToast();
  const pending = create.isPending || update.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const input: EquipmentInput = {
      type,
      name: inputValue(data, 'name'),
      code: inputValue(data, 'code'),
      model: inputValue(data, 'model'),
      power: inputValue(data, 'power'),
      made_in: inputValue(data, 'made_in'),
      location: inputValue(data, 'location'),
      length_spec: type === 'machine' ? inputValue(data, 'length_spec') : '',
      p_spec: type === 'machine' ? inputValue(data, 'p_spec') : '',
      max_load: type === 'crane' ? inputValue(data, 'max_load') : '',
      height: type === 'crane' ? inputValue(data, 'height') : '',
      width: type === 'crane' ? inputValue(data, 'width') : '',
    };
    try {
      const saved = equipment
        ? await update.mutateAsync({ id: equipment.id, input })
        : await create.mutateAsync(input);
      toast.show('تم حفظ بيانات المعدة');
      onSaved(saved);
    } catch (cause) {
      setError(cause);
    }
  }

  return (
    <Modal
      title={equipment ? 'تعديل بيانات المعدة' : 'إضافة معدة'}
      subtitle="املأ البيانات المتاحة. يمكنك ترك الحقول غير المعروفة فارغة."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <ErrorMessage error={error} />
        <div className="form-grid">
          <label>
            النوع
            <select
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as EquipmentType)}
            >
              <option value="machine">ماكينة</option>
              <option value="crane">ونش</option>
            </select>
          </label>
          {fields.map((field) => (
            <label key={field.name}>
              {field.label}
              <input
                name={field.name}
                defaultValue={equipment?.[field.name] ?? ''}
                required={field.name === 'name'}
              />
            </label>
          ))}
          {type === 'machine' ? (
            <>
              <label>
                L<input name="length_spec" defaultValue={equipment?.length_spec ?? ''} />
              </label>
              <label>
                P<input name="p_spec" defaultValue={equipment?.p_spec ?? ''} />
              </label>
            </>
          ) : (
            <>
              <label>
                الحمولة القصوى
                <input name="max_load" defaultValue={equipment?.max_load ?? ''} />
              </label>
              <label>
                الارتفاع
                <input name="height" defaultValue={equipment?.height ?? ''} />
              </label>
              <label>
                العرض
                <input name="width" defaultValue={equipment?.width ?? ''} />
              </label>
            </>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            إلغاء
          </button>
          <button className="primary-button" disabled={pending}>
            {pending ? 'جارٍ الحفظ...' : 'حفظ البيانات'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
