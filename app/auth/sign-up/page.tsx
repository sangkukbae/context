'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { useAuth } from '@/lib/auth/hooks'
import { Alert } from '@/components/ui/alert'
import { getOAuthErrorInfo, GITHUB_TROUBLESHOOTING_STEPS } from '@/lib/auth/oauth-utils'

function SignUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-up')
  const [showEmailSent, setShowEmailSent] = useState(false)

  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push(redirectTo)
    }
  }, [status, router, redirectTo])

  // Clear URL parameters after showing error to prevent showing error on page refresh
  useEffect(() => {
    if (oauthError) {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      newUrl.searchParams.delete('error_description')
      newUrl.searchParams.delete('error_code')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [oauthError])

  // Show loading while checking auth status
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Don't render form if already authenticated
  if (status === 'authenticated') {
    return null
  }

  // Get OAuth error information
  const errorInfo = oauthError
    ? getOAuthErrorInfo(oauthError, oauthErrorDescription || undefined)
    : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {errorInfo && (
          <Alert variant="destructive" className="mb-6">
            <div>
              <h4 className="font-semibold">Sign-up Error</h4>
              <p className="text-sm mt-1">{errorInfo.userMessage}</p>
              {errorInfo.isGitHubPrivacyIssue && (
                <div className="text-xs mt-2 text-red-600">
                  <p>To fix GitHub sign-in issues:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {GITHUB_TROUBLESHOOTING_STEPS.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Alert>
        )}

        {showEmailSent && (
          <Alert className="mb-6">
            <div className="text-center">
              <h3 className="font-semibold">Check your email!</h3>
              <p className="text-sm mt-1">
                We&apos;ve sent you a confirmation link. Please check your email and click the link
                to verify your account.
              </p>
            </div>
          </Alert>
        )}

        <AuthForm
          mode={mode}
          redirectTo={redirectTo}
          onSuccess={() => {
            if (mode === 'sign-up') {
              setShowEmailSent(true)
            } else {
              router.push(redirectTo)
            }
          }}
          onModeChange={setMode}
        />
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}
