/**
 * Client Component Error Regression Tests
 *
 * These tests specifically verify that the Client Component serialization error fix
 * for the search page is working correctly. The error occurred when passing event
 * handlers (onNoteSelect, onNoteEdit) as props to Client Components in Next.js App Router.
 *
 * Key Tests:
 * - Search page renders without "Event handlers cannot be passed to Client Component props" error
 * - Console errors are monitored for Next.js serialization issues
 * - Search functionality works correctly after the fix
 * - Navigation between search and dashboard works properly
 */

import { test, expect } from '../fixtures/auth'
import { setupTestData, cleanupTestData } from '../fixtures/search-data'

const _baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3002'

test.describe('Client Component Error Regression Tests', () => {
  test.beforeEach(async ({ page, authenticatedUser }) => {
    // Set up test data
    await setupTestData(authenticatedUser.id, authenticatedUser.accessToken)

    // Capture console errors to detect Client Component issues
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Store console errors for later verification
    await page.evaluate(errors => {
      window.testConsoleErrors = errors
    }, consoleErrors)

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

  test.describe('Search Page Client Component Error Prevention', () => {
    test('should render search page without Client Component serialization errors', async ({
      page,
    }) => {
      // Monitor console for specific Next.js Client Component errors
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const _text = msg.text()
          consoleErrors.push(text)

          // Log the error for debugging
          console.log('Console error captured:', text)
        }
      })

      // Navigate to search page
      await page.goto(`${baseURL}/search`)

      // Wait for page to fully load
      await page.waitForLoadState('networkidle')

      // Verify the page loads successfully
      await expect(page.locator('h1')).toContainText('Context')
      await expect(page.locator('span:has-text("Search")')).toBeVisible()

      // Verify search input is present and functional
      const _searchInput = page.locator('input[placeholder*="search"]')
      await expect(searchInput).toBeVisible()

      // Wait a bit more to ensure all JavaScript has executed
      await page.waitForTimeout(2000)

      // Check for specific Client Component errors
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components') ||
          error.includes('Unsupported Server Component prop') ||
          error.includes('Error: Functions cannot be passed') ||
          error.includes('Cannot pass function as prop to client component')
      )

      // Assert no Client Component serialization errors occurred
      expect(clientComponentErrors).toHaveLength(0)

      // If there are any Client Component errors, provide detailed feedback
      if (clientComponentErrors.length > 0) {
        console.error('Client Component errors detected:')
        clientComponentErrors.forEach(error => console.error('  -', error))
        throw new Error(
          `Client Component serialization errors detected: ${clientComponentErrors.join('; ')}`
        )
      }

      // Verify no general JavaScript errors that might indicate serialization issues
      const _criticalErrors = consoleErrors.filter(
        error =>
          error.includes('TypeError') ||
          error.includes('ReferenceError') ||
          error.includes('SyntaxError')
      )

      // Log any critical errors for debugging but don't fail the test unless they're Client Component related
      if (criticalErrors.length > 0) {
        console.warn('Non-Client-Component errors detected:', criticalErrors)
      }
    })

    test('should handle search functionality without prop serialization issues', async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform a search to test the functionality
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForTimeout(3000)

      // Verify search functionality works
      const _resultsContainer = page
        .locator('[data-testid="search-results"]')
        .or(page.locator('.search-results'))

      // Check if results appeared or at least the search was processed
      const _hasResults = await resultsContainer.isVisible()
      const _hasNoResults = await page.locator('text=/no results/i').isVisible()
      const _hasExecutionTime = await page.locator('text=/\\d+ms/').isVisible()

      // At least one of these should be true, indicating search processed successfully
      expect(hasResults || hasNoResults || hasExecutionTime).toBe(true)

      // Check for Client Component errors during search execution
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })

    test('should handle note selection and editing without serialization errors', async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform a search that should return results
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')

      await page.waitForTimeout(3000)

      // Try to interact with search results if they exist
      const _resultItems = page
        .locator('[data-testid="search-result-item"]')
        .or(page.locator('.search-result-item'))
      const _resultCount = await resultItems.count()

      if (resultCount > 0) {
        // Click on the first result to test note selection
        const _firstResult = resultItems.first()
        await firstResult.click()

        // Wait for potential navigation or interaction
        await page.waitForTimeout(1000)

        // Check if we navigated or if the interaction was handled
        const _currentUrl = page.url()
        const _hasNavigated = currentUrl.includes('dashboard') || currentUrl.includes('note=')

        // Whether navigated or not, there should be no Client Component errors
        const _clientComponentErrors = consoleErrors.filter(
          error =>
            error.includes('Event handlers cannot be passed to Client Component props') ||
            error.includes('Functions cannot be passed directly to Client Components')
        )

        expect(clientComponentErrors).toHaveLength(0)

        // Log the result for debugging
        console.log(
          `Note selection test: ${resultCount} results found, navigation occurred: ${hasNavigated}`
        )
      } else {
        console.log(
          'No search results found for note selection test, but that is okay for this regression test'
        )
      }
    })
  })

  test.describe('Navigation Flow Error Prevention', () => {
    test('should navigate between dashboard and search without Client Component errors', async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // Start from dashboard
      await page.goto(`${baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      // Navigate to search
      const _searchLink = page.locator('a[href="/search"]').first()
      if (await searchLink.isVisible()) {
        await searchLink.click()
      } else {
        // Fallback: direct navigation
        await page.goto(`${baseURL}/search`)
      }

      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Verify we're on the search page
      await expect(page.locator('span:has-text("Search")')).toBeVisible()

      // Navigate back to dashboard
      await page.goto(`${baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      // Navigate to search again to test repeated navigation
      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Check for Client Component errors during navigation
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components') ||
          error.includes('Unsupported Server Component prop')
      )

      expect(clientComponentErrors).toHaveLength(0)

      // Verify search page is still functional after navigation
      const _searchInput = page.locator('input[placeholder*="search"]')
      await expect(searchInput).toBeVisible()
      await searchInput.fill('test')
      await searchInput.press('Enter')

      // Final check for errors after interaction
      await page.waitForTimeout(2000)

      const _finalClientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(finalClientComponentErrors).toHaveLength(0)
    })

    test('should handle page refresh without Client Component errors', async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // Navigate to search page
      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform initial search
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('initial search')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      // Refresh the page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify page loads correctly after refresh
      await expect(page.locator('span:has-text("Search")')).toBeVisible()
      await expect(searchInput).toBeVisible()

      // Perform another search after refresh
      await searchInput.fill('post-refresh search')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      // Check for Client Component errors
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })
  })

  test.describe('Error Recovery and Edge Cases', () => {
    test('should handle direct URL access to search page without Client Component errors', async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // Directly navigate to search page without going through dashboard first
      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Verify the page loads
      await expect(page.locator('span:has-text("Search")')).toBeVisible()

      // Test search functionality immediately
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('direct access test')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      // Check for Client Component errors
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })

    test('should handle search with special characters without Client Component errors', async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Test searches with special characters that might cause serialization issues
      const _specialSearches = [
        'function() { return "test"; }', // JavaScript-like syntax
        '한국어 검색', // Korean text
        'test "quotes" and \'apostrophes\'', // Mixed quotes
        'search with emoji 🔍 🚀', // Emoji
        'special chars: @#$%^&*()', // Special characters
      ]

      const _searchInput = page.locator('input[placeholder*="search"]')

      for (const searchTerm of specialSearches) {
        await searchInput.clear()
        await searchInput.fill(searchTerm)
        await searchInput.press('Enter')
        await page.waitForTimeout(1500)

        // Check for errors after each search
        const _currentErrors = consoleErrors.filter(
          error =>
            error.includes('Event handlers cannot be passed to Client Component props') ||
            error.includes('Functions cannot be passed directly to Client Components')
        )

        if (currentErrors.length > 0) {
          throw new Error(
            `Client Component error during search "${searchTerm}": ${currentErrors.join('; ')}`
          )
        }
      }

      // Final verification
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })
  })

  test.describe('Performance and Stability', () => {
    test('should maintain stability during rapid searches without Client Component errors', async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      const _searchInput = page.locator('input[placeholder*="search"]')

      // Perform rapid consecutive searches to test stability
      const _rapidSearches = ['search 1', 'search 2', 'search 3', 'search 4', 'search 5']

      for (const searchTerm of rapidSearches) {
        await searchInput.clear()
        await searchInput.fill(searchTerm)
        await searchInput.press('Enter')
        await page.waitForTimeout(500) // Shorter wait for rapid testing
      }

      // Wait for all searches to complete
      await page.waitForTimeout(3000)

      // Check for Client Component errors
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(clientComponentErrors).toHaveLength(0)

      // Verify the search interface is still responsive
      await searchInput.clear()
      await searchInput.fill('final stability test')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      // Final error check
      const _finalErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(finalErrors).toHaveLength(0)
    })

    test('should handle concurrent user interactions without Client Component errors', async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      const _searchInput = page.locator('input[placeholder*="search"]')

      // Simulate concurrent interactions
      await Promise.all([
        // Type in search input
        searchInput.fill('concurrent test'),

        // Try to interact with other elements
        page.locator('body').click(),

        // Attempt navigation
        page.keyboard.press('Tab'),
      ])

      // Submit search
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      // Test keyboard shortcuts if they exist
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)

      // Check for Client Component errors
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })
  })
})
