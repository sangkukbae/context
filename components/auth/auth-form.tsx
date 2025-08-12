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
import { Separator } from '@/components/ui/separator'
import { signInWithPassword, signUpWithPassword, signInWithOAuth } from '@/lib/auth/client'
import { useAuthOperation } from '@/lib/auth/hooks'
import { AuthProvider } from '@/lib/auth/types'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const signUpSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type SignInFormData = z.infer<typeof signInSchema>
type SignUpFormData = z.infer<typeof signUpSchema>

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up'
  redirectTo?: string
  onSuccess?: () => void
  onModeChange?: (mode: 'sign-in' | 'sign-up') => void
}

export function AuthForm({ mode, redirectTo, onSuccess, onModeChange }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const { isLoading, error, execute, clearError } = useAuthOperation()

  const form = useForm<SignInFormData | SignUpFormData>({
    resolver: zodResolver(mode === 'sign-in' ? signInSchema : signUpSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      ...(mode === 'sign-up' && { name: '', confirmPassword: '' }),
    },
  })

  const onSubmit = async (data: SignInFormData | SignUpFormData) => {
    clearError()

    if (mode === 'sign-in') {
      const result = await execute(() => signInWithPassword(data.email, data.password))
      if (result) {
        onSuccess?.()
        if (redirectTo) {
          window.location.href = redirectTo
        }
      }
    } else {
      const signUpData = data as SignUpFormData
      const result = await execute(() =>
        signUpWithPassword(signUpData.email, signUpData.password, signUpData.name, redirectTo)
      )
      if (result !== null) {
        // Show success message for email confirmation
        onSuccess?.()
      }
    }
  }

  const handleOAuthSignIn = async (provider: AuthProvider) => {
    clearError()
    await execute(() => signInWithOAuth(provider, redirectTo))
  }

  const isSignIn = mode === 'sign-in'
  const isSignUp = mode === 'sign-up'

  return (
    <Card className="w-full max-w-md p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">{isSignIn ? 'Welcome back' : 'Create your account'}</h1>
        <p className="text-gray-600 mt-2">
          {isSignIn
            ? 'Sign in to your Context account'
            : 'Start organizing your thoughts with Context'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      {/* OAuth Providers */}
      <div className="space-y-2 mb-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthSignIn('google')}
          disabled={isLoading}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthSignIn('github')}
          disabled={isLoading}
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </Button>
      </div>

      <Separator className="my-4" />

      {/* Email/Password Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isSignUp && (
          <div>
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              disabled={isLoading}
              {...form.register('name' as any)}
            />
            {isSignUp && (form.formState.errors as any).name && (
              <p className="text-sm text-red-600 mt-1">
                {(form.formState.errors as any).name.message}
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            disabled={isLoading}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            disabled={isLoading}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.password.message}</p>
          )}
        </div>

        {isSignUp && (
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              disabled={isLoading}
              {...form.register('confirmPassword' as any)}
            />
            {isSignUp && (form.formState.errors as any).confirmPassword && (
              <p className="text-sm text-red-600 mt-1">
                {(form.formState.errors as any).confirmPassword?.message}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={e => setShowPassword(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Show password</span>
          </label>

          {isSignIn && (
            <Link href="/auth/reset-password" className="text-sm text-blue-600 hover:text-blue-800">
              Forgot password?
            </Link>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Loading...' : isSignIn ? 'Sign In' : 'Create Account'}
        </Button>
      </form>

      {/* Mode Switch */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          {isSignIn ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => onModeChange?.(isSignIn ? 'sign-up' : 'sign-in')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {isSignIn ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      {isSignUp && (
        <p className="text-xs text-gray-500 text-center mt-4">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:text-blue-800">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-800">
            Privacy Policy
          </Link>
        </p>
      )}
    </Card>
  )
}
