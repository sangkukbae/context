'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { useAuth } from '@/lib/auth/hooks'
import { Alert } from '@/components/ui/alert'

function SignUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-up')
  const [showEmailSent, setShowEmailSent] = useState(false)

  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push(redirectTo)
    }
  }, [status, router, redirectTo])

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
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
