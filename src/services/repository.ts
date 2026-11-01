import type { Equipment, EquipmentInput, EquipmentStatus } from '../domain/equipment';
import type { MaintenanceInput, MaintenanceRecord } from '../domain/maintenance';

export interface MaintenanceRepository {
  listEquipment(): Promise<Equipment[]>;
  getEquipment(slug: string): Promise<Equipment | null>;
  createEquipment(input: EquipmentInput): Promise<Equipment>;
  updateEquipment(id: string, input: EquipmentInput): Promise<Equipment>;
  updateStatus(id: string, status: EquipmentStatus): Promise<Equipment>;
  listMaintenance(equipmentId: string): Promise<MaintenanceRecord[]>;
  createMaintenance(input: MaintenanceInput): Promise<MaintenanceRecord>;
}
