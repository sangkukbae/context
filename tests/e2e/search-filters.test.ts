/**
 * End-to-End Tests for SearchFilters Component
 *
 * Tests the search filters functionality including:
 * - Select component fixes (empty string → "any" value)
 * - Filter state management and validation
 * - UI interactions and accessibility
 * - Regression testing for related components
 */
import { test, expect } from '../fixtures/auth'
import { setupTestData, cleanupTestData } from '../fixtures/search-data'

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3002'

test.describe('SearchFilters Component', () => {
  test.beforeEach(async ({ page, authenticatedUser }) => {
    await setupTestData(authenticatedUser.id, authenticatedUser.accessToken)

    // Sign in the user
    await page.goto(`${baseURL}/auth/sign-in`)
    await page.fill('input[type="email"]', authenticatedUser.email)
    await page.fill('input[type="password"]', 'testPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${baseURL}/dashboard`)

    // Navigate to search page
    await page.goto(`${baseURL}/search`)
  })

  test.afterEach(async ({ authenticatedUser }) => {
    await cleanupTestData(authenticatedUser.id, authenticatedUser.accessToken)
  })

  test.describe('Primary Functionality Tests', () => {
    test('should open filters dialog without Radix UI errors', async ({ page }) => {
      // Check for console errors before clicking
      const consoleLogs: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleLogs.push(msg.text())
        }
      })

      // Click the Filters button
      const filtersButton = page.locator('button:has-text("Filters")')
      await expect(filtersButton).toBeVisible()
      await filtersButton.click()

      // Verify dialog opens
      const filtersDialog = page.locator('[role="dialog"]')
      await expect(filtersDialog).toBeVisible()
      await expect(filtersDialog.locator('text="Search Filters"')).toBeVisible()

      // Verify no Radix UI SelectItem errors occurred
      const radixErrors = consoleLogs.filter(
        log => log.includes('Select.Item') && log.includes('empty string')
      )
      expect(radixErrors).toHaveLength(0)
    })

    test('should open importance Select dropdown correctly', async ({ page }) => {
      // Open filters dialog
      await page.locator('button:has-text("Filters")').click()
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Find and click importance Select trigger
      const importanceSection = page.locator('text="Importance"').locator('..')
      const importanceSelect = importanceSection.locator('[role="combobox"]')
      await expect(importanceSelect).toBeVisible()
      await importanceSelect.click()

      // Verify dropdown opens
      const selectContent = page.locator('[role="listbox"]')
      await expect(selectContent).toBeVisible()

      // Verify all importance options are present with correct values
      await expect(
        selectContent.locator('[role="option"]:has-text("Any importance")')
      ).toBeVisible()
      await expect(selectContent.locator('[role="option"]:has-text("Low")')).toBeVisible()
      await expect(selectContent.locator('[role="option"]:has-text("Medium")')).toBeVisible()
      await expect(selectContent.locator('[role="option"]:has-text("High")')).toBeVisible()
    })

    test('should open sentiment Select dropdown correctly', async ({ page }) => {
      // Open filters dialog
      await page.locator('button:has-text("Filters")').click()
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Find and click sentiment Select trigger
      const sentimentSection = page.locator('text="Sentiment"').locator('..')
      const sentimentSelect = sentimentSection.locator('[role="combobox"]')
      await expect(sentimentSelect).toBeVisible()
      await sentimentSelect.click()

      // Verify dropdown opens
      const selectContent = page.locator('[role="listbox"]')
      await expect(selectContent).toBeVisible()

      // Verify all sentiment options are present with correct values
      await expect(selectContent.locator('[role="option"]:has-text("Any sentiment")')).toBeVisible()
      await expect(selectContent.locator('[role="option"]:has-text("Positive")')).toBeVisible()
      await expect(selectContent.locator('[role="option"]:has-text("Neutral")')).toBeVisible()
      await expect(selectContent.locator('[role="option"]:has-text("Negative")')).toBeVisible()
    })

    test('should select "Any importance" option correctly', async ({ page }) => {
      // Open filters dialog
      await page.locator('button:has-text("Filters")').click()

      // Open importance dropdown and select "Any importance"
      const importanceSection = page.locator('text="Importance"').locator('..')
      const importanceSelect = importanceSection.locator('[role="combobox"]')
      await importanceSelect.click()

      const anyImportanceOption = page.locator('[role="option"]:has-text("Any importance")')
      await anyImportanceOption.click()

      // Verify selection is displayed
      await expect(importanceSelect).toContainText('Any importance')

      // Close and reopen to verify state persistence
      await page.locator('button:has-text("Apply Filters")').click()
      await page.locator('button:has-text("Filters")').click()

      const reopenedImportanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      await expect(reopenedImportanceSelect).toContainText('Any importance')
    })

    test('should select "Any sentiment" option correctly', async ({ page }) => {
      // Open filters dialog
      await page.locator('button:has-text("Filters")').click()

      // Open sentiment dropdown and select "Any sentiment"
      const sentimentSection = page.locator('text="Sentiment"').locator('..')
      const sentimentSelect = sentimentSection.locator('[role="combobox"]')
      await sentimentSelect.click()

      const anySentimentOption = page.locator('[role="option"]:has-text("Any sentiment")')
      await anySentimentOption.click()

      // Verify selection is displayed
      await expect(sentimentSelect).toContainText('Any sentiment')

      // Close and reopen to verify state persistence
      await page.locator('button:has-text("Apply Filters")').click()
      await page.locator('button:has-text("Filters")').click()

      const reopenedSentimentSelect = page
        .locator('text="Sentiment"')
        .locator('..')
        .locator('[role="combobox"]')
      await expect(reopenedSentimentSelect).toContainText('Any sentiment')
    })
  })

  test.describe('Filter Logic Verification', () => {
    test('should handle importance filter selection and clearing', async ({ page }) => {
      // Open filters dialog
      await page.locator('button:has-text("Filters")').click()

      // Test selecting specific importance
      const importanceSection = page.locator('text="Importance"').locator('..')
      const importanceSelect = importanceSection.locator('[role="combobox"]')
      await importanceSelect.click()
      await page.locator('[role="option"]:has-text("High")').click()
      await expect(importanceSelect).toContainText('High')

      // Verify filter count increases
      await page.locator('button:has-text("Apply Filters")').click()
      const filtersButton = page.locator('button:has-text("Filters")')
      await expect(filtersButton.locator('.badge, [class*="badge"]')).toBeVisible()

      // Clear by selecting "Any importance"
      await filtersButton.click()
      await importanceSelect.click()
      await page.locator('[role="option"]:has-text("Any importance")').click()
      await page.locator('button:has-text("Apply Filters")').click()

      // Verify filter count decreases
      await expect(filtersButton.locator('.badge, [class*="badge"]')).not.toBeVisible()
    })

    test('should handle sentiment filter selection and clearing', async ({ page }) => {
      // Open filters dialog
      await page.locator('button:has-text("Filters")').click()

      // Test selecting specific sentiment
      const sentimentSection = page.locator('text="Sentiment"').locator('..')
      const sentimentSelect = sentimentSection.locator('[role="combobox"]')
      await sentimentSelect.click()
      await page.locator('[role="option"]:has-text("Positive")').click()
      await expect(sentimentSelect).toContainText('Positive')

      // Verify filter count increases
      await page.locator('button:has-text("Apply Filters")').click()
      const filtersButton = page.locator('button:has-text("Filters")')
      await expect(filtersButton.locator('.badge, [class*="badge"]')).toBeVisible()

      // Clear by selecting "Any sentiment"
      await filtersButton.click()
      await sentimentSelect.click()
      await page.locator('[role="option"]:has-text("Any sentiment")').click()
      await page.locator('button:has-text("Apply Filters")').click()

      // Verify filter count decreases
      await expect(filtersButton.locator('.badge, [class*="badge"]')).not.toBeVisible()
    })

    test('should calculate activeFilterCount correctly', async ({ page }) => {
      // Open filters dialog
      await page.locator('button:has-text("Filters")').click()

      // Add multiple filters
      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      await importanceSelect.click()
      await page.locator('[role="option"]:has-text("High")').click()

      const sentimentSelect = page
        .locator('text="Sentiment"')
        .locator('..')
        .locator('[role="combobox"]')
      await sentimentSelect.click()
      await page.locator('[role="option"]:has-text("Positive")').click()

      // Add a tag filter
      const tagInput = page.locator('input[placeholder*="Add tags"]')
      await tagInput.fill('machine-learning')
      await tagInput.press('Enter')

      // Apply filters and check count
      await page.locator('button:has-text("Apply Filters")').click()

      const filtersButton = page.locator('button:has-text("Filters")')
      const filterBadge = filtersButton.locator('.badge, [class*="badge"]')
      await expect(filterBadge).toBeVisible()
      await expect(filterBadge).toContainText('3') // importance + sentiment + tags
    })

    test('should clear all filters correctly', async ({ page }) => {
      // Open filters dialog and add multiple filters
      await page.locator('button:has-text("Filters")').click()

      // Add importance filter
      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      await importanceSelect.click()
      await page.locator('[role="option"]:has-text("High")').click()

      // Add sentiment filter
      const sentimentSelect = page
        .locator('text="Sentiment"')
        .locator('..')
        .locator('[role="combobox"]')
      await sentimentSelect.click()
      await page.locator('[role="option"]:has-text("Positive")').click()

      // Add tag
      const tagInput = page.locator('input[placeholder*="Add tags"]')
      await tagInput.fill('test-tag')
      await tagInput.press('Enter')

      // Clear all filters
      await page.locator('button:has-text("Clear All Filters")').click()

      // Verify all filters are cleared
      await expect(importanceSelect).toContainText('Any importance')
      await expect(sentimentSelect).toContainText('Any sentiment')
      await expect(page.locator('.badge:has-text("test-tag")')).not.toBeVisible()

      // Apply and verify no active filters
      await page.locator('button:has-text("Apply Filters")').click()
      const filtersButton = page.locator('button:has-text("Filters")')
      await expect(filtersButton.locator('.badge, [class*="badge"]')).not.toBeVisible()
    })
  })

  test.describe('Edge Cases and State Management', () => {
    test('should handle switching between "Any" and specific values multiple times', async ({
      page,
    }) => {
      await page.locator('button:has-text("Filters")').click()

      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')

      // Cycle through selections
      const selections = ['High', 'Any importance', 'Medium', 'Any importance', 'Low']

      for (const selection of selections) {
        await importanceSelect.click()
        await page.locator(`[role="option"]:has-text("${selection}")`).click()
        await expect(importanceSelect).toContainText(selection)
        await page.waitForTimeout(100) // Brief pause between selections
      }

      // Verify final state
      await expect(importanceSelect).toContainText('Low')
    })

    test('should show correct placeholder text', async ({ page }) => {
      await page.locator('button:has-text("Filters")').click()

      // Check importance placeholder
      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      const importancePlaceholder = importanceSelect.locator('[data-placeholder]')
      if (await importancePlaceholder.isVisible()) {
        await expect(importancePlaceholder).toContainText('Any importance')
      }

      // Check sentiment placeholder
      const sentimentSelect = page
        .locator('text="Sentiment"')
        .locator('..')
        .locator('[role="combobox"]')
      const sentimentPlaceholder = sentimentSelect.locator('[data-placeholder]')
      if (await sentimentPlaceholder.isVisible()) {
        await expect(sentimentPlaceholder).toContainText('Any sentiment')
      }
    })

    test('should maintain controlled state properly', async ({ page }) => {
      await page.locator('button:has-text("Filters")').click()

      // Set specific values
      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      await importanceSelect.click()
      await page.locator('[role="option"]:has-text("High")').click()

      const sentimentSelect = page
        .locator('text="Sentiment"')
        .locator('..')
        .locator('[role="combobox"]')
      await sentimentSelect.click()
      await page.locator('[role="option"]:has-text("Negative")').click()

      // Close dialog without applying
      await page.keyboard.press('Escape')

      // Reopen and verify state is maintained
      await page.locator('button:has-text("Filters")').click()
      await expect(importanceSelect).toContainText('High')
      await expect(sentimentSelect).toContainText('Negative')

      // Apply filters
      await page.locator('button:has-text("Apply Filters")').click()

      // Reopen and verify state persists after applying
      await page.locator('button:has-text("Filters")').click()
      await expect(importanceSelect).toContainText('High')
      await expect(sentimentSelect).toContainText('Negative')
    })
  })

  test.describe('Regression Testing', () => {
    test('should not affect other components in the app', async ({ page }) => {
      // Test that search input still works
      const searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('test query')
      await expect(searchInput).toHaveValue('test query')

      // Open filters dialog
      await page.locator('button:has-text("Filters")').click()
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Close dialog
      await page.keyboard.press('Escape')

      // Verify search input still works
      await searchInput.clear()
      await searchInput.fill('another query')
      await expect(searchInput).toHaveValue('another query')
    })

    test('should not cause console errors throughout the app', async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // Navigate through different parts of the app
      await page.goto(`${baseURL}/dashboard`)
      await page.waitForTimeout(1000)

      await page.goto(`${baseURL}/search`)
      await page.waitForTimeout(1000)

      // Open and interact with filters
      await page.locator('button:has-text("Filters")').click()
      await page.waitForTimeout(500)

      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      await importanceSelect.click()
      await page.locator('[role="option"]:has-text("High")').click()
      await page.waitForTimeout(500)

      await page.locator('button:has-text("Apply Filters")').click()
      await page.waitForTimeout(1000)

      // Filter out known non-critical warnings
      const criticalErrors = consoleErrors.filter(
        error =>
          !error.includes('Warning') &&
          !error.includes('Download the React DevTools') &&
          !error.includes('404') // Ignore 404s from missing resources
      )

      expect(criticalErrors).toHaveLength(0)
    })

    test('should work correctly with other Select components in the app', async ({ page }) => {
      // This test ensures our Select fixes don't break other Select components
      await page.locator('button:has-text("Filters")').click()

      // Test importance Select
      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      await importanceSelect.click()
      await page.locator('[role="option"]:has-text("Medium")').click()
      await expect(importanceSelect).toContainText('Medium')

      // Test sentiment Select immediately after
      const sentimentSelect = page
        .locator('text="Sentiment"')
        .locator('..')
        .locator('[role="combobox"]')
      await sentimentSelect.click()
      await page.locator('[role="option"]:has-text("Neutral")').click()
      await expect(sentimentSelect).toContainText('Neutral')

      // Both should maintain their values
      await expect(importanceSelect).toContainText('Medium')
      await expect(sentimentSelect).toContainText('Neutral')
    })
  })

  test.describe('Accessibility and UI Behavior', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.locator('button:has-text("Filters")').click()

      // Tab to importance select
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Open with Enter or Space
      await page.keyboard.press('Enter')

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')

      // Select with Enter
      await page.keyboard.press('Enter')

      // Verify selection worked
      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      await expect(importanceSelect).toContainText(/Low|Medium|High/)
    })

    test('should have proper ARIA attributes', async ({ page }) => {
      await page.locator('button:has-text("Filters")').click()

      // Check importance Select ARIA attributes
      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      await expect(importanceSelect).toHaveAttribute('role', 'combobox')
      await expect(importanceSelect).toHaveAttribute('aria-expanded', 'false')

      // Open dropdown and check expanded state
      await importanceSelect.click()
      await expect(importanceSelect).toHaveAttribute('aria-expanded', 'true')

      // Check dropdown content ARIA attributes
      const selectContent = page.locator('[role="listbox"]')
      await expect(selectContent).toBeVisible()

      const options = selectContent.locator('[role="option"]')
      expect(await options.count()).toBeGreaterThan(0)
    })

    test('should display filter badge correctly', async ({ page }) => {
      // Initially no badge should be visible
      const filtersButton = page.locator('button:has-text("Filters")')
      await expect(filtersButton.locator('.badge, [class*="badge"]')).not.toBeVisible()

      // Add a filter
      await filtersButton.click()
      const importanceSelect = page
        .locator('text="Importance"')
        .locator('..')
        .locator('[role="combobox"]')
      await importanceSelect.click()
      await page.locator('[role="option"]:has-text("High")').click()
      await page.locator('button:has-text("Apply Filters")').click()

      // Badge should now be visible with count
      const badge = filtersButton.locator('.badge, [class*="badge"]')
      await expect(badge).toBeVisible()
      await expect(badge).toContainText('1')
    })
  })
})
