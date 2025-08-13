import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getOAuthErrorInfo, logOAuthEvent } from '@/lib/auth/oauth-utils'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const errorCode = requestUrl.searchParams.get('error_code')

  // Log callback with debugging info
  logOAuthEvent('callback_received', {
    hasCode: !!code,
    error,
    errorDescription,
    errorCode,
    url: requestUrl.toString(),
  })

  if (error) {
    const errorInfo = getOAuthErrorInfo(error, errorDescription || undefined)

    logOAuthEvent(
      'callback_error',
      {
        error,
        errorDescription,
        errorCode,
        userMessage: errorInfo.userMessage,
        isGitHubPrivacyIssue: errorInfo.isGitHubPrivacyIssue,
      },
      'error'
    )

    return NextResponse.redirect(
      new URL(
        `/auth/sign-in?error=${error}&error_description=${encodeURIComponent(errorInfo.userMessage)}`,
        requestUrl.origin
      )
    )
  }

  if (code) {
    try {
      const supabase = await createSupabaseServerClient()

      logOAuthEvent('code_exchange_attempt', { codeLength: code.length })

      // Exchange the OAuth code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        logOAuthEvent(
          'code_exchange_error',
          {
            error: exchangeError.message,
            status: exchangeError.status,
            name: exchangeError.name,
          },
          'error'
        )

        // Provide more specific error messages
        let userMessage = exchangeError.message
        if (exchangeError.message.includes('Invalid exchange')) {
          userMessage = 'Authentication code expired or invalid. Please try signing in again.'
        } else if (exchangeError.message.includes('user profile')) {
          userMessage =
            'Unable to retrieve your profile information. Please check your privacy settings and try again.'
        }

        return NextResponse.redirect(
          new URL(
            `/auth/sign-in?error=exchange_failed&error_description=${encodeURIComponent(userMessage)}`,
            requestUrl.origin
          )
        )
      }

      if (data.session) {
        logOAuthEvent('session_created', {
          userId: data.session.user.id,
          email: data.session.user.email,
          provider: data.session.user.app_metadata.provider,
        })

        // Get redirect URL from state or default to dashboard
        const state = requestUrl.searchParams.get('state')
        let redirectTo = '/dashboard'

        if (state) {
          try {
            const stateData = JSON.parse(decodeURIComponent(state))
            redirectTo = stateData.redirectTo || '/dashboard'
          } catch {
            // Invalid state, use default
            logOAuthEvent('invalid_state', { state }, 'warn')
          }
        }

        logOAuthEvent('oauth_success', { redirectTo })
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
      } else {
        logOAuthEvent('no_session_created', {}, 'error')
        return NextResponse.redirect(
          new URL(
            `/auth/sign-in?error=no_session&error_description=${encodeURIComponent('Authentication completed but no session was created')}`,
            requestUrl.origin
          )
        )
      }
    } catch (error) {
      logOAuthEvent(
        'unexpected_error',
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        'error'
      )

      return NextResponse.redirect(
        new URL(
          `/auth/sign-in?error=unexpected_error&error_description=${encodeURIComponent('An unexpected error occurred during authentication')}`,
          requestUrl.origin
        )
      )
    }
  }

  // No code parameter, redirect to sign in
  logOAuthEvent('no_code_parameter', {}, 'warn')
  return NextResponse.redirect(new URL('/auth/sign-in', requestUrl.origin))
}
