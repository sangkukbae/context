import { supabase } from '../supabase/client'
import { type AuthProvider, type AuthResult, type User } from './types'
import { getOAuthProviderConfig, logOAuthEvent } from './oauth-utils'

/**
 * Client-side auth utilities for React components
 */

export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult<User>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.name,
        },
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: { message: 'No user returned from sign in' },
      }
    }

    // Get user profile from our database
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (!profile) {
      return {
        success: false,
        error: { message: 'User profile not found' },
      }
    }

    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      name: profile.name,
      avatar: profile.avatar,
      emailVerified: !!data.user.email_confirmed_at,
      provider: data.user.app_metadata.provider,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      preferences: profile.preferences as User['preferences'],
      subscriptionPlan: profile.subscription_plan,
      subscriptionStatus: profile.subscription_status,
      subscriptionCurrentPeriodEnd: profile.subscription_current_period_end,
    }

    return { success: true, data: user }
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

export async function signUpWithPassword(
  email: string,
  password: string,
  name?: string,
  redirectTo?: string
): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: name ? { name } : undefined,
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.name,
        },
      }
    }

    // Note: User profile will be created by the database trigger
    // when the user confirms their email and the auth.users record is created

    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred during sign up',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

export async function signInWithOAuth(
  provider: AuthProvider,
  redirectTo?: string
): Promise<AuthResult> {
  try {
    logOAuthEvent('sign_in_attempt', { provider, redirectTo })

    // Build the callback URL with the final redirect destination
    const callbackUrl = new URL('/auth/callback', window.location.origin)

    // Add state parameter to pass through the final redirect URL
    if (redirectTo) {
      const state = encodeURIComponent(JSON.stringify({ redirectTo }))
      callbackUrl.searchParams.set('state', state)
    }

    // Get provider-specific configuration
    const providerConfig = getOAuthProviderConfig(provider)
    const oauthOptions = {
      redirectTo: callbackUrl.toString(),
      ...providerConfig,
    }

    logOAuthEvent('oauth_config', {
      provider,
      options: oauthOptions,
      callbackUrl: callbackUrl.toString(),
    })

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: oauthOptions,
    })

    if (error) {
      logOAuthEvent(
        'sign_in_error',
        {
          provider,
          error: error.message,
          code: error.name,
        },
        'error'
      )

      return {
        success: false,
        error: {
          message: error.message,
          code: error.name,
        },
      }
    }

    logOAuthEvent('sign_in_redirect', { provider })

    // OAuth sign in redirects, so we don't return user data here
    return { success: true, data: undefined }
  } catch (error) {
    logOAuthEvent(
      'sign_in_unexpected_error',
      {
        provider,
        error: error instanceof Error ? error.message : String(error),
      },
      'error'
    )

    return {
      success: false,
      error: {
        message: 'An unexpected error occurred during OAuth sign in',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

export async function signOut(): Promise<AuthResult> {
  try {
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
        message: 'An unexpected error occurred during sign out',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

export async function resetPassword(email: string, redirectTo?: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
    })

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
        message: 'An unexpected error occurred during password reset',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({
      password,
    })

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
        message: 'An unexpected error occurred during password update',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

export async function resendConfirmation(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

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
        message: 'An unexpected error occurred while resending confirmation',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}
