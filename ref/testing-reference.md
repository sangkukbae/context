# Testing Reference

This document provides comprehensive reference for testing in the Context application.

## Testing Overview

The Context application uses **Playwright** for end-to-end testing with comprehensive coverage of:

- **API Endpoints**: Health checks and monitoring endpoints
- **UI Components**: Health dashboard and monitoring interfaces
- **Integration Testing**: Monitoring systems integration
- **Error Handling**: Edge cases and failure scenarios
- **Performance Testing**: Response time validation
- **Accessibility Testing**: WCAG compliance

## Test Framework Configuration

### Playwright Configuration (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results.json' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Desktop browsers
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },

    // Mobile devices
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

### Test Scripts (`package.json`)

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:headed": "playwright test --headed",
    "test:monitoring": "playwright test tests/monitoring",
    "test:report": "playwright show-report"
  }
}
```

## Test Structure

### Directory Organization

```
tests/
├── monitoring/                    # Monitoring feature tests
│   ├── health-api.spec.ts        # Health API endpoint tests
│   ├── health-dashboard.spec.ts  # Dashboard UI tests
│   ├── monitoring-integrations.spec.ts # Integration tests
│   └── error-handling.spec.ts    # Error scenarios
├── fixtures/                     # Test data and utilities
│   └── health-responses.ts       # Mock responses
└── README.md                     # Test documentation
```

### Test Categories

#### 1. API Testing (`health-api.spec.ts`)

Tests for the `/api/health` endpoint:

```typescript
import { test, expect } from '@playwright/test'
import type { HealthCheckResponse } from '@/app/api/health/route'
import { healthyResponse, degradedResponse } from '../fixtures/health-responses'

test.describe('Health API', () => {
  test('should return healthy status when all services are up', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)

    const healthData: HealthCheckResponse = await response.json()
    expect(healthData.status).toBe('healthy')
    expect(healthData.services.database.status).toBe('up')
    expect(healthData.monitoring.sentry).toBe(true)
  })

  test('should return degraded status when some services have issues', async ({ page }) => {
    // Mock degraded services
    await page.route('/api/health', route => {
      route.fulfill({
        status: 206,
        contentType: 'application/json',
        body: JSON.stringify(degradedResponse),
      })
    })

    const response = await page.request.get('/api/health')
    expect(response.status()).toBe(206)
  })

  test('should respond within performance threshold', async ({ request }) => {
    const startTime = Date.now()
    const response = await request.get('/api/health')
    const duration = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(duration).toBeLessThan(500) // 500ms threshold
  })
})
```

#### 2. UI Testing (`health-dashboard.spec.ts`)

Tests for the health dashboard interface:

```typescript
import { test, expect } from '@playwright/test'
import { healthyResponse } from '../fixtures/health-responses'

test.describe('Health Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock healthy API response
    await page.route('/api/health', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(healthyResponse),
      })
    })
  })

  test('should load health dashboard page', async ({ page }) => {
    await page.goto('/admin/health')

    // Check page metadata
    await expect(page).toHaveTitle(/System Health/)

    // Check main components
    await expect(page.getByText('System Health')).toBeVisible()
    await expect(page.getByText('Overall Status')).toBeVisible()
  })

  test('should display service status cards', async ({ page }) => {
    await page.goto('/admin/health')

    // Wait for data to load
    await expect(page.getByText('Database')).toBeVisible()
    await expect(page.getByText('Supabase')).toBeVisible()

    // Check status badges
    const statusBadges = page.locator('[data-testid="status-badge"]')
    await expect(statusBadges.first()).toBeVisible()
  })

  test('should handle refresh functionality', async ({ page }) => {
    await page.goto('/admin/health')

    // Wait for initial load
    await expect(page.getByText('System Health')).toBeVisible()

    // Click refresh button
    const refreshButton = page.getByRole('button', { name: /refresh/i })
    await refreshButton.click()

    // Verify refresh triggered
    await expect(page.getByText('System Health')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/admin/health')

    // Check mobile layout
    await expect(page.getByText('System Health')).toBeVisible()

    // Verify touch interactions work
    const refreshButton = page.getByRole('button', { name: /refresh/i })
    await refreshButton.click()
  })
})
```

#### 3. Integration Testing (`monitoring-integrations.spec.ts`)

Tests for monitoring system integrations:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Monitoring Integrations', () => {
  test('should load Vercel Analytics without errors', async ({ page }) => {
    // Monitor console errors
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')

    // Wait for analytics to load
    await page.waitForTimeout(2000)

    // Should not have analytics-related errors
    const analyticsErrors = errors.filter(
      error => error.includes('analytics') || error.includes('vercel')
    )
    expect(analyticsErrors).toHaveLength(0)
  })

  test('should initialize Sentry without blocking page load', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // 3s threshold
  })

  test('should report health status correctly', async ({ page, request }) => {
    await page.goto('/admin/health')

    // Check that health API is called
    const healthResponse = await page.waitForResponse('/api/health')
    expect(healthResponse.status()).toBe(200)

    // Verify monitoring status is reflected in UI
    await expect(page.getByText('Sentry')).toBeVisible()
    await expect(page.getByText('Vercel Analytics')).toBeVisible()
  })
})
```

