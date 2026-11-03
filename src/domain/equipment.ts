export const equipmentTypes = ['machine', 'crane'] as const;
export type EquipmentType = (typeof equipmentTypes)[number];

export const equipmentStatuses = [
  'unknown',
  'operational',
  'out_of_service',
  'maintenance',
] as const;
export type EquipmentStatus = (typeof equipmentStatuses)[number];

export const equipmentTextFields = [
  'name',
  'model',
  'power',
  'length_spec',
  'p_spec',
  'made_in',
  'location',
  'max_load',
  'height',
  'width',
] as const;
export type EquipmentTextField = (typeof equipmentTextFields)[number];
export type EquipmentText = Record<EquipmentTextField, string>;
export type EquipmentLocale = 'ar' | 'en';
export type EquipmentTranslation = EquipmentText & {
  equipment_id: string;
  locale: EquipmentLocale;
};

export interface Equipment {
  id: string;
  slug: string;
  type: EquipmentType;
  name: string;
  code: string;
  model: string;
  power: string;
  length_spec: string;
  p_spec: string;
  made_in: string;
  location: string;
  max_load: string;
  height: string;
  width: string;
  status: EquipmentStatus;
  last_maintenance_on: string | null;
  translations?: Partial<Record<EquipmentLocale, EquipmentText>>;
}

export type EquipmentInput = Pick<Equipment, 'type' | 'code'> & {
  ar: EquipmentText;
  en: EquipmentText;
};

export const statusDetails: Record<EquipmentStatus, { tone: string }> = {
  unknown: { tone: 'muted' },
  operational: { tone: 'good' },
  out_of_service: { tone: 'bad' },
  maintenance: { tone: 'warn' },
};
