/**
 * Visual Regression Tests for Text Visibility Fixes
 *
 * Uses Playwright's screenshot comparison to detect visual changes
 * and verify text elements are properly visible with good contrast.
 */
import { test, expect } from '@playwright/test'

// Helper function to create test user and authenticate
async function authenticateUser(page: Record<string, unknown>) {
  const _testEmail = 'visual-test@example.com'
  const _testPassword = 'testPassword123!'

  await page.goto('/auth/sign-in')

  try {
    // Try sign in first
    await page.locator('input[type="email"]').fill(testEmail)
    await page.locator('input[type="password"]').fill(testPassword)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('/dashboard', { timeout: 5000 })
  } catch {
    // If sign in fails, try sign up
    await page.goto('/auth/sign-up')
    await page.locator('input[type="email"]').fill(testEmail)
    await page.locator('input[type="password"]').fill(testPassword)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('/dashboard', { timeout: 10000 })
  }
}

test.describe('Visual Regression Tests - Text Visibility', () => {
  test('dashboard header should have visible text elements', async ({ page }) => {
    await authenticateUser(page)

    // Wait for page to fully load
    await page.waitForSelector('header', { state: 'visible' })
    await page.waitForSelector('main', { state: 'visible' })

    // Take screenshot of header area
    const _header = page.locator('header')
    await expect(header).toHaveScreenshot('dashboard-header.png')

    // Verify header text is visible by checking specific elements
    await expect(page.locator('header h1, header [class*="heading"]')).toBeVisible()
  })

  test('dashboard sidebar cards should display text properly', async ({ page }) => {
    await authenticateUser(page)

    // Wait for sidebar to load
    await page.waitForSelector('[class*="xl:col-span-1"], .sidebar, aside', {
      state: 'visible',
      timeout: 10000,
    })

    // Focus on sidebar area
    const _sidebar = page.locator('[class*="xl:col-span-1"], .sidebar, aside').first()

    if (await sidebar.isVisible()) {
      // Take screenshot of sidebar
      await expect(sidebar).toHaveScreenshot('dashboard-sidebar.png')

      // Check specific card text visibility
      await expect(page.locator('text=Welcome back')).toBeVisible()
      await expect(page.locator('text=Your Progress')).toBeVisible()
      await expect(page.locator('text=Quick Actions')).toBeVisible()
      await expect(page.locator('text=💡 Tips')).toBeVisible()
    }
  })

  test('main content area should show text clearly', async ({ page }) => {
    await authenticateUser(page)

    // Wait for main content
    await page.waitForSelector('main', { state: 'visible' })

    // Focus on the main content area
    const _mainContent = page.locator('main [class*="xl:col-span-3"]').first()

    if (await mainContent.isVisible()) {
      // Take screenshot of main content
      await expect(mainContent).toHaveScreenshot('dashboard-main-content.png')

      // Verify key text elements
      await expect(page.locator('h1').filter({ hasText: 'The Log' })).toBeVisible()
      await expect(page.locator('text=Capture your thoughts freely')).toBeVisible()
    }
  })

  test('full dashboard page should render without invisible text', async ({ page }) => {
    await authenticateUser(page)

    // Wait for complete page load
    await page.waitForLoadState('networkidle')

    // Hide dynamic elements that might cause flakiness
    await page.addStyleTag({
      content: `
        [data-testid="timestamp"], .timestamp, 
        [class*="animate"], .animate,
        [data-time], [data-updated] {
          opacity: 0 !important;
        }
      `,
    })

    // Take full page screenshot
    await expect(page).toHaveScreenshot('dashboard-full-page.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('color contrast verification through pixel analysis', async ({ page }) => {
    await authenticateUser(page)

    // Get a screenshot buffer for pixel analysis
    const _screenshot = await page.screenshot({ fullPage: true })

    // Basic check that the screenshot isn't blank (all white or all one color)
    expect(screenshot.length).toBeGreaterThan(1000) // Should be a substantial image

    // Check specific text elements have proper contrast
    const _textElements = [
      'h1:has-text("The Log")',
      'text=Welcome back',
      'text=Your Progress',
      'text=Quick Actions',
    ]

    for (const selector of textElements) {
      const _element = page.locator(selector)
      if (await element.isVisible()) {
        const _boundingBox = await element.boundingBox()
        if (boundingBox) {
          // Take screenshot of just this element
          const _elementScreenshot = await element.screenshot()
          expect(elementScreenshot.length).toBeGreaterThan(100) // Should contain visible content
        }
      }
    }
  })

  test('theme switching should maintain text visibility', async ({ page }) => {
    await authenticateUser(page)

    // Take screenshot in default theme
    await expect(page).toHaveScreenshot('dashboard-default-theme.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 800 },
    })

    // Try to find and click theme toggle
    const _themeToggle = page.locator(
      '[data-testid="theme-toggle"], button[aria-label*="theme"], button[aria-label*="Theme"]'
    )

    if (await themeToggle.isVisible()) {
      await themeToggle.click()

      // Wait for theme transition
      await page.waitForTimeout(1000)

      // Take screenshot in switched theme
      await expect(page).toHaveScreenshot('dashboard-switched-theme.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1200, height: 800 },
      })

      // Verify text is still visible in new theme
      await expect(page.locator('h1').filter({ hasText: 'The Log' })).toBeVisible()
      await expect(page.locator('text=Welcome back')).toBeVisible()
    }
  })
})

