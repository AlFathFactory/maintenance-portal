import type { AppLanguage } from '../i18n';
import type { Equipment, EquipmentText, EquipmentTextField } from './equipment';
import { equipmentTextFields } from './equipment';

export function equipmentText(
  equipment: Equipment,
  field: EquipmentTextField,
  language: AppLanguage,
): string {
  const arabic = equipment.translations?.ar?.[field]?.trim() || equipment[field] || '';
  return language === 'en' ? equipment.translations?.en?.[field]?.trim() || arabic : arabic;
}

export function equipmentFormText(
  equipment: Equipment | undefined,
  language: AppLanguage,
): EquipmentText {
  return Object.fromEntries(
    equipmentTextFields.map((field) => [
      field,
      equipment
        ? language === 'ar'
          ? (equipment.translations?.ar?.[field] ?? equipment[field])
          : (equipment.translations?.en?.[field] ?? '')
        : '',
    ]),
  ) as EquipmentText;
}
