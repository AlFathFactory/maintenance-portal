import {
  equipmentTextFields,
  equipmentStatuses,
  equipmentTypes,
  type Equipment,
  type EquipmentLocale,
  type EquipmentText,
  type EquipmentStatus,
} from './equipment';
import type { MaintenanceRecord } from './maintenance';

export interface QrEquipmentDetails {
  equipment: Equipment;
  maintenanceRecords: MaintenanceRecord[];
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseQrEquipment(value: unknown): QrEquipmentDetails {
  const payload = object(value);
  const rawEquipment = object(payload?.equipment);
  if (
    !rawEquipment ||
    typeof rawEquipment.id !== 'string' ||
    typeof rawEquipment.name !== 'string' ||
    !equipmentTypes.includes(rawEquipment.type as Equipment['type']) ||
    !equipmentStatuses.includes(rawEquipment.status as EquipmentStatus)
  ) {
    throw new Error('QR_RESPONSE_INVALID');
  }
  const translations: Equipment['translations'] = {};
  for (const raw of Array.isArray(payload?.translations) ? payload.translations : []) {
    const translation = object(raw);
    if (translation?.locale !== 'ar' && translation?.locale !== 'en') continue;
    const locale: EquipmentLocale = translation.locale;
    translations[locale] = Object.fromEntries(
      equipmentTextFields.map((field) => [
        field,
        typeof translation[field] === 'string' ? translation[field] : '',
      ]),
    ) as EquipmentText;
  }
  const field = (key: string) =>
    typeof rawEquipment[key] === 'string' ? (rawEquipment[key] as string) : '';
  const equipment: Equipment = {
    id: rawEquipment.id,
    slug: field('slug'),
    type: rawEquipment.type as Equipment['type'],
    code: field('code'),
    name: rawEquipment.name,
    model: field('model'),
    power: field('power'),
    length_spec: field('length_spec'),
    p_spec: field('p_spec'),
    made_in: field('made_in'),
    location: field('location'),
    max_load: field('max_load'),
    height: field('height'),
    width: field('width'),
    status: rawEquipment.status as EquipmentStatus,
    last_maintenance_on:
      typeof rawEquipment.last_maintenance_on === 'string'
        ? rawEquipment.last_maintenance_on
        : null,
    translations,
  };
  const maintenanceRecords: MaintenanceRecord[] = (
    Array.isArray(payload?.maintenance_records) ? payload.maintenance_records : []
  ).flatMap((raw) => {
    const record = object(raw);
    if (
      !record ||
      typeof record.id !== 'string' ||
      (record.kind !== 'repair' && record.kind !== 'periodic') ||
      typeof record.performed_on !== 'string' ||
      typeof record.notes !== 'string'
    )
      return [];
    const status = record.status_after;
    return [
      {
        id: record.id,
        equipment_id: equipment.id,
        kind: record.kind,
        performed_on: record.performed_on,
        notes: record.notes,
        status_after:
          status === 'operational' || status === 'out_of_service' || status === 'maintenance'
            ? status
            : null,
      },
    ];
  });
  return { equipment, maintenanceRecords };
}
