import type { MaintenanceRepository } from './repository';
import { supabase } from './supabaseClient';
import type { Membership, Staff, StaffContact, Team } from '../features/teams/types';

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
  async listTeamDirectory(includeContacts) {
    const db = client();
    const [staffResult, teamsResult, membersResult] = await Promise.all([
      db.from('maintenance_staff').select('id,full_name,role').order('full_name'),
      db.from('maintenance_teams').select('id,name,engineer_id,leader_id').order('name'),
      db.from('maintenance_team_members').select('team_id,staff_id'),
    ]);
    if (staffResult.error) throw staffResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (membersResult.error) throw membersResult.error;
    let contacts: StaffContact[] = [];
    let contactsRestricted = false;
    if (includeContacts) {
      const result = await db.from('maintenance_staff_contacts').select('staff_id,phone');
      if (result.error) contactsRestricted = true;
      else contacts = result.data as StaffContact[];
    }
    return {
      staff: staffResult.data as Staff[],
      teams: teamsResult.data as Team[],
      members: membersResult.data as Membership[],
      contacts,
      contactsRestricted,
    };
  },
  async createStaff(input) {
    const db = client();
    const { data, error } = await db
      .from('maintenance_staff')
      .insert({ full_name: input.full_name, role: input.role })
      .select('id,full_name,role')
      .single();
    if (error) throw error;
    if (input.phone) {
      const contact = await db
        .from('maintenance_staff_contacts')
        .insert({ staff_id: data.id, phone: input.phone });
      if (contact.error) {
        await db.from('maintenance_staff').delete().eq('id', data.id);
        throw contact.error;
      }
    }
    return data as Staff;
  },
  async updateStaff(id, input) {
    const db = client();
    const { data: previous, error: readError } = await db
      .from('maintenance_staff')
      .select('full_name,role')
      .eq('id', id)
      .single();
    if (readError) throw readError;
    const updated = await db
      .from('maintenance_staff')
      .update({ full_name: input.full_name, role: input.role })
      .eq('id', id)
      .select('id')
      .single();
    if (updated.error) throw updated.error;
    if (input.phone !== undefined) {
      const contact = await db.from('maintenance_staff_contacts').upsert({
        staff_id: id,
        phone: input.phone,
      });
      if (contact.error) {
        await db.from('maintenance_staff').update(previous).eq('id', id);
        throw contact.error;
      }
    }
  },
  async deleteStaff(id) {
    const db = client();
    const membership = await db
      .from('maintenance_team_members')
      .select('team_id,staff_id')
      .eq('staff_id', id)
      .maybeSingle();
    if (membership.error) throw membership.error;
    if (membership.data) {
      const removed = await db.from('maintenance_team_members').delete().eq('staff_id', id);
      if (removed.error) throw removed.error;
    }
    const removedStaff = await db.from('maintenance_staff').delete().eq('id', id).select('id');
    if (removedStaff.error || !removedStaff.data?.length) {
      if (membership.data) await db.from('maintenance_team_members').insert(membership.data);
      throw removedStaff.error ?? new Error('تعذر حذف الموظف.');
    }
  },
  async assignStaff(staffId, teamId) {
    const db = client();
    const current = await db
      .from('maintenance_team_members')
      .select('team_id')
      .eq('staff_id', staffId)
      .maybeSingle();
    if (current.error) throw current.error;
    if (current.data && teamId) {
      if (current.data.team_id === teamId) return;
      const result = await db
        .from('maintenance_team_members')
        .update({ team_id: teamId })
        .eq('staff_id', staffId)
        .select('staff_id')
        .single();
      if (result.error) throw result.error;
    } else if (current.data) {
      const result = await db.from('maintenance_team_members').delete().eq('staff_id', staffId);
      if (result.error) throw result.error;
    } else if (teamId) {
      const result = await db
        .from('maintenance_team_members')
        .insert({ staff_id: staffId, team_id: teamId });
      if (result.error) throw result.error;
    }
  },
  async updateTeam(id, name, engineerId, leaderId) {
    const result = await client()
      .from('maintenance_teams')
      .update({ name, engineer_id: engineerId, leader_id: leaderId })
      .eq('id', id)
      .select('id')
      .single();
    if (result.error) throw result.error;
  },
};
