/**
 * Dashboard Text Visibility Tests
 *
 * Tests to verify that the text visibility fixes are working properly:
 * 1. Dashboard was using hardcoded gray colors instead of design system CSS variables
 * 2. Updated all text elements to use proper design system colors
 * 3. Fixed OKLCH color variable mapping issues in globals.css
 */
import { test, expect } from '@playwright/test'

// Test fixtures for authenticated user
const _TEST_USER_EMAIL = 'test-visibility@example.com'
const _TEST_USER_PASSWORD = 'testPassword123!'

test.describe('Dashboard Text Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the app
    await page.goto('/')
  })

  test('should load dashboard without invisible text for authenticated user', async ({ page }) => {
    // First, sign up/in to get authenticated access to dashboard
    await page.goto('/auth/sign-in')

    // Wait for the auth form to be visible
    await expect(page.locator('[data-testid="auth-form"], form')).toBeVisible()

    // Try to sign in first (user might already exist)
    const _emailInput = page.locator('input[type="email"]').first()
    const _passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill(TEST_USER_EMAIL)
    await passwordInput.fill(TEST_USER_PASSWORD)

    // Try sign in
    const _signInButton = page.locator('button[type="submit"]').first()
    await signInButton.click()

    // If sign in fails, try sign up
    try {
      await page.waitForURL('/dashboard', { timeout: 5000 })
    } catch {
      // Sign in failed, try sign up
      await page.goto('/auth/sign-up')
      await expect(page.locator('[data-testid="auth-form"], form')).toBeVisible()

      const _signUpEmailInput = page.locator('input[type="email"]').first()
      const _signUpPasswordInput = page.locator('input[type="password"]').first()

      await signUpEmailInput.fill(TEST_USER_EMAIL)
      await signUpPasswordInput.fill(TEST_USER_PASSWORD)

      const _signUpButton = page.locator('button[type="submit"]').first()
      await signUpButton.click()

      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
    }

    // Now we should be on the dashboard
    await expect(page).toHaveURL('/dashboard')

    // Verify the page has loaded and is not blank
    await expect(page.locator('body')).toBeVisible()

    // Check that the main dashboard content is visible
    await expect(page.locator('main')).toBeVisible()
  })

  test('should display header elements with proper contrast', async ({ page }) => {
    // This test can be run without auth to check basic header visibility
    await page.goto('/dashboard')

    // If not authenticated, we'll be redirected to sign-in
    // But we can still check if basic styling works on the sign-in page
    const _isOnSignIn = await page.locator('input[type="email"]').isVisible()

    if (isOnSignIn) {
      // Check sign-in page text visibility
      const _form = page.locator('form').first()
      await expect(form).toBeVisible()

      // Verify text is not invisible (has proper contrast)
      const _emailLabel = page.locator('label').first()
      if (await emailLabel.isVisible()) {
        const _labelColor = await emailLabel.evaluate(el => window.getComputedStyle(el).color)

        // Should not be white or near-white (which would be invisible on white background)
        expect(labelColor).not.toBe('rgb(255, 255, 255)')
        expect(labelColor).not.toBe('rgba(255, 255, 255, 1)')
      }
    }
  })

  test('should apply design system colors correctly', async ({ page }) => {
    await page.goto('/')

    // Check that CSS variables are properly defined
    const _rootStyles = await page.evaluate(() => {
      const _root = document.documentElement
      const _styles = window.getComputedStyle(root)

      return {
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim(),
        card: styles.getPropertyValue('--card').trim(),
        cardForeground: styles.getPropertyValue('--card-foreground').trim(),
        mutedForeground: styles.getPropertyValue('--muted-foreground').trim(),
      }
    })

    // Verify CSS variables are defined (should contain OKLCH values)
    expect(rootStyles.background).toContain('oklch')
    expect(rootStyles.foreground).toContain('oklch')
    expect(rootStyles.card).toContain('oklch')
    expect(rootStyles.cardForeground).toContain('oklch')
    expect(rootStyles.mutedForeground).toContain('oklch')
  })

  test('should have proper text contrast ratios', async ({ page }) => {
    await page.goto('/')

    // Check computed styles for common text elements
    const _bodyStyles = await page.locator('body').evaluate(el => {
      const _styles = window.getComputedStyle(el)
      return {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
      }
    })

    // Verify text is not white on white or other poor contrast combinations
    expect(bodyStyles.color).not.toBe(bodyStyles.backgroundColor)
    expect(bodyStyles.color).not.toBe('rgb(255, 255, 255)') // Should not be white text

    // Check if any text elements exist and have good contrast
    const _textElements = await page.locator('p, h1, h2, h3, span, div').all()

    for (const element of textElements.slice(0, 5)) {
      // Check first 5 elements to avoid timeout
      if (await element.isVisible()) {
        const _styles = await element.evaluate(el => {
          const _computed = window.getComputedStyle(el)
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
          }
        })

        // Basic contrast check - text should not match background
        if (styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          // Has explicit background
          expect(styles.color).not.toBe(styles.backgroundColor)
        }
      }
    }
  })
})

