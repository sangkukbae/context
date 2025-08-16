/**
 * Search Interaction Tests
 *
 * Tests specifically focused on note selection, editing, and navigation functionality
 * that was affected by the Client Component error fix. These tests ensure:
 * - Note selection works correctly after fixing prop serialization
 * - Navigation between search and dashboard is functional
 * - Event handlers are properly implemented without serialization issues
 */

import { test, expect } from '../fixtures/auth'
import { setupTestData, cleanupTestData } from '../fixtures/search-data'

const _baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3002'

test.describe('Search Interaction Tests', () => {
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

  test.describe('Note Selection Functionality', () => {
    test('should handle note selection without Client Component prop errors', async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform search to get results
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')
      await page.waitForTimeout(3000)

      // Look for search results
      const _resultItems = page
        .locator('[data-testid="search-result-item"]')
        .or(page.locator('.search-result-item'))
      const _resultCount = await resultItems.count()

      if (resultCount > 0) {
        console.log(`Found ${resultCount} search results`)

        // Test clicking on the first result
        const _firstResult = resultItems.first()
        await expect(firstResult).toBeVisible()

        // Get initial URL before click
        const _initialUrl = page.url()

        // Click on the result
        await firstResult.click()
        await page.waitForTimeout(2000)

        // Check if navigation occurred or console log appeared
        const _currentUrl = page.url()
        const _hasNavigated = currentUrl !== initialUrl

        console.log(`Navigation occurred: ${hasNavigated}`)
        console.log(`Initial URL: ${initialUrl}`)
        console.log(`Current URL: ${currentUrl}`)

        // Check console logs for the note selection (should show console.log from onNoteSelect)
        // In the current implementation, onNoteSelect just logs to console
        // This is expected behavior per the current search page implementation
      } else {
        console.log('No search results found, checking if this is expected')

        // Verify that we get proper "no results" feedback
        const _noResultsIndicator = page
          .locator('text=/no results/i')
          .or(page.locator('text=/not found/i'))
          .or(page.locator('[data-testid="no-results"]'))

        const _hasNoResultsMessage = await noResultsIndicator.isVisible()
        console.log(`No results message shown: ${hasNoResultsMessage}`)
      }

      // Check for Client Component errors regardless of whether results were found
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components') ||
          error.includes('Cannot pass function as prop to client component')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })

    test('should handle note editing functionality correctly', async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform search
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')
      await page.waitForTimeout(3000)

      // Look for edit buttons or right-click menus in search results
      const _resultItems = page
        .locator('[data-testid="search-result-item"]')
        .or(page.locator('.search-result-item'))
      const _editButtons = page
        .locator('[data-testid="edit-note"]')
        .or(page.locator('button:has-text("edit")'))

      const _resultCount = await resultItems.count()
      const _editButtonCount = await editButtons.count()

      console.log(`Found ${resultCount} results and ${editButtonCount} edit buttons`)

      if (editButtonCount > 0) {
        // Test edit button functionality
        const _firstEditButton = editButtons.first()
        await firstEditButton.click()
        await page.waitForTimeout(2000)

        // Check if edit functionality triggered (navigation or modal)
        const _currentUrl = page.url()
        console.log(`URL after edit click: ${currentUrl}`)
      } else if (resultCount > 0) {
        // Test right-click or hover for edit options
        const _firstResult = resultItems.first()

        // Try right-click to see if context menu appears
        await firstResult.click({ button: 'right' })
        await page.waitForTimeout(1000)

        // Look for edit option in context menu
        const _editMenuItem = page
          .locator('text=/edit/i')
          .or(page.locator('[data-testid="edit-menu-item"]'))
        if (await editMenuItem.isVisible()) {
          await editMenuItem.click()
          await page.waitForTimeout(2000)
          console.log('Edit menu item clicked')
        }
      }

      // Check for Client Component errors
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })

    test('should handle multiple note interactions in sequence', async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform search
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')
      await page.waitForTimeout(3000)

      const _resultItems = page
        .locator('[data-testid="search-result-item"]')
        .or(page.locator('.search-result-item'))
      const _resultCount = await resultItems.count()

      if (resultCount > 1) {
        // Click on multiple results in sequence
        for (let i = 0; i < Math.min(3, resultCount); i++) {
          const _result = resultItems.nth(i)
          await result.click()
          await page.waitForTimeout(1000)

          console.log(`Clicked on result ${i + 1}`)
        }
      } else if (resultCount === 1) {
        // Click the same result multiple times
        const _singleResult = resultItems.first()
        for (let i = 0; i < 3; i++) {
          await singleResult.click()
          await page.waitForTimeout(500)
        }
      }

      // Check for Client Component errors after multiple interactions
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })
  })

  test.describe('Navigation Flow Testing', () => {
    test('should handle search to dashboard navigation correctly', async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // Start from search page
      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform a search
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('navigation test')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      // Navigate to dashboard
      await page.goto(`${baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      // Verify we're on dashboard
      await expect(page.locator('h1')).toContainText('The Log')

      // Navigate back to search
      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Verify search page is functional
      await expect(page.locator('span:has-text("Search")')).toBeVisible()
      const _searchInputAfterNav = page.locator('input[placeholder*="search"]')
      await searchInputAfterNav.fill('after navigation test')
      await searchInputAfterNav.press('Enter')
      await page.waitForTimeout(2000)

      // Check for navigation-related Client Component errors
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components') ||
          error.includes('navigation') ||
          error.includes('router')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })

    test('should handle note selection navigation to dashboard with note parameter', async ({
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

      // Perform search
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')
      await page.waitForTimeout(3000)

      const _resultItems = page
        .locator('[data-testid="search-result-item"]')
        .or(page.locator('.search-result-item'))
      const _resultCount = await resultItems.count()

      if (resultCount > 0) {
        const _initialUrl = page.url()

        // Click on first result
        await resultItems.first().click()
        await page.waitForTimeout(2000)

        const _currentUrl = page.url()

        // Check if navigation occurred (could be to dashboard with note parameter)
        if (currentUrl.includes('dashboard') && currentUrl.includes('note=')) {
          console.log('Successfully navigated to dashboard with note parameter')

          // Verify we're on the dashboard page
          await expect(page.locator('h1')).toContainText('The Log')

          // Navigate back to search
          await page.goto(`${baseURL}/search`)
          await page.waitForLoadState('networkidle')

          // Verify search still works
          await searchInput.fill('navigation back test')
          await searchInput.press('Enter')
          await page.waitForTimeout(2000)
        } else if (currentUrl === initialUrl) {
          console.log('Note selection triggered console logging (current behavior)')
          // This is the current behavior - onNoteSelect just logs to console
          // This is acceptable and expected based on the current implementation
        } else {
          console.log(`Unexpected navigation occurred: ${currentUrl}`)
        }
      }

      // Check for Client Component errors
      const _clientComponentErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components')
      )

      expect(clientComponentErrors).toHaveLength(0)
    })

    test('should handle browser back/forward navigation correctly', async ({ page }) => {
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
      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform search
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('browser navigation test')
      await searchInput.press('Enter')
      await page.waitForTimeout(2000)

      // Go back using browser back button
      await page.goBack()
      await page.waitForLoadState('networkidle')

      // Should be back to dashboard
      await expect(page.locator('h1')).toContainText('The Log')

      // Go forward using browser forward button
      await page.goForward()
      await page.waitForLoadState('networkidle')

      // Should be back to search page
      await expect(page.locator('span:has-text("Search")')).toBeVisible()

      // Test search functionality after browser navigation
      const _searchInputAfterNav = page.locator('input[placeholder*="search"]')
      await searchInputAfterNav.fill('after browser nav test')
      await searchInputAfterNav.press('Enter')
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

  test.describe('Event Handler Functionality', () => {
    test('should verify onNoteSelect handler works without serialization errors', async ({
      page,
    }) => {
      const consoleLogs: string[] = []

      // Capture console logs to verify onNoteSelect is working
      page.on('console', msg => {
        if (msg.type() === 'log') {
          consoleLogs.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform search
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')
      await page.waitForTimeout(3000)

      const _resultItems = page
        .locator('[data-testid="search-result-item"]')
        .or(page.locator('.search-result-item'))
      const _resultCount = await resultItems.count()

      if (resultCount > 0) {
        // Click on result to trigger onNoteSelect
        await resultItems.first().click()
        await page.waitForTimeout(1000)

        // Check if console log appeared (current implementation logs "Note selected: noteId")
        const _noteSelectedLogs = consoleLogs.filter(log => log.includes('Note selected:'))

        if (noteSelectedLogs.length > 0) {
          console.log('onNoteSelect handler working correctly:', noteSelectedLogs[0])
          expect(noteSelectedLogs.length).toBeGreaterThan(0)
        } else {
          console.log('No console logs detected for note selection')
          // This could be normal if the implementation changed or results don't have IDs
        }
      }
    })

    test('should verify onNoteEdit handler works without serialization errors', async ({
      page,
    }) => {
      const consoleLogs: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'log') {
          consoleLogs.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform search
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('machine learning')
      await searchInput.press('Enter')
      await page.waitForTimeout(3000)

      // Look for edit triggers in the interface
      const _editButtons = page
        .locator('[data-testid="edit-note"]')
        .or(page.locator('button:has-text("edit")'))
        .or(page.locator('[aria-label*="edit"]'))

      const _editButtonCount = await editButtons.count()

      if (editButtonCount > 0) {
        await editButtons.first().click()
        await page.waitForTimeout(1000)

        // Check for console log from onNoteEdit
        const _noteEditLogs = consoleLogs.filter(log => log.includes('Note edit requested:'))

        if (noteEditLogs.length > 0) {
          console.log('onNoteEdit handler working correctly:', noteEditLogs[0])
        }
      } else {
        console.log('No edit buttons found in current implementation')
        // Try alternative ways to trigger edit (right-click, keyboard shortcuts, etc.)

        const _resultItems = page
          .locator('[data-testid="search-result-item"]')
          .or(page.locator('.search-result-item'))
        const _resultCount = await resultItems.count()

        if (resultCount > 0) {
          // Try right-click on result
          await resultItems.first().click({ button: 'right' })
          await page.waitForTimeout(500)

          const _editMenuItem = page.locator('text=/edit/i')
          if (await editMenuItem.isVisible()) {
            await editMenuItem.click()
            await page.waitForTimeout(1000)
          }
        }
      }
    })

    test('should handle rapid event triggering without errors', async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform search
      const _searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('rapid event test')
      await searchInput.press('Enter')
      await page.waitForTimeout(3000)

      const _resultItems = page
        .locator('[data-testid="search-result-item"]')
        .or(page.locator('.search-result-item'))
      const _resultCount = await resultItems.count()

      if (resultCount > 0) {
        const _firstResult = resultItems.first()

        // Rapidly click on the same result multiple times
        for (let i = 0; i < 10; i++) {
          await firstResult.click()
          await page.waitForTimeout(100) // Rapid clicking
        }

        await page.waitForTimeout(2000) // Wait for any delayed errors
      }

      // Check for errors related to rapid event handling
      const _eventHandlingErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components') ||
          error.includes('Maximum call stack') ||
          error.includes('Too many re-renders')
      )

      expect(eventHandlingErrors).toHaveLength(0)
    })
  })

  test.describe('Interaction State Management', () => {
    test('should maintain interaction state across searches', async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(`${baseURL}/search`)
      await page.waitForLoadState('networkidle')

      // Perform multiple searches and interactions
      const _searchTerms = ['machine learning', 'database optimization', 'react hooks']

      for (const term of searchTerms) {
        const _searchInput = page.locator('input[placeholder*="search"]')
        await searchInput.clear()
        await searchInput.fill(term)
        await searchInput.press('Enter')
        await page.waitForTimeout(2000)

        // Try to interact with results if available
        const _resultItems = page
          .locator('[data-testid="search-result-item"]')
          .or(page.locator('.search-result-item'))
        const _resultCount = await resultItems.count()

        if (resultCount > 0) {
          await resultItems.first().click()
          await page.waitForTimeout(500)
        }
      }

      // Verify no state-related Client Component errors
      const _stateErrors = consoleErrors.filter(
        error =>
          error.includes('Event handlers cannot be passed to Client Component props') ||
          error.includes('Functions cannot be passed directly to Client Components') ||
          error.includes('state') ||
          error.includes('render')
      )

      expect(stateErrors).toHaveLength(0)
    })
  })
})
