import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabase as supabaseConfig } from '../env'

const SUPABASE = (() => {
  if (!supabaseConfig) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.')
  }
  return supabaseConfig
})()

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE.url, SUPABASE.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export async function createSupabaseServiceClient() {
  if (!SUPABASE.serviceRoleKey) {
    throw new Error('Supabase service role key is missing. This is required for admin operations.')
  }

  return createServerClient(SUPABASE.url, SUPABASE.serviceRoleKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // Service role doesn't need cookies
      },
    },
  })
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
export type SupabaseServiceClient = Awaited<ReturnType<typeof createSupabaseServiceClient>>
