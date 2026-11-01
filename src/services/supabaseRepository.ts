import type { MaintenanceRepository } from './repository';
import { supabase } from './supabaseClient';

function client() {
  if (!supabase) throw new Error('لم يُضبط اتصال Supabase.');
  return supabase;
}

export const supabaseRepository: MaintenanceRepository = {
  async listEquipment() {
    const { data, error } = await client()
      .from('equipment')
      .select('*')
      .order('type')
      .order('slug');
    if (error) throw error;
    return data;
  },
  async getEquipment(slug) {
    const { data, error } = await client()
      .from('equipment')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async createEquipment(input) {
    const slug = `equipment-${crypto.randomUUID().slice(0, 10)}`;
    const { data, error } = await client()
      .from('equipment')
      .insert({ ...input, slug })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async updateEquipment(id, input) {
    const { data, error } = await client()
      .from('equipment')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async updateStatus(id, status) {
    const { data, error } = await client()
      .from('equipment')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async listMaintenance(equipmentId) {
    const { data, error } = await client()
      .from('maintenance_records')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('performed_on', { ascending: false });
    if (error) throw error;
    return data;
  },
  async createMaintenance(input) {
    const { data, error } = await client()
      .from('maintenance_records')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
