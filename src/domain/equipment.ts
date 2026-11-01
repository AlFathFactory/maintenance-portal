export const equipmentTypes = ['machine', 'crane'] as const;
export type EquipmentType = (typeof equipmentTypes)[number];

export const equipmentStatuses = [
  'unknown',
  'operational',
  'out_of_service',
  'maintenance',
] as const;
export type EquipmentStatus = (typeof equipmentStatuses)[number];

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
}

export type EquipmentInput = Pick<
  Equipment,
  | 'type'
  | 'name'
  | 'code'
  | 'model'
  | 'power'
  | 'length_spec'
  | 'p_spec'
  | 'made_in'
  | 'location'
  | 'max_load'
  | 'height'
  | 'width'
>;

export const statusDetails: Record<EquipmentStatus, { label: string; tone: string }> = {
  unknown: { label: 'غير محددة', tone: 'muted' },
  operational: { label: 'تعمل', tone: 'good' },
  out_of_service: { label: 'خارج الخدمة', tone: 'bad' },
  maintenance: { label: 'تحت الصيانة', tone: 'warn' },
};

export const typeLabels: Record<EquipmentType, string> = { machine: 'ماكينة', crane: 'ونش' };
