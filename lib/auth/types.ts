// Auth Provider Types
export type AuthProvider = 'google' | 'github'

// Extended User type that combines Supabase auth user with our profile data
export interface User {
  id: string
  email: string
  name?: string | null
  avatar?: string | null
  emailVerified?: boolean
  provider?: string
  createdAt: string
  updatedAt: string
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    autoSave?: boolean
    notifications?: boolean
    clusterSuggestions?: boolean
  }
  subscriptionPlan: 'free' | 'pro' | 'team'
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | null
  subscriptionCurrentPeriodEnd?: string | null
}

// Auth Session type
export interface AuthSession {
  user: User
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

// Auth State types
export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User; session: AuthSession }
  | { status: 'unauthenticated' }

// Auth Error types
export type AuthError = {
  message: string
  code?: string
  details?: string
}

// Sign In/Up options
export interface SignInOptions {
  email: string
  password: string
}

export interface SignUpOptions {
  email: string
  password: string
  name?: string
  redirectTo?: string
}

export interface OAuthSignInOptions {
  provider: AuthProvider
  redirectTo?: string
  scopes?: string
}

// Password reset options
export interface ResetPasswordOptions {
  email: string
  redirectTo?: string
}

export interface UpdatePasswordOptions {
  password: string
  confirmPassword: string
}

// Profile update options
export interface UpdateProfileOptions {
  name?: string | null
  avatar?: string | null
  preferences?: User['preferences']
}

// Auth Action Results
export type AuthResult<T = void> = { success: true; data: T } | { success: false; error: AuthError }

// Middleware types
export interface AuthMiddlewareConfig {
  requireAuth?: boolean
  redirectTo?: string
  allowedRoles?: string[]
}