test.describe('Dashboard Authenticated Content Visibility', () => {
  // These tests require authentication
  test.beforeEach(async ({ page }) => {
    // Simplified auth process using direct API if possible, or browser auth
    await page.goto('/auth/sign-in')

    // Try to authenticate
    try {
      await page.locator('input[type="email"]').fill(TEST_USER_EMAIL)
      await page.locator('input[type="password"]').fill(TEST_USER_PASSWORD)
      await page.locator('button[type="submit"]').click()

      // Wait for redirect to dashboard or handle sign up
      await page.waitForURL('/dashboard', { timeout: 10000 })
    } catch {
      // If sign in fails, try sign up flow
      await page.goto('/auth/sign-up')
      await page.locator('input[type="email"]').fill(TEST_USER_EMAIL)
      await page.locator('input[type="password"]').fill(TEST_USER_PASSWORD)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL('/dashboard', { timeout: 10000 })
    }
  })

  test('should display main content text elements properly', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard')

    // Check "The Log" header
    const _mainHeading = page.locator('h1').filter({ hasText: 'The Log' })
    await expect(mainHeading).toBeVisible()

    // Verify heading has proper text color (using design system)
    const _headingColor = await mainHeading.evaluate(el => window.getComputedStyle(el).color)
    expect(headingColor).not.toBe('rgb(255, 255, 255)') // Should not be white
    expect(headingColor).not.toBe('rgba(0, 0, 0, 0)') // Should not be transparent

    // Check description text
    const _description = page.locator('p').filter({ hasText: 'Capture your thoughts freely' })
    await expect(description).toBeVisible()

    const _descriptionColor = await description.evaluate(el => window.getComputedStyle(el).color)
    expect(descriptionColor).not.toBe('rgb(255, 255, 255)')
    expect(descriptionColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('should display sidebar cards with visible text', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard')

    // Check Welcome card
    const _welcomeCard = page.locator('text=Welcome back')
    await expect(welcomeCard).toBeVisible()

    const _welcomeColor = await welcomeCard.evaluate(el => window.getComputedStyle(el).color)
    expect(welcomeColor).not.toBe('rgb(255, 255, 255)')

    // Check Progress card
    const _progressCard = page.locator('text=Your Progress')
    await expect(progressCard).toBeVisible()

    // Check stats text visibility
    const _notesLabel = page.locator('text=Notes')
    if (await notesLabel.isVisible()) {
      const _notesColor = await notesLabel.evaluate(el => window.getComputedStyle(el).color)
      expect(notesColor).not.toBe('rgb(255, 255, 255)')
    }

    // Check Quick Actions card
    const _actionsCard = page.locator('text=Quick Actions')
    await expect(actionsCard).toBeVisible()

    // Check Tips card
    const _tipsCard = page.locator('text=💡 Tips')
    await expect(tipsCard).toBeVisible()
  })

  test('should display all card text with proper contrast', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard')

    // Get all cards on the page
    const _cards = await page.locator('[class*="card"], .card').all()

    for (const card of cards) {
      if (await card.isVisible()) {
        // Check card background and text colors
        const _cardStyles = await card.evaluate(el => {
          const _styles = window.getComputedStyle(el)
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
          }
        })

        // Card should have a defined background (not transparent)
        expect(cardStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')

        // Check text within cards
        const _textElements = await card.locator('h1, h2, h3, h4, h5, h6, p, span').all()

        for (const textEl of textElements.slice(0, 3)) {
          // Limit to avoid timeout
          if (await textEl.isVisible()) {
            const _textColor = await textEl.evaluate(el => window.getComputedStyle(el).color)

            // Text should not be white (invisible on white background)
            expect(textColor).not.toBe('rgb(255, 255, 255)')
            expect(textColor).not.toBe('rgba(255, 255, 255, 1)')
            expect(textColor).not.toBe('rgba(0, 0, 0, 0)') // Should not be transparent
          }
        }
      }
    }
  })

  test('should use design system CSS variables instead of hardcoded colors', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard')

    // Check that elements use CSS variables, not hardcoded colors
    const _mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()

    // Get computed styles and check they resolve from CSS variables
    const _rootVars = await page.evaluate(() => {
      const _root = document.documentElement
      const _styles = window.getComputedStyle(root)

      return {
        background: styles.getPropertyValue('--background'),
        foreground: styles.getPropertyValue('--foreground'),
        card: styles.getPropertyValue('--card'),
        cardForeground: styles.getPropertyValue('--card-foreground'),
        mutedForeground: styles.getPropertyValue('--muted-foreground'),
        accent: styles.getPropertyValue('--accent'),
      }
    })

    // All design system variables should be defined with OKLCH values
    Object.entries(rootVars).forEach(([key, value]) => {
      expect(value.trim()).toBeTruthy() // Should not be empty
      expect(value).toContain('oklch') // Should use OKLCH color space
    })

    // Verify specific elements are using the variables, not hardcoded grays
    const _headerElement = page.locator('header')
    if (await headerElement.isVisible()) {
      const _headerBg = await headerElement.evaluate(
        el => window.getComputedStyle(el).backgroundColor
      )

      // Should not be hardcoded gray values like rgb(249, 250, 251) or similar
      expect(headerBg).not.toMatch(/rgb\(249, 250, 251\)/)
      expect(headerBg).not.toMatch(/rgb\(31, 41, 55\)/)
      expect(headerBg).not.toMatch(/rgb\(107, 114, 128\)/)
    }
  })

  test('should handle both light and dark themes properly', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard')

    // Test light theme (default)
    let bodyBg = await page
      .locator('body')
      .evaluate(el => window.getComputedStyle(el).backgroundColor)
    let bodyColor = await page.locator('body').evaluate(el => window.getComputedStyle(el).color)

    // In light theme, background should be light and text should be dark
    expect(bodyBg).toBeTruthy()
    expect(bodyColor).toBeTruthy()
    expect(bodyBg).not.toBe(bodyColor) // Should have contrast

    // Try to toggle to dark theme if theme toggle exists
    const _themeToggle = page.locator(
      '[data-testid="theme-toggle"], button[aria-label*="theme"], button[aria-label*="Theme"]'
    )

    if (await themeToggle.isVisible()) {
      await themeToggle.click()

      // Wait for theme change
      await page.waitForTimeout(500)

      // Check dark theme colors
      bodyBg = await page
        .locator('body')
        .evaluate(el => window.getComputedStyle(el).backgroundColor)
      bodyColor = await page.locator('body').evaluate(el => window.getComputedStyle(el).color)

      // Background and text should still have contrast
      expect(bodyBg).not.toBe(bodyColor)

      // Text elements should still be visible
      const _mainHeading = page.locator('h1').filter({ hasText: 'The Log' })
      if (await mainHeading.isVisible()) {
        const _headingColor = await mainHeading.evaluate(el => window.getComputedStyle(el).color)
        expect(headingColor).not.toBe('rgba(0, 0, 0, 0)')
      }
    }
  })
})