#### 4. Error Handling Testing (`error-handling.spec.ts`)

Tests for error scenarios and edge cases:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Error Handling', () => {
  test('should handle API timeout gracefully', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/health', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000)) // 5s delay
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Timeout' }),
      })
    })

    await page.goto('/admin/health')

    // Should show error state
    await expect(page.getByText(/error/i)).toBeVisible({ timeout: 10000 })
  })

  test('should handle malformed JSON response', async ({ page }) => {
    await page.route('/api/health', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json{',
      })
    })

    await page.goto('/admin/health')

    // Should show error state
    await expect(page.getByText(/error/i)).toBeVisible()
  })

  test('should prevent XSS attacks', async ({ page }) => {
    const maliciousScript = '<script>window.xssExecuted = true</script>'

    await page.route('/api/health', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          services: {
            database: {
              status: 'up',
              error: maliciousScript,
            },
          },
        }),
      })
    })

    await page.goto('/admin/health')

    // Script should not execute
    const xssExecuted = await page.evaluate(() => (window as any).xssExecuted)
    expect(xssExecuted).toBeUndefined()
  })

  test('should maintain accessibility during errors', async ({ page }) => {
    await page.route('/api/health', route => {
      route.fulfill({ status: 500 })
    })

    await page.goto('/admin/health')

    // Check keyboard navigation still works
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })
})
```

## Mock Data and Fixtures

### Health Response Fixtures (`fixtures/health-responses.ts`)

```typescript
import type { HealthCheckResponse } from '@/app/api/health/route'

export const healthyResponse: HealthCheckResponse = {
  status: 'healthy',
  timestamp: '2024-01-15T10:30:00.000Z',
  version: '0.1.0',
  environment: 'development',
  services: {
    database: { status: 'up', responseTime: 150 },
    supabase: { status: 'up', responseTime: 200 },
    openai: { status: 'up', responseTime: 800 },
  },
  features: {
    aiClustering: true,
    documentGeneration: true,
    semanticSearch: true,
    realTimeSync: true,
  },
  monitoring: {
    sentry: true,
    vercelAnalytics: true,
    supabaseDashboard: true,
  },
  uptime: 3600000,
}

export const degradedResponse: HealthCheckResponse = {
  ...healthyResponse,
  status: 'degraded',
  services: {
    database: { status: 'up', responseTime: 150 },
    supabase: { status: 'degraded', responseTime: 2500 },
    openai: { status: 'up', responseTime: 800 },
  },
}

export const unhealthyResponse: HealthCheckResponse = {
  ...healthyResponse,
  status: 'unhealthy',
  services: {
    database: { status: 'down', error: 'Connection failed' },
    supabase: { status: 'down', error: 'Service unavailable' },
  },
}

export const performanceThresholds = {
  healthApi: { acceptable: 500, slow: 1000 },
  database: { acceptable: 200, slow: 1000 },
  supabase: { acceptable: 300, slow: 2000 },
  openai: { acceptable: 2000, slow: 10000 },
  redis: { acceptable: 50, slow: 200 },
}
```

## Test Execution

### Running Tests

```bash
# All tests
pnpm test

# Specific test file
pnpm test tests/monitoring/health-api.spec.ts

# Specific test by name
pnpm test -g "should return healthy status"

# All monitoring tests
pnpm test:monitoring

# Interactive mode
pnpm test:ui

# Debug mode
pnpm test:debug

# Headed mode (browser visible)
pnpm test:headed
```

### Test Reports

```bash
# Generate and view HTML report
pnpm test:report

