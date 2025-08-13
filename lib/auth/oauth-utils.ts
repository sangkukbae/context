/**
 * OAuth utility functions for handling authentication errors and configurations
 */

export interface OAuthErrorInfo {
  error: string
  description?: string
  userMessage: string
  isGitHubPrivacyIssue: boolean
}

/**
 * Get user-friendly error messages for OAuth errors
 */
export function getOAuthErrorInfo(error: string, description?: string): OAuthErrorInfo {
  const errorMessages: Record<string, string> = {
    server_error: 'Authentication service encountered an error',
    access_denied: 'Access was denied. Please try again',
    temporarily_unavailable: 'Authentication service is temporarily unavailable',
    exchange_failed: 'Failed to complete authentication',
    unexpected_error: 'An unexpected error occurred during authentication',
    no_session: 'Authentication completed but no session was created',
  }

  let userMessage = errorMessages[error] || 'Authentication failed. Please try again'
  let isGitHubPrivacyIssue = false

  // Handle specific GitHub privacy/profile issues
  if (error === 'server_error' && description?.includes('Error getting user profile')) {
    userMessage =
      'Unable to access your GitHub profile. This might be because your email is set to private in GitHub. Please ensure your GitHub account has a public email address or try using Google sign-in instead.'
    isGitHubPrivacyIssue = true
  } else if (error === 'server_error' && description?.includes('user profile')) {
    userMessage =
      'Unable to retrieve your profile information. Please check your privacy settings and try again.'
    isGitHubPrivacyIssue = true
  }

  return {
    error,
    description,
    userMessage,
    isGitHubPrivacyIssue,
  }
}

/**
 * Get GitHub-specific OAuth scopes for proper profile access
 *
 * GitHub OAuth requires specific scopes to access user profile and email:
 * - user:email: Access to user email addresses (required for private emails)
 * - read:user: Access to user profile information
 */
export function getGitHubOAuthScopes(): string {
  return 'user:email read:user'
}

/**
 * Get provider-specific OAuth configuration
 */
export function getOAuthProviderConfig(provider: string): {
  queryParams?: Record<string, string>
} {
  switch (provider) {
    case 'google':
      return {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    case 'github':
      return {
        queryParams: {
          scope: getGitHubOAuthScopes(),
        },
      }
    default:
      return {}
  }
}

/**
 * GitHub troubleshooting steps for users
 */
export const GITHUB_TROUBLESHOOTING_STEPS = [
  'Go to GitHub Settings → Emails',
  'Uncheck "Keep my email addresses private"',
  'Ensure you have at least one verified email address',
  'Or try signing in with Google instead',
] as const

/**
 * Log OAuth event for debugging
 */
export function logOAuthEvent(
  event: string,
  data: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info'
) {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  }

  switch (level) {
    case 'error':
      console.error(`OAuth ${event}:`, logData)
      break
    case 'warn':
      console.warn(`OAuth ${event}:`, logData)
      break
    default:
      console.log(`OAuth ${event}:`, logData)
  }
}
