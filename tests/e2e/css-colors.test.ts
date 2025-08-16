/**
 * CSS Colors and Design System Tests
 *
 * Validates that the dashboard uses the new OKLCH design system colors
 * instead of hardcoded gray values that caused text visibility issues.
 */
import { test, expect } from '@playwright/test'
import { authenticateUser, waitForDashboardLoad } from '../helpers/auth-helper'

test.describe('CSS Design System Colors', () => {
  test('should define all required OKLCH color variables', async ({ page }) => {
    await page.goto('/')

    const colorVariables = await page.evaluate(() => {
      const root = document.documentElement
      const styles = window.getComputedStyle(root)

      const requiredVariables = [
        '--background',
        '--foreground',
        '--card',
        '--card-foreground',
        '--popover',
        '--popover-foreground',
        '--primary',
        '--primary-foreground',
        '--secondary',
        '--secondary-foreground',
        '--muted',
        '--muted-foreground',
        '--accent',
        '--accent-foreground',
        '--destructive',
        '--destructive-foreground',
        '--border',
        '--input',
        '--ring',
      ]

      const values: Record<string, { value: string; isOklch: boolean }> = {}

      requiredVariables.forEach(variable => {
        const value = styles.getPropertyValue(variable).trim()
        values[variable] = {
          value,
          isOklch: value.includes('oklch'),
        }
      })

      return values
    })

    // Verify all variables are defined and use OKLCH
    Object.entries(colorVariables).forEach(([variable, data]) => {
      expect(data.value, `${variable} should be defined`).toBeTruthy()
      expect(data.isOklch, `${variable} should use OKLCH color space, got: ${data.value}`).toBe(
        true
      )
    })
  })

  test('should have proper OKLCH values for light theme', async ({ page }) => {
    await page.goto('/')

    const lightThemeColors = await page.evaluate(() => {
      const root = document.documentElement
      const styles = window.getComputedStyle(root)

      return {
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim(),
        mutedForeground: styles.getPropertyValue('--muted-foreground').trim(),
        accent: styles.getPropertyValue('--accent').trim(),
      }
    })

    // Check specific OKLCH values match the design system
    expect(lightThemeColors.background).toContain('oklch(0.984 0 0)') // Warm white
    expect(lightThemeColors.foreground).toContain('oklch(0.242 0 0)') // Dark text
    expect(lightThemeColors.mutedForeground).toContain('oklch(0.556 0 0)') // Gray text
    expect(lightThemeColors.accent).toContain('oklch(0.576 0.146 180.5)') // Professional teal
  })

  test('should apply design system colors to dashboard elements', async ({ page }) => {
    await authenticateUser(page)
    await waitForDashboardLoad(page)

    // Check header uses card background
    const headerStyles = await page.locator('header').evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      }
    })

    // Header should not use hardcoded colors
    expect(headerStyles.backgroundColor).not.toMatch(/rgb\(249, 250, 251\)/) // Not bg-gray-50
    expect(headerStyles.backgroundColor).not.toMatch(/#f9fafb/i) // Not hardcoded gray

    // Check main content uses background color
    const mainStyles = await page.locator('main').evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      }
    })

    // Should use design system colors
    expect(mainStyles.backgroundColor).not.toMatch(/rgb\(249, 250, 251\)/)
    expect(mainStyles.color).not.toMatch(/rgb\(31, 41, 55\)/) // Not text-gray-900
  })

  test('should use proper text colors on dashboard', async ({ page }) => {
    await authenticateUser(page)
    await waitForDashboardLoad(page)

    // Check heading uses foreground color
    const headingColor = await page
      .locator('h1')
      .filter({ hasText: 'The Log' })
      .evaluate(el => window.getComputedStyle(el).color)

    // Should not be hardcoded gray
    expect(headingColor).not.toMatch(/rgb\(31, 41, 55\)/) // Not text-gray-900
    expect(headingColor).not.toMatch(/#1f2937/i)

    // Check description uses muted foreground
    const descriptionColor = await page
      .locator('p')
      .filter({ hasText: 'Capture your thoughts freely' })
      .evaluate(el => window.getComputedStyle(el).color)

    // Should not be hardcoded gray
    expect(descriptionColor).not.toMatch(/rgb\(107, 114, 128\)/) // Not text-gray-600
    expect(descriptionColor).not.toMatch(/#6b7280/i)
  })

  test('should use card colors for sidebar cards', async ({ page }) => {
    await authenticateUser(page)
    await waitForDashboardLoad(page)

    // Find card elements
    const cards = await page.locator('[class*="card"], .card').all()

    for (const card of cards.slice(0, 3)) {
      // Check first 3 cards
      if (await card.isVisible()) {
        const cardStyles = await card.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
          }
        })

        // Cards should not use hardcoded white or gray
        expect(cardStyles.backgroundColor).not.toMatch(/rgb\(255, 255, 255\)/)
        expect(cardStyles.backgroundColor).not.toMatch(/#ffffff/i)
        expect(cardStyles.backgroundColor).not.toMatch(/rgb\(249, 250, 251\)/)

        // Card text should not use hardcoded grays
        if (cardStyles.color !== 'rgba(0, 0, 0, 0)') {
          // If color is set
          expect(cardStyles.color).not.toMatch(/rgb\(31, 41, 55\)/)
          expect(cardStyles.color).not.toMatch(/rgb\(107, 114, 128\)/)
        }
      }
    }
  })

  test('should handle dark theme with proper OKLCH colors', async ({ page }) => {
    await page.goto('/')

    // Wait for page to load completely
    await page.waitForLoadState('networkidle')

    // Enable dark theme via next-themes
    await page.evaluate(() => {
      // Force dark theme through next-themes
      const html = document.documentElement
      html.classList.add('dark')
      html.setAttribute('data-theme', 'dark')
      html.style.colorScheme = 'dark'
    })

    // Wait for CSS to apply the dark theme variables
    await page.waitForTimeout(1000)

    const darkThemeColors = await page.evaluate(() => {
      const root = document.documentElement
      const styles = window.getComputedStyle(root)

      return {
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim(),
        card: styles.getPropertyValue('--card').trim(),
        accent: styles.getPropertyValue('--accent').trim(),
        hasDarkClass: root.classList.contains('dark'),
      }
    })

    // Verify dark class is applied
    expect(darkThemeColors.hasDarkClass).toBe(true)

    // Dark theme should have different OKLCH values
    expect(darkThemeColors.background).toContain('oklch(0.089 0 0)') // Dark background
    expect(darkThemeColors.foreground).toContain('oklch(0.926 0 0)') // Light text
    expect(darkThemeColors.card).toContain('oklch(0.135 0 0)') // Dark card
    expect(darkThemeColors.accent).toContain('oklch(0.648 0.146 180.5)') // Professional teal for dark mode
  })

  test('should not have any invisible text elements', async ({ page }) => {
    await authenticateUser(page)
    await waitForDashboardLoad(page)

    // Get all text elements and check visibility
    const textElements = await page.locator('h1, h2, h3, h4, h5, h6, p, span, label').all()

    const invisibleElements = []

    for (const element of textElements.slice(0, 20)) {
      // Check first 20 elements
      if (await element.isVisible()) {
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el)
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            opacity: computed.opacity,
            visibility: computed.visibility,
          }
        })

        // Check for invisible conditions
        const isInvisible =
          styles.opacity === '0' ||
          styles.visibility === 'hidden' ||
          (styles.color === 'rgb(255, 255, 255)' && // White text
            styles.backgroundColor.includes('255, 255, 255')) || // on white background
          styles.color === 'rgba(0, 0, 0, 0)' // Transparent text

        if (isInvisible) {
          const elementInfo = await element.evaluate(el => ({
            tagName: el.tagName,
            className: el.className,
            textContent: el.textContent?.slice(0, 50),
          }))
          invisibleElements.push(elementInfo)
        }
      }
    }

    expect(
      invisibleElements,
      `Found invisible text elements: ${JSON.stringify(invisibleElements)}`
    ).toHaveLength(0)
  })

  test('should maintain color consistency across components', async ({ page }) => {
    await authenticateUser(page)
    await waitForDashboardLoad(page)

    // Check that similar semantic elements use consistent colors
    const headings = await page.locator('h1, h2, h3').all()
    const headingColors: string[] = []

    for (const heading of headings.slice(0, 5)) {
      if (await heading.isVisible()) {
        const color = await heading.evaluate(el => window.getComputedStyle(el).color)
        headingColors.push(color)
      }
    }

    // All headings should use foreground color (might be same)
    headingColors.forEach(color => {
      expect(color).not.toBe('rgba(0, 0, 0, 0)') // Should not be transparent
      expect(color).not.toBe('rgb(255, 255, 255)') // Should not be white (on light bg)
    })

    // Check muted text consistency
    const mutedElements = await page.locator('[class*="muted"], .text-muted-foreground').all()
    const mutedColors: string[] = []

    for (const element of mutedElements.slice(0, 3)) {
      if (await element.isVisible()) {
        const color = await element.evaluate(el => window.getComputedStyle(el).color)
        mutedColors.push(color)
      }
    }

    // Muted text should be consistent and visible
    mutedColors.forEach(color => {
      expect(color).not.toBe('rgba(0, 0, 0, 0)')
      expect(color).not.toBe('rgb(255, 255, 255)')
    })
  })
})
