import { createBrowserClient } from '@supabase/ssr'
import { supabase as supabaseConfig } from '../env'

if (!supabaseConfig) {
  throw new Error('Supabase configuration is missing. Please check your environment variables.')
}

export const supabase = createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)

export type SupabaseClient = typeof supabase
