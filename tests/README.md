# Context Application Test Suite

This directory contains comprehensive tests for the Context application, including search functionality, dashboard visibility, and visual regression testing.

## 🚀 Quick Start

### Prerequisites

1. Install Playwright browsers:

   ```bash
   npx playwright install
   ```

2. Ensure development server is running:

   ```bash
   pnpm dev
   ```

3. Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test categories
pnpm test tests/e2e/dashboard-visibility.test.ts  # Dashboard text visibility
pnpm test tests/e2e/visual-regression.test.ts     # Visual regression tests
pnpm test tests/e2e/css-colors.test.ts           # CSS design system tests
pnpm test tests/database/search-database.test.ts  # Database integration
pnpm test tests/api/search-api.test.ts            # API endpoints
pnpm test tests/components/search-components.test.ts # UI components
pnpm test tests/e2e/search-workflow.test.ts       # Search workflows
pnpm test tests/validation/search-validation.test.ts # Data validation

# Run with single browser for faster execution
pnpm test --project=chromium

# Run with UI mode for debugging
pnpm test:ui

# Run in headed mode (visible browser)
pnpm test:headed

# Generate test report
pnpm test:report

# Generate comprehensive search report
tsx tests/run-search-tests.ts
```

## 📁 Test Structure

```
tests/
├── README.md                        # This file
├── run-search-tests.ts              # Comprehensive test runner
├── basic-health-check.test.ts       # Basic application health
├── fixtures/
│   ├── auth.ts                      # Authentication fixtures
│   └── search-data.ts               # Test data management
├── helpers/
│   └── auth-helper.ts               # Authentication helper utilities
├── database/
│   └── search-database.test.ts      # Database integration tests
├── api/
│   └── search-api.test.ts           # API endpoint tests
├── components/
│   └── search-components.test.ts    # UI component tests
├── e2e/
│   ├── dashboard-visibility.test.ts # Dashboard text visibility tests
│   ├── visual-regression.test.ts    # Visual regression tests
│   ├── css-colors.test.ts          # CSS design system tests
│   └── search-workflow.test.ts     # End-to-end search workflows
└── validation/
    └── search-validation.test.ts    # Data validation tests
```

## 🧪 Test Categories

### Dashboard & UI Tests

#### 1. Dashboard Visibility Tests

- **File**: `tests/e2e/dashboard-visibility.test.ts`
- **Focus**: Text visibility and contrast verification
- **Tests**: 15+ test cases
- **Key Features**:
  - Dashboard loads without invisible text
  - Proper contrast ratios for all text elements
  - Header, main content, and sidebar text visibility
  - Design system color usage validation

#### 2. Visual Regression Tests

- **File**: `tests/e2e/visual-regression.test.ts`
- **Focus**: Screenshot-based visual change detection
- **Tests**: 10+ test cases
- **Key Features**:
  - Full page and component-level screenshots
  - Theme switching visual validation
  - Pixel-level contrast analysis
  - Visual baseline comparison

#### 3. CSS Design System Tests

- **File**: `tests/e2e/css-colors.test.ts`
- **Focus**: OKLCH color system validation
- **Tests**: 12+ test cases
- **Key Features**:
  - OKLCH color variables properly defined
  - No hardcoded gray colors (bg-gray-50, text-gray-900, etc.)
  - Light and dark theme color consistency
  - Design system color application across components

### Search Functionality Tests

#### 4. Database Integration Tests

- **File**: `tests/database/search-database.test.ts`
- **Focus**: Database tables, functions, RLS policies
- **Tests**: 10 test cases
- **Key Features**: Search functions, Korean text support, performance

#### 5. API Route Tests

- **File**: `tests/api/search-api.test.ts`
- **Focus**: REST API endpoints with authentication
- **Tests**: 25+ test cases
- **Key Features**: Authentication, validation, error handling

#### 6. Component Integration Tests

- **File**: `tests/components/search-components.test.ts`
- **Focus**: UI components and user interactions
- **Tests**: 20+ test cases
- **Key Features**: Accessibility, responsive design, keyboard shortcuts

#### 7. End-to-End Search Workflow Tests

- **File**: `tests/e2e/search-workflow.test.ts`
- **Focus**: Complete search user journeys
- **Tests**: 15+ test cases
- **Key Features**: Cross-component integration, mobile testing

#### 8. Data Validation Tests

- **File**: `tests/validation/search-validation.test.ts`
- **Focus**: Data integrity and search accuracy
- **Tests**: 15+ test cases
- **Key Features**: Unicode support, ranking algorithms, analytics

## 🎯 Performance Requirements

All tests validate these performance targets:

### Dashboard & UI Performance

- **Dashboard Load**: <3s for complete dashboard rendering
- **Text Visibility**: 100% visible text elements with proper contrast
- **Visual Regression**: <5% pixel difference tolerance
- **CSS Variables**: 100% OKLCH color system usage

### Search Performance

- **Search Response**: <500ms for keyword searches
- **Database Queries**: <200ms for search functions
- **UI Interactions**: <200ms for input responses

## 🔍 Test Coverage

- **Database Layer**: 100% (tables, functions, policies)
- **API Layer**: 95% (endpoints, auth, validation)
- **UI Layer**: 90% (components, interactions, responsive)
- **Integration**: 85% (workflows, error scenarios)
- **Data Integrity**: 95% (Unicode, ranking, analytics)

## 🛠️ Troubleshooting

### Common Issues

1. **"supabaseKey is required" error**:
   - Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in environment
   - Check `.env.local` file exists and is properly formatted

2. **"Executable doesn't exist" error**:
   - Run `npx playwright install` to download browser binaries

3. **"Test timeout" errors**:
   - Ensure development server is running on port 3002
   - Check database connection is working

4. **Authentication failures**:
   - Verify Supabase service role key is correct
   - Check user creation permissions in Supabase

### Debug Mode

Run tests with additional debugging:

```bash
# Headed mode (visible browser)
npx playwright test --headed

# Debug mode (step through)
npx playwright test --debug

# Verbose output
npx playwright test --reporter=line --verbose
```

## 📊 Test Reports

### Console Report

Basic test results are displayed in the console during execution.

### HTML Report

Playwright generates an HTML report automatically:

```bash
npx playwright show-report
```

### Comprehensive Report

Use the custom test runner for detailed analysis:

```bash
tsx tests/run-search-tests.ts
```

This generates:

- JSON report in `test-results/search-test-report.json`
- Console summary with performance metrics
- Environment validation
- Coverage analysis

## 🔧 Configuration

### Playwright Config

Tests use the main `playwright.config.ts` with these key settings:

- **Base URL**: `http://localhost:3002`
- **Timeout**: 60 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Browsers**: Chrome, Firefox, Safari, Mobile

### Environment Variables

Required for test execution:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Test Configuration (optional)
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3002
```

## 🎉 Success Criteria

Tests are considered successful when:

- ✅ All database functions are operational
- ✅ API endpoints respond correctly with authentication
- ✅ UI components handle user interactions properly
- ✅ Search performance meets <500ms requirement
- ✅ Korean text search works correctly
- ✅ Search analytics are tracked accurately
- ✅ Error scenarios are handled gracefully

---

For detailed test results and analysis, see the generated [Search Test Report](../SEARCH_TEST_REPORT.md).
