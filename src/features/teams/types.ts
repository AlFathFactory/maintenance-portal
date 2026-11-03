export type StaffRole = 'engineer' | 'leader' | 'technician';

export interface Staff {
  id: string;
  full_name: string;
  role: StaffRole;
}

export interface Team {
  id: string;
  name: string;
  engineer_id: string;
  leader_id: string;
}

export interface Membership {
  team_id: string;
  staff_id: string;
}

export interface StaffContact {
  staff_id: string;
  phone: string | null;
}

export interface TeamDirectory {
  staff: Staff[];
  teams: Team[];
  members: Membership[];
  contacts: StaffContact[];
  contactsRestricted: boolean;
}

export interface StaffInput {
  full_name: string;
  role: StaffRole;
  phone?: string | null;
}
