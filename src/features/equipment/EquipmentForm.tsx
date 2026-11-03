import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  equipmentTextFields,
  type Equipment,
  type EquipmentInput,
  type EquipmentTextField,
  type EquipmentType,
} from '../../domain/equipment';
import { equipmentFormText } from '../../domain/localizedEquipment';
import { Modal } from '../../shared/ui/Modal';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { useToast } from '../../shared/ui/ToastProvider';
import { useEquipmentActions } from './queries';

const commonFields: EquipmentTextField[] = ['name', 'model', 'power', 'made_in', 'location'];
const machineFields: EquipmentTextField[] = ['length_spec', 'p_spec'];
const craneFields: EquipmentTextField[] = ['max_load', 'height', 'width'];

function inputValue(data: FormData, key: string): string {
  return String(data.get(key) ?? '').trim();
}

function LocalizedFieldPair({
  field,
  equipment,
}: {
  field: EquipmentTextField;
  equipment?: Equipment;
}) {
  const { t } = useTranslation();
  const ar = equipmentFormText(equipment, 'ar');
  const en = equipmentFormText(equipment, 'en');
  return (
    <div className="localized-field-pair">
      <label lang="ar" dir="rtl">
        {t(`equipment.${field}`, { lng: 'ar' })} (AR) {field === 'name' && '*'}
        <input
          name={`ar_${field}`}
          defaultValue={ar[field]}
          required={field === 'name'}
          dir="auto"
        />
      </label>
      <label lang="en" dir="ltr">
        {t(`equipment.${field}`, { lng: 'en' })} (EN)
        <input name={`en_${field}`} defaultValue={en[field]} dir="auto" />
      </label>
    </div>
  );
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
  const { t } = useTranslation();
  const [type, setType] = useState<EquipmentType>(equipment?.type ?? 'machine');
  const [error, setError] = useState<unknown>(null);
  const { create, update } = useEquipmentActions();
  const toast = useToast();
  const pending = create.isPending || update.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const active = [...commonFields, ...(type === 'machine' ? machineFields : craneFields)];
    const text = (locale: 'ar' | 'en') =>
      Object.fromEntries(
        equipmentTextFields.map((field) => [
          field,
          active.includes(field) ? inputValue(data, `${locale}_${field}`) : '',
        ]),
      ) as EquipmentInput['ar'];
    const input: EquipmentInput = {
      type,
      code: inputValue(data, 'code'),
      ar: text('ar'),
      en: text('en'),
    };
    if (!input.ar.name) return setError(new Error(t('equipment.arabicRequired')));
    try {
      const saved = equipment
        ? await update.mutateAsync({ id: equipment.id, input })
        : await create.mutateAsync(input);
      toast.show(t('equipment.saved'));
      onSaved(saved);
    } catch (cause) {
      setError(cause);
    }
  }

  return (
    <Modal
      title={t(equipment ? 'equipment.editTitle' : 'equipment.addTitle')}
      subtitle={t('equipment.formHint')}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <ErrorMessage error={error} />
        <div className="form-grid">
          <label>
            {t('equipment.type')}
            <select
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as EquipmentType)}
            >
              <option value="machine">{t('equipmentType.machine')}</option>
              <option value="crane">{t('equipmentType.crane')}</option>
            </select>
          </label>
          <label>
            {t('equipment.code')}
            <input name="code" defaultValue={equipment?.code ?? ''} />
          </label>
        </div>
        <div className="localized-fields">
          {[...commonFields, ...(type === 'machine' ? machineFields : craneFields)].map((field) => (
            <LocalizedFieldPair key={field} field={field} equipment={equipment} />
          ))}
        </div>
        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="primary-button" disabled={pending}>
            {pending ? t('common.saving') : t('equipment.saveData')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
