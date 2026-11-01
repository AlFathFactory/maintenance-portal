import seed from '../equipment.json';
import type { Equipment, EquipmentInput, EquipmentStatus } from '../domain/equipment';
import type { MaintenanceInput, MaintenanceRecord } from '../domain/maintenance';
import type { MaintenanceRepository } from './repository';

const storageKey = 'fateh-maintenance-demo-v2';
interface DemoData {
  equipment: Equipment[];
  maintenance: MaintenanceRecord[];
}

function initialData(): DemoData {
  return {
    equipment: (seed as Omit<Equipment, 'id'>[]).map((item) => ({ ...item, id: item.slug })),
    maintenance: [],
  };
}

function read(): DemoData {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (
      parsed &&
      typeof parsed === 'object' &&
      'equipment' in parsed &&
      Array.isArray(parsed.equipment)
    ) {
      return parsed as DemoData;
    }
  } catch {
    /* Start with the source inventory if local data is invalid. */
  }
  return initialData();
}

function write(data: DemoData): void {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export const demoRepository: MaintenanceRepository = {
  async listEquipment() {
    return read().equipment;
  },
  async getEquipment(slug) {
    return read().equipment.find((item) => item.slug === slug) ?? null;
  },
  async createEquipment(input: EquipmentInput) {
    const data = read();
    const item: Equipment = {
      ...input,
      id: crypto.randomUUID(),
      slug: `equipment-${crypto.randomUUID().slice(0, 10)}`,
      status: 'unknown',
      last_maintenance_on: null,
    };
    data.equipment.push(item);
    write(data);
    return item;
  },
  async updateEquipment(id: string, input: EquipmentInput) {
    const data = read();
    const item = data.equipment.find((entry) => entry.id === id);
    if (!item) throw new Error('المعدة غير موجودة.');
    Object.assign(item, input);
    write(data);
    return item;
  },
  async updateStatus(id: string, status: EquipmentStatus) {
    const data = read();
    const item = data.equipment.find((entry) => entry.id === id);
    if (!item) throw new Error('المعدة غير موجودة.');
    item.status = status;
    write(data);
    return item;
  },
  async listMaintenance(equipmentId: string) {
    return read()
      .maintenance.filter((record) => record.equipment_id === equipmentId)
      .sort((a, b) => b.performed_on.localeCompare(a.performed_on));
  },
  async createMaintenance(input: MaintenanceInput) {
    const data = read();
    const item = data.equipment.find((entry) => entry.id === input.equipment_id);
    if (!item) throw new Error('المعدة غير موجودة.');
    const record: MaintenanceRecord = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    data.maintenance.push(record);
    if (!item.last_maintenance_on || item.last_maintenance_on < input.performed_on)
      item.last_maintenance_on = input.performed_on;
    if (input.status_after) item.status = input.status_after;
    write(data);
    return record;
  },
};
