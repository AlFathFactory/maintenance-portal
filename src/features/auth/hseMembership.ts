import { supabase } from '../../services/supabaseClient';

export type HSERole = 'hse_engineer' | 'hse_supervisor';

interface HSEMembership {
  user_id: string;
  role: string;
  is_active: boolean;
}

function isHSERole(role: string): role is HSERole {
  return role === 'hse_engineer' || role === 'hse_supervisor';
}

export async function getHSEMembership(userId: string): Promise<{
  membership: (HSEMembership & { role: HSERole }) | null;
  error: string | null;
}> {
  if (!supabase) return { membership: null, error: null };
  const { data, error } = await supabase
    .from('hse_members')
    .select('user_id, role, is_active')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { membership: null, error: error.message };
  if (!data) return { membership: null, error: null };
  if (data.user_id !== userId || !isHSERole(data.role) || typeof data.is_active !== 'boolean') {
    return { membership: null, error: 'Invalid HSE membership data' };
  }
  return { membership: data, error: null };
}
