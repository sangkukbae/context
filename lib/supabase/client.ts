import { createBrowserClient } from '@supabase/ssr'

// Read from public env on the client to avoid importing server-only modules
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase public configuration is missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  )
}

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type SupabaseClient = typeof supabase
