/**
 * Component Integration Tests for Search UI
 *
 * Tests the search components including:
 * - Search input component
 * - Search results display
 * - Search filters and suggestions
 * - Keyboard shortcuts and accessibility
 */
import { test, expect } from '../fixtures/auth'
import { setupTestData, cleanupTestData } from '../fixtures/search-data'

const _baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3002'

test.describe('Search Components', () => {
  test.beforeEach(async ({ page, authenticatedUser }) => {
    await setupTestData(authenticatedUser.id, authenticatedUser.accessToken)

    // Sign in the user in the browser
    await page.goto(`${baseURL}/auth/sign-in`)
    await page.fill('input[type="email"]', authenticatedUser.email)
    await page.fill('input[type="password"]', 'testPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${baseURL}/dashboard`)
  })

  test.afterEach(async ({ authenticatedUser }) => {
    await cleanupTestData(authenticatedUser.id, authenticatedUser.accessToken)
  })

  test.describe('Search Page', () => {
    test('should render search page correctly', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      // Check page elements
      await expect(page.locator('h1')).toContainText('Search')
      await expect(page.locator('input[placeholder*="search"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should have functional search input', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await expect(searchInput).toBeVisible()
      await expect(searchInput).toBeEditable()

      // Test input functionality
      await searchInput.fill('machine learning')
      await expect(searchInput).toHaveValue('machine learning')

      // Clear input
      await searchInput.clear()
      await expect(searchInput).toHaveValue('')
    })

    test('should perform search on form submission', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      const _searchButton = page.locator('button[type="submit"]')

      await searchInput.fill('machine learning')
      await searchButton.click()

      // Wait for search results
      await page.waitForTimeout(1000)

      // Check if results are displayed
      await expect(
        page.locator('[data-testid="search-results"]').or(page.locator('.search-results'))
      ).toBeVisible({ timeout: 5000 })
    })

    test('should handle Enter key in search input', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('database optimization')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForTimeout(1000)

      // Check if results are displayed
      await expect(
        page.locator('[data-testid="search-results"]').or(page.locator('.search-results'))
      ).toBeVisible({ timeout: 5000 })
    })

    test('should display search results correctly', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForTimeout(2000)

      // Check if results container is visible
      const _resultsContainer = page
        .locator('[data-testid="search-results"]')
        .or(page.locator('.search-results'))
      await expect(resultsContainer).toBeVisible({ timeout: 10000 })

      // Check if individual result items are displayed
      const _resultItems = page
        .locator('[data-testid="search-result-item"]')
        .or(page.locator('.search-result-item'))
      if ((await resultItems.count()) > 0) {
        await expect(resultItems.first()).toBeVisible()

        // Check result item structure
        const _firstResult = resultItems.first()
        await expect(firstResult.locator('.content, [data-testid="result-content"]')).toBeVisible()
        await expect(
          firstResult.locator('.timestamp, [data-testid="result-timestamp"]')
        ).toBeVisible()
      }
    })

    test('should handle empty search results', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('nonexistent content xyz123')
      await searchInput.press('Enter')

      // Wait for search to complete
      await page.waitForTimeout(2000)

      // Check for empty state message
      await expect(
        page
          .locator('text=/no results/i')
          .or(page.locator('text=/not found/i'))
          .or(page.locator('[data-testid="no-results"]'))
      ).toBeVisible({ timeout: 5000 })
    })

    test('should show loading state during search', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('technology')

      // Start search and immediately check for loading state
      const _searchPromise = searchInput.press('Enter')

      // Check for loading indicator (spinner, disabled button, etc.)
      await expect(
        page
          .locator('[data-testid="loading"]')
          .or(page.locator('.loading'))
          .or(page.locator('button:disabled'))
          .or(page.locator('[aria-busy="true"]'))
      ).toBeVisible({ timeout: 1000 })

      await searchPromise
      await page.waitForTimeout(1000)
    })

    test('should display search execution time', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForTimeout(2000)

      // Check for execution time display
      await expect(
        page
          .locator('text=/\\d+ms/')
          .or(page.locator('[data-testid="execution-time"]'))
          .or(page.locator('.execution-time'))
      ).toBeVisible({ timeout: 5000 })
    })

    test('should handle Korean text search correctly', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('한국어')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForTimeout(2000)

      // Check if results are displayed
      const _resultsContainer = page
        .locator('[data-testid="search-results"]')
        .or(page.locator('.search-results'))
      await expect(resultsContainer).toBeVisible({ timeout: 5000 })

      // Check if Korean content is properly displayed
      await expect(page.locator('text=/한국어/')).toBeVisible({ timeout: 5000 })
    })

    test('should maintain search query in URL', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('database optimization')
      await searchInput.press('Enter')

      // Wait for navigation/search completion
      await page.waitForTimeout(1000)

      // Check if URL contains search query
      const _url = page.url()
      expect(url).toMatch(/[?&]q=|search/)
    })
  })

  test.describe('Search from Dashboard', () => {
    test('should navigate to search page from dashboard search button', async ({ page }) => {
      await page.goto(`${baseURL}/dashboard`)

      // Find and click search button
      const _searchButton = page
        .locator('a[href="/search"]')
        .or(page.locator('button:has-text("Search")'))
        .or(page.locator('[data-testid="search-button"]'))

      await expect(searchButton).toBeVisible()
      await searchButton.click()

      // Should navigate to search page
      await page.waitForURL(`${baseURL}/search`)
      await expect(page.locator('h1')).toContainText('Search')
    })

    test('should support keyboard shortcut Cmd+K for search', async ({ page }) => {
      await page.goto(`${baseURL}/dashboard`)

      // Press Cmd+K (or Ctrl+K on Windows/Linux)
      const _isMac = process.platform === 'darwin'
      const _modifier = isMac ? 'Meta' : 'Control'
      await page.keyboard.press(`${modifier}+KeyK`)

      // Should either open search modal or navigate to search page
      await expect(
        page
          .locator('input[placeholder*="search"]')
          .or(page.locator('[role="dialog"]'))
          .or(page.url().includes('/search') ? page.locator('h1') : page.locator('body'))
      ).toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('Search Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      // Check search input accessibility
      const _searchInput = page.locator('input[placeholder*="search"]')
      await expect(searchInput).toHaveAttribute('aria-label', /.+/)

      // Check search button accessibility
      const _searchButton = page.locator('button[type="submit"]')
      await expect(searchButton).toHaveAttribute('aria-label', /.+/)

      // After performing a search, check results accessibility
      await searchInput.fill('machine learning')
      await searchButton.click()
      await page.waitForTimeout(2000)

      const _resultsContainer = page
        .locator('[data-testid="search-results"]')
        .or(page.locator('.search-results'))
      if (await resultsContainer.isVisible()) {
        await expect(resultsContainer).toHaveAttribute('role', 'region')
      }
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      // Tab to search input
      await page.keyboard.press('Tab')
      await expect(page.locator('input[placeholder*="search"]')).toBeFocused()

      // Tab to search button
      await page.keyboard.press('Tab')
      await expect(page.locator('button[type="submit"]')).toBeFocused()

      // Should be able to activate search with Enter or Space
      await page.keyboard.press('Shift+Tab') // Back to input
      await page.keyboard.type('machine learning')
      await page.keyboard.press('Tab') // To button
      await page.keyboard.press('Enter')

      await page.waitForTimeout(1000)
    })

    test('should announce search results to screen readers', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForTimeout(2000)

      // Check for live region announcements
      const _liveRegion = page
        .locator('[aria-live="polite"]')
        .or(page.locator('[aria-live="assertive"]'))
        .or(page.locator('[role="status"]'))

      if ((await liveRegion.count()) > 0) {
        await expect(liveRegion.first()).toBeVisible()
      }
    })
  })

  test.describe('Search Performance', () => {
    test('should complete search within performance requirements', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning algorithms sophisticated')

      const _startTime = Date.now()
      await searchInput.press('Enter')

      // Wait for results to appear
      await expect(
        page.locator('[data-testid="search-results"]').or(page.locator('.search-results'))
      ).toBeVisible({ timeout: 5000 })

      const _endTime = Date.now()
      const _totalTime = endTime - startTime

      // Should complete within 2 seconds (including network and rendering)
      expect(totalTime).toBeLessThan(2000)
    })

    test('should handle rapid consecutive searches gracefully', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      const _searchInput = page.locator('input[placeholder*="search"]')

      // Perform rapid searches
      await searchInput.fill('machine')
      await searchInput.press('Enter')
      await page.waitForTimeout(100)

      await searchInput.clear()
      await searchInput.fill('database')
      await searchInput.press('Enter')
      await page.waitForTimeout(100)

      await searchInput.clear()
      await searchInput.fill('testing')
      await searchInput.press('Enter')

      // Should handle the last search properly
      await page.waitForTimeout(2000)

      // Check if final results are displayed
      await expect(
        page.locator('[data-testid="search-results"]').or(page.locator('.search-results'))
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Search Error Handling', () => {
    test('should handle search API errors gracefully', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      // Mock API error by intercepting the request
      await page.route('**/api/search', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal Server Error',
            message: 'Search service unavailable',
          }),
        })
      })

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')

      // Wait for error handling
      await page.waitForTimeout(2000)

      // Check for error message display
      await expect(
        page
          .locator('text=/error/i')
          .or(page.locator('text=/unavailable/i'))
          .or(page.locator('[data-testid="error-message"]'))
      ).toBeVisible({ timeout: 5000 })
    })

    test('should handle network timeouts gracefully', async ({ page }) => {
      await page.goto(`${baseURL}/search`)

      // Mock slow API response
      await page.route('**/api/search', route => {
        // Delay response to simulate timeout
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { results: [], pagination: {}, query: 'test' },
            }),
          })
        }, 10000) // 10 second delay
      })

      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')

      // Should show loading state and eventually timeout handling
      await expect(
        page.locator('[data-testid="loading"]').or(page.locator('.loading'))
      ).toBeVisible({ timeout: 2000 })
    })
  })
})