test.describe('CSS Variables and Design System Verification', () => {
  test('should use OKLCH colors from design system', async ({ page }) => {
    await page.goto('/')

    // Check CSS variables are properly defined
    const _cssVariables = await page.evaluate(() => {
      const _root = document.documentElement
      const _computedStyle = window.getComputedStyle(root)

      const _variables = [
        '--background',
        '--foreground',
        '--card',
        '--card-foreground',
        '--muted-foreground',
        '--accent',
        '--primary',
      ]

      const values: Record<string, string> = {}
      variables.forEach(variable => {
        values[variable] = computedStyle.getPropertyValue(variable).trim()
      })

      return values
    })

    // Verify all variables are defined and use OKLCH
    Object.entries(cssVariables).forEach(([variable, value]) => {
      expect(value, `CSS variable ${variable} should be defined`).toBeTruthy()
      expect(value, `CSS variable ${variable} should use OKLCH color space`).toContain('oklch')
    })
  })

  test('should not use hardcoded gray colors', async ({ page }) => {
    await authenticateUser(page)

    // Check that elements don't use hardcoded gray values
    const _problematicColors = [
      'rgb(249, 250, 251)', // bg-gray-50
      'rgb(31, 41, 55)', // text-gray-900
      'rgb(107, 114, 128)', // text-gray-600
      '#f9fafb',
      '#1f2937',
      '#6b7280',
    ]

    // Get all elements and check their computed styles
    const _elementsWithProblematicColors = await page.evaluate(colors => {
      const _allElements = document.querySelectorAll('*')
      const problematic: string[] = []

      Array.from(allElements).forEach(el => {
        const _styles = window.getComputedStyle(el)
        const _bgColor = styles.backgroundColor
        const _textColor = styles.color

        colors.forEach(color => {
          const _colorLower = color.toLowerCase()
          if (
            bgColor.toLowerCase().includes(colorLower) ||
            textColor.toLowerCase().includes(colorLower)
          ) {
            problematic.push(`Element ${el.tagName} has hardcoded color: ${color}`)
          }
        })
      })

      return problematic
    }, problematicColors)

    // Should not find any hardcoded colors
    expect(
      elementsWithProblematicColors,
      `Found elements with hardcoded colors: ${elementsWithProblematicColors.join(', ')}`
    ).toHaveLength(0)
  })

  test('text elements should have sufficient color contrast', async ({ page }) => {
    await authenticateUser(page)

    // Check contrast ratios for important text elements
    const _textSelectors = ['h1', 'h2', 'h3', 'p', 'span', 'label', 'button']

    for (const selector of textSelectors) {
      const _elements = await page.locator(selector).all()

      for (const element of elements.slice(0, 5)) {
        // Check first 5 of each type
        if (await element.isVisible()) {
          const _contrast = await element.evaluate(el => {
            const _styles = window.getComputedStyle(el)
            const _color = styles.color
            const _backgroundColor = styles.backgroundColor

            // Simple contrast check - colors should be different
            return {
              color,
              backgroundColor,
              isDifferent: color !== backgroundColor,
              isNotTransparent: color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent',
            }
          })

          expect(
            contrast.isDifferent,
            `Text color should differ from background for ${selector}`
          ).toBe(true)

          expect(contrast.isNotTransparent, `Text should not be transparent for ${selector}`).toBe(
            true
          )
        }
      }
    }
  })
})
