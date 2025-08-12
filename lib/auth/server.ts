import { createSupabaseServerClient } from '../supabase/server'
import { redirect } from 'next/navigation'
import { type User, type AuthResult } from './types'

/**
 * Server-side auth utilities for Next.js Server Components and Server Actions
 */

export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user profile from our database
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

    if (!profile) {
      return null
    }

    return {
      id: user.id,
      email: user.email!,
      name: profile.name,
      avatar: profile.avatar,
      emailVerified: !!user.email_confirmed_at,
      provider: user.app_metadata.provider,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      preferences: profile.preferences as User['preferences'],
      subscriptionPlan: profile.subscription_plan,
      subscriptionStatus: profile.subscription_status,
      subscriptionCurrentPeriodEnd: profile.subscription_current_period_end,
    }
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

export async function getSession() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return null
    }

    const user = await getUser()
    if (!user) {
      return null
    }

    return {
      user,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    }
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  return user
}

export async function requireAuthWithRedirect(redirectTo = '/auth/sign-in'): Promise<User> {
  const user = await getUser()

  if (!user) {
    redirect(redirectTo)
  }

  return user
}

/**
 * Server action to sign out user
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.name,
        },
      }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

/**
 * Server action to update user profile
 */
export async function updateProfile(updates: {
  name?: string | null
  avatar?: string | null
  preferences?: User['preferences']
}): Promise<AuthResult<User>> {
  try {
    const supabase = await createSupabaseServerClient()

    // First check if user is authenticated
    const currentUser = await getUser()
    if (!currentUser) {
      return {
        success: false,
        error: { message: 'User not authenticated' },
      }
    }

    // Update the user profile in our database
    const { error } = await supabase
      .from('users')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.avatar !== undefined && { avatar: updates.avatar }),
        ...(updates.preferences && { preferences: updates.preferences }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      }
    }

    // Return updated user
    const updatedUser = await getUser()
    if (!updatedUser) {
      return {
        success: false,
        error: { message: 'Failed to retrieve updated user' },
      }
    }

    return { success: true, data: updatedUser }
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Failed to update profile',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

/**
 * Server action to delete user account
 */
export async function deleteAccount(): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient()

    const currentUser = await getUser()
    if (!currentUser) {
      return {
        success: false,
        error: { message: 'User not authenticated' },
      }
    }

    // Delete user data from our tables (cascade will handle related data)
    const { error: deleteError } = await supabase.from('users').delete().eq('id', currentUser.id)

    if (deleteError) {
      return {
        success: false,
        error: {
          message: deleteError.message,
          code: deleteError.code,
        },
      }
    }

    // Sign out the user
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      console.warn('Failed to sign out after account deletion:', signOutError)
    }

    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Failed to delete account',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}
