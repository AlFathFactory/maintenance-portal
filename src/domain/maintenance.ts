import type { EquipmentStatus } from './equipment';

export type MaintenanceKind = 'repair' | 'periodic';

export interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  kind: MaintenanceKind;
  performed_on: string;
  notes: string;
  status_after: Exclude<EquipmentStatus, 'unknown'> | null;
  created_at?: string;
}

export type MaintenanceInput = Pick<
  MaintenanceRecord,
  'equipment_id' | 'kind' | 'performed_on' | 'notes' | 'status_after'
>;
