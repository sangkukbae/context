/**
 * Basic Health Check Test
 *
 * Simple test to verify the application is running and accessible
 */
import { test, expect } from '@playwright/test'

const _baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3003'

test.describe('Basic Application Health', () => {
  test('should have accessible health endpoint', async ({ page }) => {
    const _response = await page.request.get(`${baseURL}/api/health`)

    // Health endpoint returns 206 for degraded status (expected with placeholder OpenAI key)
    expect([200, 206]).toContain(response.status())

    const _data = await response.json()
    expect(data).toBeDefined()
    expect(data.status).toBeDefined()
    expect(data.timestamp).toBeDefined()
    expect(data.version).toBeDefined()
  })

  test('should serve the main application page', async ({ page }) => {
    await page.goto(`${baseURL}/`)

    // Should stay on homepage for unauthenticated users (landing page)
    await expect(page).toHaveURL(`${baseURL}/`)

    // Landing page elements should be present
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('h1:has-text("Context")')).toBeVisible()
    await expect(page.locator('text=Sign In').first()).toBeVisible()
  })

  test('should have search page available', async ({ page }) => {
    // Visit search page (may redirect to auth)
    await page.goto(`${baseURL}/search`)

    // Should either show search page or redirect to sign-in
    const _url = page.url()
    const _hasSearchInUrl = url.includes('/search') || url.includes('/auth/sign-in')
    expect(hasSearchInUrl).toBe(true)
  })

  test('should have functioning API route structure', async ({ page }) => {
    // Test API route exists (even if it requires auth)
    const _response = await page.request.post(`${baseURL}/api/search`, {
      headers: { 'Content-Type': 'application/json' },
      data: { query: 'test' },
    })

    // Should get a response (401 unauthorized is expected without auth)
    expect([200, 401, 400]).toContain(response.status())
  })
})
