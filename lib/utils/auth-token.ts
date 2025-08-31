/**
 * Authentication Token Utilities
 *
 * Provides secure and consistent token handling across client components.
 * Centralizes token validation and access patterns.
 */

/**
 * Safely retrieves the authentication token from localStorage
 * Includes basic validation and error handling
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    // Server-side rendering - no localStorage available
    return null
  }

  try {
    const token = localStorage.getItem('supabase.auth.token')

    // Basic token format validation (JWT should have 3 parts)
    if (token && token.split('.').length === 3) {
      return token
    }

    return null
  } catch (error) {
    console.warn('Failed to retrieve auth token from localStorage:', error)
    return null
  }
}

/**
 * Validates if a token exists and appears to be properly formatted
 */
export function hasValidToken(): boolean {
  const token = getAuthToken()
  return token !== null
}

/**
 * Creates authorization headers with the current token
 * Returns null if no valid token is available
 */
export function createAuthHeaders(): { Authorization: string } | null {
  const token = getAuthToken()

  if (!token) {
    return null
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Error to throw when authentication is required but not available
 */
export class AuthenticationRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationRequiredError'
  }
}

/**
 * Throws an error if no valid token is available
 * Useful for functions that require authentication
 */
export function requireAuthToken(): string {
  const token = getAuthToken()

  if (!token) {
    throw new AuthenticationRequiredError()
  }

  return token
}
