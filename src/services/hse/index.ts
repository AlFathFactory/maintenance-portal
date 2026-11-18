import { supabase } from '../supabaseClient';
import { createHSERepository } from './repository';

export { createHSERepository } from './repository';
export const hseRepository = createHSERepository(supabase);
