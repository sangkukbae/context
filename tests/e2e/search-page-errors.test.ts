/**
 * Search Page Error Detection Tests
 *
 * Comprehensive error monitoring for the search page specifically focused on:
 * - Next.js App Router serialization errors
 * - Client Component prop validation errors
 * - Console error detection and categorization
 * - Performance regression detection
 */

import { test, expect } from '../fixtures/auth'
import { setupTestData, cleanupTestData } from '../fixtures/search-data'

const _baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3002'

interface ConsoleMessage {
  type: string
  text: string
  timestamp: number
  location?: string
}

test.describe('Search Page Error Detection', () => {
  test.beforeEach(async ({ page, authenticatedUser }) => {
    // Set up test data
    await setupTestData(authenticatedUser.id, authenticatedUser.accessToken)

    // Sign in the user
    await page.goto(`${baseURL}/auth/sign-in`)
    await page.fill('input[type="email"]', authenticatedUser.email)
    await page.fill('input[type="password"]', 'testPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${baseURL}/dashboard`)
  })

  test.afterEach(async ({ authenticatedUser }) => {
    await cleanupTestData(authenticatedUser.id, authenticatedUser.accessToken)
  })

  test.describe('Console Error Monitoring', () => {
    test('should capture and categorize all console errors on search page', async ({ page }) => {
      const consoleMessages: ConsoleMessage[] = []

      // Comprehensive console monitoring
      page.on('console', msg => {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
          timestamp: Date.now(),
          location: msg.location()?.url || 'unknown',
        })
      })

      // Monitor for uncaught exceptions
      const pageErrors: Error[] = []
      page.on('pageerror', error => {
        pageErrors.push(error)
      })

      // Monitor for request failures
      const failedRequests: string[] = []
      page.on('requestfailed', request => {
        failedRequests.push(
          `${request.method()} ${request.url()} - ${request.failure()?.errorText}`
        )
      })

      // Navigate to search page
      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000) // Allow time for all errors to surface

      // Categorize console messages
      const _errors = consoleMessages.filter(msg => msg.type === 'error')
      const _warnings = consoleMessages.filter(msg => msg.type === 'warning')

      // Specific Next.js App Router errors
      const _appRouterErrors = errors.filter(
        error =>
          error.text.includes('Event handlers cannot be passed to Client Component props') ||
          error.text.includes('Functions cannot be passed directly to Client Components') ||
          error.text.includes('Unsupported Server Component prop') ||
          error.text.includes('Cannot pass function as prop to client component') ||
          error.text.includes('Error: Functions cannot be passed') ||
          error.text.includes('Hydration failed') ||
          error.text.includes('Warning: Text content did not match')
      )

      // Client Component specific errors
      const _clientComponentErrors = errors.filter(
        error =>
          error.text.includes('client component') ||
          error.text.includes('Client Component') ||
          error.text.includes('use client')
      )

      // Serialization errors
      const _serializationErrors = errors.filter(
        error =>
          error.text.includes('serialize') ||
          error.text.includes('JSON.stringify') ||
          error.text.includes('circular structure') ||
          error.text.includes('Converting circular structure to JSON')
      )

      // React-specific errors
      const _reactErrors = errors.filter(
        error =>
          error.text.includes('React') ||
          error.text.includes('hook') ||
          error.text.includes('useEffect') ||
          error.text.includes('useState')
      )

      // Generate detailed error report
      console.log('=== Console Error Analysis ===')
      console.log(`Total console messages: ${consoleMessages.length}`)
      console.log(`Errors: ${errors.length}`)
      console.log(`Warnings: ${warnings.length}`)
      console.log(`Page errors: ${pageErrors.length}`)
      console.log(`Failed requests: ${failedRequests.length}`)

      if (appRouterErrors.length > 0) {
        console.log('\n=== App Router Errors ===')
        appRouterErrors.forEach(error => console.log(`- ${error.text}`))
      }

      if (clientComponentErrors.length > 0) {
        console.log('\n=== Client Component Errors ===')
        clientComponentErrors.forEach(error => console.log(`- ${error.text}`))
      }

      if (serializationErrors.length > 0) {
        console.log('\n=== Serialization Errors ===')
        serializationErrors.forEach(error => console.log(`- ${error.text}`))
      }

      if (pageErrors.length > 0) {
        console.log('\n=== Uncaught Page Errors ===')
        pageErrors.forEach(error => console.log(`- ${error.message}`))
      }

      if (failedRequests.length > 0) {
        console.log('\n=== Failed Requests ===')
        failedRequests.forEach(request => console.log(`- ${request}`))
      }

      // Critical assertion: NO App Router or Client Component errors
      expect(appRouterErrors).toHaveLength(0)
      expect(clientComponentErrors).toHaveLength(0)
      expect(serializationErrors).toHaveLength(0)
      expect(pageErrors).toHaveLength(0)

      // Log any unexpected errors for investigation
      const _unexpectedErrors = errors.filter(
        error =>
          !error.text.includes('Failed to load resource') && // Common dev server issues
          !error.text.includes('favicon.ico') && // Favicon not found
          !error.text.includes('404') && // 404 errors
          !error.text.includes('network') // Network issues
      )

      if (unexpectedErrors.length > 0) {
        console.log('\n=== Unexpected Errors (Investigation Needed) ===')
        unexpectedErrors.forEach(error => console.log(`- ${error.text} (${error.location})`))
      }
    })

    test('should detect hydration mismatches', async ({ page }) => {
      const hydrationErrors: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          const _text = msg.text()
          if (
            text.includes('Hydration') ||
            text.includes('hydration') ||
            text.includes('Warning: Text content did not match') ||
            text.includes('Warning: Expected server HTML to contain') ||
            text.includes('Hydration failed because the initial UI does not match')
          ) {
            hydrationErrors.push(text)
          }
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(5000) // Give extra time for hydration

      // Test search functionality to trigger any hydration issues
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('hydration test')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      // Assert no hydration errors
      if (hydrationErrors.length > 0) {
        console.error('Hydration errors detected:')
        hydrationErrors.forEach(error => console.error(`- ${error}`))
      }
      expect(hydrationErrors).toHaveLength(0)
    })
  })

  test.describe('Next.js App Router Specific Tests', () => {
    test('should handle Server Component to Client Component data flow correctly', async ({
      page,
    }) => {
      const dataFlowErrors: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const _text = msg.text()
          if (
            text.includes('Server Component') ||
            text.includes('Client Component') ||
            text.includes('boundary') ||
            (text.includes('props') && text.includes('serialize'))
          ) {
            dataFlowErrors.push(text)
          }
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Test interactions that involve Server-Client component communication
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('server client test')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      // Try to interact with search results to test event handling
      const _resultItems = page.locator('[data-testid="search-result-item"], .search-result-item')
      const _resultCount = await resultItems.count()

      if (resultCount > 0) {
        await resultItems.first().click()
        await page.waitForTimeout(1000)
      }

      expect(dataFlowErrors).toHaveLength(0)
    })

    test('should handle navigation without Server Component prop errors', async ({ page }) => {
      const navigationErrors: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const _text = msg.text()
          if (
            text.includes('navigation') ||
            text.includes('router') ||
            (text.includes('push') && text.includes('function')) ||
            text.includes('Cannot pass function')
          ) {
            navigationErrors.push(text)
          }
        }
      })

      // Start from dashboard
      await page.goto(`${baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      // Navigate to search through any available link
      const _searchNavigation = page.locator('a[href="/search"]').first()
      if (await searchNavigation.isVisible()) {
        await searchNavigation.click()
      } else {
        await page.goto(`${baseURL}/search`)
      }

      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Perform search and potential navigation
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('navigation test')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      expect(navigationErrors).toHaveLength(0)
    })
  })

  test.describe('Error Recovery and Resilience', () => {
    test('should recover gracefully from any initialization errors', async ({ page }) => {
      const initializationErrors: string[] = []
      let pageLoadSuccessful = false

      page.on('console', msg => {
        if (msg.type() === 'error') {
          initializationErrors.push(msg.text())
        }
      })

      try {
        await page.goto(`${baseURL}/search`)
        await page.waitForLoadState('networkidle', { timeout: 30000 })

        // Verify basic functionality works
        const _searchInput = page.locator('input[placeholder*="search"]')
        await expect(searchInput).toBeVisible({ timeout: 10000 })

        await searchInput.fill('recovery test')
        await searchInput.press('Enter')
        await page.waitForTimeout(3000)

        pageLoadSuccessful = true
      } catch (error) {
        console.error('Page load or interaction failed:', error)
      }

      // Filter out non-critical errors
      const _criticalErrors = initializationErrors.filter(
        error =>
          !error.includes('favicon') &&
          !error.includes('404') &&
          !error.includes('Failed to load resource') &&
          !error.includes('net::ERR_FAILED')
      )

      // Page should load successfully
      expect(pageLoadSuccessful).toBe(true)

      // Should not have critical initialization errors
      if (criticalErrors.length > 0) {
        console.log('Critical initialization errors:')
        criticalErrors.forEach(error => console.log(`- ${error}`))
      }
      expect(criticalErrors.length).toBeLessThan(3) // Allow for minor non-blocking errors
    })

    test('should maintain error-free state during extended use', async ({ page }) => {
      const extendedUseErrors: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const _text = msg.text()
          // Filter for Client Component and serialization errors specifically
          if (
            text.includes('Client Component') ||
            text.includes('serialize') ||
            text.includes('Event handlers cannot be passed') ||
            text.includes('Functions cannot be passed')
          ) {
            extendedUseErrors.push(text)
          }
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Simulate extended use with multiple operations
      const _operations = [
        () => page.locator('input[placeholder*="search"]').fill('test 1'),
        () => page.keyboard.press('Enter'),
        () => page.waitForTimeout(1000),
        () => page.locator('input[placeholder*="search"]').clear(),
        () => page.locator('input[placeholder*="search"]').fill('test 2'),
        () => page.keyboard.press('Enter'),
        () => page.waitForTimeout(1000),
        () => page.reload(),
        () => page.waitForLoadState('networkidle'),
        () => page.locator('input[placeholder*="search"]').fill('test 3'),
        () => page.keyboard.press('Enter'),
        () => page.waitForTimeout(1000),
      ]

      // Execute operations sequentially
      for (const operation of operations) {
        try {
          await operation()
        } catch (error) {
          console.log('Operation failed but continuing:', error)
        }
      }

      // Final verification
      expect(extendedUseErrors).toHaveLength(0)

      // Verify search is still functional
      const _searchInput = page.locator('input[placeholder*="search"]')
      await expect(searchInput).toBeVisible()
      await searchInput.fill('final test')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)
    })
  })

  test.describe('Performance Impact Assessment', () => {
    test('should not have performance degradation due to error handling', async ({ page }) => {
      // Capture performance metrics
      const performanceData: Record<string, unknown>[] = []

      page.on('console', msg => {
        if (msg.text().includes('ms') && msg.text().includes('search')) {
          performanceData.push({
            timestamp: Date.now(),
            message: msg.text(),
          })
        }
      })

      const _startTime = Date.now()

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      const _pageLoadTime = Date.now() - startTime

      // Perform search and measure response time
      const _searchStartTime = Date.now()
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('performance test')
      await searchInput.press('Enter')

      // Wait for either results or execution time display
      await Promise.race([
        page.locator('[data-testid="search-results"]').waitFor({ timeout: 5000 }),
        page.locator('text=/\\d+ms/').waitFor({ timeout: 5000 }),
        page.waitForTimeout(5000),
      ])

      const _searchResponseTime = Date.now() - searchStartTime

      console.log(`Page load time: ${pageLoadTime}ms`)
      console.log(`Search response time: ${searchResponseTime}ms`)

      // Performance should be reasonable
      expect(pageLoadTime).toBeLessThan(10000) // 10 seconds max for page load
      expect(searchResponseTime).toBeLessThan(8000) // 8 seconds max for search (including network)

      // Check if execution time is displayed (indicates search completed)
      const _executionTimeElement = page.locator('text=/\\d+ms/')
      if (await executionTimeElement.isVisible()) {
        const _executionTimeText = await executionTimeElement.textContent()
        const _executionTime = parseInt(executionTimeText?.match(/\\d+/)?.[0] || '0')
        console.log(`Search execution time: ${executionTime}ms`)

        // Backend should be fast
        expect(executionTime).toBeLessThan(5000) // 5 seconds max for backend processing
      }
    })
  })
})
