'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { resetPassword, updatePassword } from '@/lib/auth/client'
import { useAuthOperation } from '@/lib/auth/hooks'
import { CheckCircle, ArrowLeft } from 'lucide-react'

const resetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ResetRequestFormData = z.infer<typeof resetRequestSchema>
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

interface ResetPasswordFormProps {
  mode: 'request' | 'reset'
  onSuccess?: () => void
}

export function ResetPasswordForm({ mode, onSuccess }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { isLoading, error, execute, clearError } = useAuthOperation()

  const requestForm = useForm<ResetRequestFormData>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: '' },
  })

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onRequestSubmit = async (data: ResetRequestFormData) => {
    clearError()
    const result = await execute(() => resetPassword(data.email))
    if (result !== null) {
      setEmailSent(true)
    }
  }

  const onResetSubmit = async (data: ResetPasswordFormData) => {
    clearError()
    const result = await execute(() => updatePassword(data.password))
    if (result !== null) {
      onSuccess?.()
    }
  }

  if (mode === 'request' && emailSent) {
    return (
      <Card className="w-full max-w-md p-6">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-gray-600 mb-6">
            We&apos;ve sent a password reset link to your email address.
          </p>

          <div className="space-y-3">
            <Button onClick={() => setEmailSent(false)} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to reset form
            </Button>

            <Link href="/auth/sign-in" className="block">
              <Button variant="ghost" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">
          {mode === 'request' ? 'Reset your password' : 'Create new password'}
        </h1>
        <p className="text-gray-600 mt-2">
          {mode === 'request'
            ? "Enter your email address and we'll send you a reset link"
            : 'Enter your new password below'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      {mode === 'request' ? (
        <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              disabled={isLoading}
              {...requestForm.register('email')}
            />
            {requestForm.formState.errors.email && (
              <p className="text-sm text-red-600 mt-1">
                {requestForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      ) : (
        <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your new password"
              disabled={isLoading}
              {...resetForm.register('password')}
            />
            {resetForm.formState.errors.password && (
              <p className="text-sm text-red-600 mt-1">
                {resetForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your new password"
              disabled={isLoading}
              {...resetForm.register('confirmPassword')}
            />
            {resetForm.formState.errors.confirmPassword && (
              <p className="text-sm text-red-600 mt-1">
                {resetForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={e => setShowPassword(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Show password</span>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      )}

      <div className="text-center mt-4">
        <Link href="/auth/sign-in" className="text-sm text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 inline mr-1" />
          Back to sign in
        </Link>
      </div>
    </Card>
  )
}
