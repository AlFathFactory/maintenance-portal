import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const { count, error } = await client
  .from('equipment')
  .select('id', { count: 'exact', head: true });
if (error) {
  console.error(`Equipment query failed: ${error.message}`);
  process.exitCode = 1;
} else {
  console.log(`Supabase equipment query succeeded. Rows: ${count}`);
}

const profile = await client
  .from('equipment')
  .select('slug,name,type')
  .eq('slug', 'crane-01')
  .single();
if (profile.error || profile.data?.type !== 'crane') {
  console.error(`Public equipment profile failed: ${profile.error?.message || 'unexpected data'}`);
  process.exitCode = 1;
} else {
  console.log('Public equipment profile succeeded.');
}

for (const table of ['maintenance_admins', 'maintenance_records']) {
  const result = await client.from(table).select('*', { count: 'exact', head: true });
  if (!result.error) {
    console.error(`Anonymous access to ${table} was unexpectedly allowed.`);
    process.exitCode = 1;
  } else {
    console.log(`Anonymous access to ${table} is blocked.`);
  }
}
