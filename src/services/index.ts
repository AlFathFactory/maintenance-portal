import { env } from '../config/env';
import { demoRepository } from './demoRepository';
import { supabaseRepository } from './supabaseRepository';

export const repository = env.isDemo ? demoRepository : supabaseRepository;
