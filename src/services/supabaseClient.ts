import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// The browser receives only the publishable key. Database authorization lives in RLS.
export const supabase = env.isDemo
  ? null
  : createClient(env.supabaseUrl, env.supabasePublishableKey);
