/**
 * Test Fixtures for Authentication
 */
/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

export interface AuthenticatedUser {
  id: string
  email: string
  accessToken: string
}

type TestFixtures = {
  authenticatedUser: AuthenticatedUser
  apiHeaders: Record<string, string>
}

export const test = base.extend<TestFixtures>({
  authenticatedUser: async ({}, use) => {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey)

    // Create a test user or use existing test credentials
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'testPassword123!'

    // Sign up test user
    const { error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })

    if (signUpError && !signUpError.message.includes('already registered')) {
      throw new Error(`Test user creation failed: ${signUpError.message}`)
    }

    // Sign in to get access token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })

    if (signInError) {
      throw new Error(`Test user sign in failed: ${signInError.message}`)
    }

    const user = signInData.user
    const session = signInData.session

    if (!user || !session) {
      throw new Error('Failed to authenticate test user')
    }

    await use({
      id: user.id,
      email: user.email!,
      accessToken: session.access_token,
    })

    // Cleanup - delete test user
    try {
      await supabase.rpc('delete_user', { user_id: user.id })
    } catch (error) {
      console.warn('Failed to cleanup test user:', error)
    }
  },

  apiHeaders: async ({ authenticatedUser }, use) => {
    await use({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authenticatedUser.accessToken}`,
    })
  },
})

export { expect }
