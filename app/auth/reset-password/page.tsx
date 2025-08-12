'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { useAuth } from '@/lib/auth/hooks'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const [mode, setMode] = useState<'request' | 'reset'>('request')

  useEffect(() => {
    // Check if this is a password reset callback (has access_token and type=recovery)
    const accessToken = searchParams.get('access_token')
    const type = searchParams.get('type')

    if (accessToken && type === 'recovery') {
      setMode('reset')
    }
  }, [searchParams])

  // Redirect if already authenticated (except during password reset)
  useEffect(() => {
    if (status === 'authenticated' && mode !== 'reset') {
      router.push('/dashboard')
    }
  }, [status, router, mode])

  // Show loading while checking auth status
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <ResetPasswordForm
        mode={mode}
        onSuccess={() => {
          // After successful password reset, redirect to sign in
          router.push('/auth/sign-in?message=password_updated')
        }}
      />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
