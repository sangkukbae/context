/**
 * Authentication Helper for Playwright Tests
 *
 * Provides utilities for handling authentication in tests
 * to verify dashboard text visibility fixes.
 */
import type { Page } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
}

/**
 * Default test user credentials for visibility tests
 */
export const _TEST_USERS = {
  visibility: {
    email: 'visibility-test@example.com',
    password: 'testPassword123!',
  },
  visual: {
    email: 'visual-test@example.com',
    password: 'testPassword123!',
  },
} as const

/**
 * Authenticates a user and navigates to the dashboard
 * Handles both sign-in and sign-up scenarios
 */
export async function authenticateUser(
  page: Page,
  user: TestUser = TEST_USERS.visibility
): Promise<void> {
  try {
    // Try sign in first
    await signIn(page, user)
    await page.waitForURL('/dashboard', { timeout: 5000 })
  } catch (error) {
    console.log('Sign in failed, trying sign up:', error)

    try {
      // If sign in fails, try sign up
      await signUp(page, user)
      await page.waitForURL('/dashboard', { timeout: 10000 })
    } catch (signUpError) {
      console.error('Both sign in and sign up failed:', signUpError)
      throw new Error(`Authentication failed for user ${user.email}`)
    }
  }
}

/**
 * Signs in an existing user
 */
export async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/sign-in')

  // Wait for form to load
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })

  // Fill credentials
  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)

  // Submit form
  await page.locator('button[type="submit"]').click()
}

/**
 * Signs up a new user
 */
export async function signUp(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/sign-up')

  // Wait for form to load
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })

  // Fill credentials
  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)

  // Submit form
  await page.locator('button[type="submit"]').click()
}

/**
 * Signs out the current user
 */
export async function signOut(page: Page): Promise<void> {
  // Look for user menu or sign out button
  const _userMenu = page.locator('[data-testid="user-nav"], [data-testid="user-menu"]')

  if (await userMenu.isVisible()) {
    await userMenu.click()

    const _signOutButton = page.locator('text=Sign out, text=Logout, button[data-testid="sign-out"]')
    if (await signOutButton.isVisible()) {
      await signOutButton.click()
    }
  }

  // Alternatively, navigate to a sign out endpoint if available
  try {
    await page.goto('/auth/sign-out', { timeout: 5000 })
  } catch {
    // Sign out endpoint might not exist
  }
}

/**
 * Waits for the dashboard to load completely
 */
export async function waitForDashboardLoad(page: Page): Promise<void> {
  // Wait for main dashboard elements
  await page.waitForSelector('header', { state: 'visible', timeout: 10000 })
  await page.waitForSelector('main', { state: 'visible', timeout: 10000 })

  // Wait for network to settle
  await page.waitForLoadState('networkidle')

  // Wait for any dynamic content to load
  await page.waitForTimeout(1000)
}

/**
 * Checks if user is authenticated by checking URL
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const _currentUrl = page.url()
  return currentUrl.includes('/dashboard') || !currentUrl.includes('/auth/')
}

/**
 * Creates a unique test user email to avoid conflicts
 */
export function createTestUser(prefix: string = 'test'): TestUser {
  const _timestamp = Date.now()
  const _random = Math.floor(Math.random() * 1000)

  return {
    email: `${prefix}-${timestamp}-${random}@example.com`,
    password: 'testPassword123!',
  }
}
