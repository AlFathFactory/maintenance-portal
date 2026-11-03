import type { Equipment, EquipmentInput, EquipmentStatus } from '../domain/equipment';
import type { MaintenanceInput, MaintenanceRecord } from '../domain/maintenance';
import type { Staff, StaffInput, TeamDirectory } from '../features/teams/types';
import type { QrEquipmentDetails } from '../domain/qrEquipment';

export interface MaintenanceRepository {
  listEquipment(): Promise<Equipment[]>;
  getEquipment(slug: string): Promise<Equipment | null>;
  getEquipmentByQr(token: string): Promise<QrEquipmentDetails | null>;
  getEquipmentQrToken(equipmentId: string): Promise<string>;
  rotateEquipmentQrToken(equipmentId: string): Promise<string>;
  createEquipment(input: EquipmentInput): Promise<Equipment>;
  updateEquipment(id: string, input: EquipmentInput): Promise<Equipment>;
  updateStatus(id: string, status: EquipmentStatus): Promise<Equipment>;
  listMaintenance(equipmentId: string): Promise<MaintenanceRecord[]>;
  createMaintenance(input: MaintenanceInput): Promise<MaintenanceRecord>;
  listTeamDirectory(): Promise<TeamDirectory>;
  createStaff(input: StaffInput): Promise<Staff>;
  updateStaff(id: string, input: StaffInput): Promise<void>;
  deleteStaff(id: string): Promise<void>;
  assignStaff(staffId: string, teamId: string | null): Promise<void>;
  updateTeam(id: string, name: string, engineerId: string, leaderId: string): Promise<void>;
}
