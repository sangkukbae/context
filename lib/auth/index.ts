// Export types first
export * from './types'

// Export hooks
export * from './hooks'

// Export specific functions to avoid naming conflicts
export {
  getUser,
  getSession,
  requireAuth,
  requireAuthWithRedirect,
  updateProfile,
  deleteAccount,
  signOut as signOutServer,
} from './server'

export {
  signInWithPassword,
  signUpWithPassword,
  signInWithOAuth,
  resetPassword,
  updatePassword,
  resendConfirmation,
  signOut as signOutClient,
} from './client'
