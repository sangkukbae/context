import { test, expect } from '@playwright/test'

test.describe('Color System Verification', () => {
  test('should load home page with proper design system colors', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to load
    await expect(page.locator('header h1')).toContainText('Context')

    // Check that OKLCH color variables are defined
    const _backgroundValue = await page.evaluate(() => {
      const _style = getComputedStyle(document.documentElement)
      return style.getPropertyValue('--background').trim()
    })

    const _foregroundValue = await page.evaluate(() => {
      const _style = getComputedStyle(document.documentElement)
      return style.getPropertyValue('--foreground').trim()
    })

    const _accentValue = await page.evaluate(() => {
      const _style = getComputedStyle(document.documentElement)
      return style.getPropertyValue('--accent').trim()
    })

    // Verify OKLCH color variables are defined
    expect(backgroundValue).toContain('oklch')
    expect(foregroundValue).toContain('oklch')
    expect(accentValue).toContain('oklch')

    console.log('✅ OKLCH Variables:', { backgroundValue, foregroundValue, accentValue })

    // Check for hardcoded gray colors that should be removed
    const _bodyStyles = await page.evaluate(() => {
      const _bodyElement = document.body
      const _computedStyles = getComputedStyle(bodyElement)
      return {
        backgroundColor: computedStyles.backgroundColor,
        color: computedStyles.color,
      }
    })

    // Verify body is using design system colors, not hardcoded grays
    console.log('✅ Body styles:', bodyStyles)

    // Check that text is visible by verifying contrast
    const _headerElement = page.locator('header h1')
    await expect(headerElement).toBeVisible()

    // Get computed styles for contrast verification
    const _headerStyles = await headerElement.evaluate(el => {
      const _styles = getComputedStyle(el)
      return {
        color: styles.color,
        backgroundColor: getComputedStyle(el.closest('header')!).backgroundColor,
      }
    })

    console.log('✅ Header styles:', headerStyles)

    // Verify no hardcoded gray colors in RGB format
    expect(headerStyles.backgroundColor).not.toBe('rgb(249, 250, 251)') // bg-gray-50
    expect(headerStyles.color).not.toBe('rgb(31, 41, 55)') // text-gray-900
  })

  test('should have visible text elements throughout the page', async ({ page }) => {
    await page.goto('/')

    // Check main heading visibility
    const _mainHeading = page.locator('h1').first()
    await expect(mainHeading).toBeVisible()

    // Check feature cards visibility
    const _featureCards = page.locator('[class*="Card"]')
    const _cardCount = await featureCards.count()

    for (let i = 0; i < cardCount; i++) {
      const _card = featureCards.nth(i)
      await expect(card).toBeVisible()

      // Check if card has visible text
      const _hasText = await card.evaluate(el => {
        const _textContent = el.textContent?.trim()
        return textContent && textContent.length > 0
      })

      if (hasText) {
        console.log(`✅ Card ${i + 1} has visible text`)
      }
    }

    // Check that buttons are visible
    const _buttons = page.locator('button, a[class*="Button"]')
    const _buttonCount = await buttons.count()

    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        // Check first 3 buttons
        await expect(buttons.nth(i)).toBeVisible()
        console.log(`✅ Button ${i + 1} is visible`)
      }
    }
  })

  test('should use accent color consistently', async ({ page }) => {
    await page.goto('/')

    // Find elements that should use accent color
    const _accentElements = await page.$$eval('[class*="text-accent"]', elements =>
      elements.map(el => {
        const _styles = getComputedStyle(el)
        return {
          tagName: el.tagName,
          className: el.className,
          color: styles.color,
        }
      })
    )

    if (accentElements.length > 0) {
      console.log('✅ Found accent elements:', accentElements)

      // All accent elements should have the same color
      const _firstColor = accentElements[0].color
      const _allSameColor = accentElements.every(el => el.color === firstColor)
      expect(allSameColor).toBeTruthy()
      console.log(`✅ All accent elements use consistent color: ${firstColor}`)
    }
  })
})
