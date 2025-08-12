'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase/client'
import { type User, type AuthState, type AuthSession } from './types'

/**
 * React hook to manage authentication state
 */
export function useAuth(): AuthState & {
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
} {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const getUser = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data: profile } = await supabase.from('users').select('*').eq('id', userId).single()

      if (!profile) return null

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

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
      console.error('Error getting user profile:', error)
      return null
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
        setState({ status: 'unauthenticated' })
        return
      }

      if (!session) {
        setState({ status: 'unauthenticated' })
        return
      }

      const user = await getUser(session.user.id)
      if (!user) {
        setState({ status: 'unauthenticated' })
        return
      }

      const authSession: AuthSession = {
        user,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      }

      setState({
        status: 'authenticated',
        user,
        session: authSession,
      })
    } catch (error) {
      console.error('Error refreshing user:', error)
      setState({ status: 'unauthenticated' })
    }
  }, [getUser])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setState({ status: 'unauthenticated' })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    refreshUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const user = await getUser(session.user.id)
          if (user) {
            const authSession: AuthSession = {
              user,
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
              expiresAt: session.expires_at,
            }
            setState({
              status: 'authenticated',
              user,
              session: authSession,
            })
          } else {
            setState({ status: 'unauthenticated' })
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setState({ status: 'unauthenticated' })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [getUser, refreshUser])

  return {
    ...state,
    signOut,
    refreshUser,
  }
}

/**
 * Hook to get current user, returns null if not authenticated
 */
export function useUser(): User | null {
  const auth = useAuth()
  return auth.status === 'authenticated' ? auth.user : null
}

/**
 * Hook to get current session, returns null if not authenticated
 */
export function useSession(): AuthSession | null {
  const auth = useAuth()
  return auth.status === 'authenticated' ? auth.session : null
}

/**
 * Hook that requires authentication, redirects if not authenticated
 */
export function useRequireAuth(): User {
  const auth = useAuth()

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      window.location.href = '/auth/sign-in'
    }
  }, [auth.status])

  if (auth.status === 'loading') {
    throw new Promise(() => {}) // Suspend until auth loads
  }

  if (auth.status === 'unauthenticated') {
    throw new Promise(() => {}) // Suspend until redirect
  }

  return auth.user
}

/**
 * Hook for managing loading states during auth operations
 */
export function useAuthOperation() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async <T>(
      operation: () => Promise<{ success: boolean; error?: { message: string }; data?: T }>
    ): Promise<T | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await operation()

        if (!result.success) {
          setError(result.error?.message || 'An error occurred')
          return null
        }

        return result.data || null
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    execute,
    clearError,
  }
}
