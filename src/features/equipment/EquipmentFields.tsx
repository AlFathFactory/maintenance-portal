import { useTranslation } from 'react-i18next';
import type { Equipment, EquipmentTextField } from '../../domain/equipment';
import { equipmentText } from '../../domain/localizedEquipment';
import type { AppLanguage } from '../../i18n';
import { Field } from '../../shared/ui/Field';

export function EquipmentFields({ item }: { item: Equipment }) {
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.language === 'en' ? 'en' : 'ar';
  const fields: [string, string][] = [
    [t('equipment.name'), equipmentText(item, 'name', language)],
    [t('equipment.code'), item.code],
    ...(['model', 'power', 'made_in', 'location'] as EquipmentTextField[]).map(
      (field) =>
        [t(`equipment.${field}`), equipmentText(item, field, language)] as [string, string],
    ),
    ...(item.type === 'crane' ? ['max_load', 'height', 'width'] : ['length_spec', 'p_spec']).map(
      (field) =>
        [t(`equipment.${field}`), equipmentText(item, field as EquipmentTextField, language)] as [
          string,
          string,
        ],
    ),
  ];
  return (
    <div className="field-grid">
      {fields.map(([label, value]) => (
        <Field key={label} label={label} value={value} />
      ))}
    </div>
  );
}
