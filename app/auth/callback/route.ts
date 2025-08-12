import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(
        `/auth/sign-in?error=${error}&error_description=${encodeURIComponent(errorDescription || 'Authentication failed')}`,
        requestUrl.origin
      )
    )
  }

  if (code) {
    try {
      const supabase = await createSupabaseServerClient()

      // Exchange the OAuth code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(
          new URL(
            `/auth/sign-in?error=exchange_failed&error_description=${encodeURIComponent(exchangeError.message)}`,
            requestUrl.origin
          )
        )
      }

      if (data.session) {
        // Get redirect URL from state or default to dashboard
        const state = requestUrl.searchParams.get('state')
        let redirectTo = '/dashboard'

        if (state) {
          try {
            const stateData = JSON.parse(decodeURIComponent(state))
            redirectTo = stateData.redirectTo || '/dashboard'
          } catch (e) {
            // Invalid state, use default
            console.warn('Invalid state parameter:', e)
          }
        }

        console.log('OAuth success, redirecting to:', redirectTo)
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
      }
    } catch (error) {
      console.error('Unexpected error in OAuth callback:', error)
      return NextResponse.redirect(
        new URL(
          `/auth/sign-in?error=unexpected_error&error_description=${encodeURIComponent('An unexpected error occurred during authentication')}`,
          requestUrl.origin
        )
      )
    }
  }

  // No code parameter, redirect to sign in
  return NextResponse.redirect(new URL('/auth/sign-in', requestUrl.origin))
}