# JSON report location
cat test-results.json | jq '.suites'
```

### Debugging Tests

```typescript
// Add debug points
test('debug example', async ({ page }) => {
  await page.goto('/admin/health')

  // Pause for manual inspection
  await page.pause()

  // Take screenshot
  await page.screenshot({ path: 'debug.png' })

  // Console output
  console.log('Debug info:', await page.textContent('body'))
})
```

## Performance Testing

### Response Time Validation

```typescript
test('should meet performance thresholds', async ({ request }) => {
  const results = []

  // Run multiple iterations
  for (let i = 0; i < 10; i++) {
    const start = Date.now()
    const response = await request.get('/api/health')
    const duration = Date.now() - start

    expect(response.status()).toBe(200)
    results.push(duration)
  }

  // Calculate statistics
  const average = results.reduce((a, b) => a + b) / results.length
  const max = Math.max(...results)

  expect(average).toBeLessThan(500) // Average < 500ms
  expect(max).toBeLessThan(1000) // Max < 1000ms
})
```

### Load Testing

```typescript
test('should handle concurrent requests', async ({ request }) => {
  const concurrentRequests = 10
  const promises = Array.from({ length: concurrentRequests }, () => request.get('/api/health'))

  const responses = await Promise.all(promises)

  // All requests should succeed
  responses.forEach(response => {
    expect(response.status()).toBe(200)
  })
})
```

## Accessibility Testing

### Keyboard Navigation

```typescript
test('should support keyboard navigation', async ({ page }) => {
  await page.goto('/admin/health')

  // Tab through interactive elements
  await page.keyboard.press('Tab')

  let focusedElement = page.locator(':focus')
  await expect(focusedElement).toBeVisible()

  // Continue tabbing
  await page.keyboard.press('Tab')
  focusedElement = page.locator(':focus')
  await expect(focusedElement).toBeVisible()
})
```

### ARIA Compliance

```typescript
test('should have proper ARIA labels', async ({ page }) => {
  await page.goto('/admin/health')

  // Check for ARIA labels
  const buttons = page.locator('button')
  const buttonCount = await buttons.count()

  for (let i = 0; i < buttonCount; i++) {
    const button = buttons.nth(i)
    const ariaLabel = await button.getAttribute('aria-label')
    const textContent = await button.textContent()

    // Button should have either aria-label or text content
    expect(ariaLabel || textContent).toBeTruthy()
  }
})
```

## Test Patterns and Best Practices

### Page Object Model

```typescript
// pages/health-dashboard.page.ts
export class HealthDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/health')
  }

  async getOverallStatus() {
    return this.page.getByTestId('overall-status').textContent()
  }

  async refreshData() {
    await this.page.getByRole('button', { name: /refresh/i }).click()
  }

  async waitForHealthData() {
    await this.page.waitForResponse('/api/health')
  }
}

// Usage in tests
test('page object example', async ({ page }) => {
  const healthPage = new HealthDashboardPage(page)

  await healthPage.goto()
  await healthPage.waitForHealthData()

  const status = await healthPage.getOverallStatus()
  expect(status).toContain('healthy')
})
```

### Test Data Management

```typescript
// fixtures/test-data.ts
export class TestDataBuilder {
  private data: Partial<HealthCheckResponse> = {}

  healthy(): this {
    this.data.status = 'healthy'
    return this
  }

  withDatabaseDown(): this {
    this.data.services = {
      ...this.data.services,
      database: { status: 'down', error: 'Connection failed' },
    }
    return this
  }

  build(): HealthCheckResponse {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: 'test',
      services: { database: { status: 'up' } },
      features: {},
      monitoring: {},
      uptime: 0,
      ...this.data,
    }
  }
}

// Usage
const testData = new TestDataBuilder().healthy().withDatabaseDown().build()
```

### Error Injection

```typescript
test('should handle network errors', async ({ page }) => {
  // Simulate network failure
  await page.route('/api/health', route => {
    route.abort('failed')
  })

  await page.goto('/admin/health')

  // Should show error state
  await expect(page.getByText(/unable to load/i)).toBeVisible()
})
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests
        run: pnpm test

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables

```bash
# CI-specific environment variables
CI=true
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

## Troubleshooting

### Common Issues

1. **Server not starting**:

   ```bash
   # Check port availability
   lsof -i :3000

   # Kill existing processes
   kill -9 $(lsof -t -i:3000)
   ```

2. **Browser installation**:

   ```bash
   npx playwright install
   npx playwright install-deps
   ```

3. **Test timeouts**:

   ```typescript
   // Increase timeout for specific test
   test('slow test', async ({ page }) => {
     test.setTimeout(60000) // 60s timeout
   })
   ```

4. **Flaky tests**:

   ```typescript
   // Wait for stable state
   await page.waitForLoadState('networkidle')

   // Use explicit waits
   await expect(element).toBeVisible({ timeout: 10000 })
   ```

### Debug Techniques

```typescript
// Enable debug logging
process.env.DEBUG = 'pw:api'

// Take screenshots on failure
test('example', async ({ page }, testInfo) => {
  try {
    // Test logic
  } catch (error) {
    await page.screenshot({
      path: `failure-${testInfo.title}.png`,
    })
    throw error
  }
})

// Video recording
// Configured in playwright.config.ts:
use: {
  video: 'retain-on-failure'
}
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [API Testing Guide](https://playwright.dev/docs/api-testing)
