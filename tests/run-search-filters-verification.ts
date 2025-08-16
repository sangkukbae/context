#!/usr/bin/env tsx

/**
 * Test Runner for SearchFilters Component Verification
 *
 * This script runs comprehensive tests to verify that the Select component
 * fixes in SearchFilters work correctly and don't introduce regressions.
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import path from 'path'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

interface TestSuite {
  name: string
  tests: TestResult[]
  totalDuration: number
  passedCount: number
  failedCount: number
}

class SearchFiltersVerifier {
  private results: TestSuite[] = []
  private startTime: number = Date.now()

  async runVerification() {
    console.log('🔍 Starting SearchFilters Component Verification\n')
    console.log('This will verify that the Select component fixes work correctly:')
    console.log('- Fixed Radix UI error with empty string values')
    console.log('- Changed empty strings to "any" for SelectItems')
    console.log('- Updated onValueChange logic for proper "any" → undefined conversion\n')

    try {
      // Run the search filters tests
      await this.runSearchFiltersTests()

      // Run regression tests
      await this.runRegressionTests()

      // Generate and display report
      this.generateReport()
    } catch (error) {
      console.error('❌ Verification failed:', error)
      process.exit(1)
    }
  }

  private async runSearchFiltersTests() {
    console.log('📋 Running SearchFilters Component Tests...\n')

    const testSuites = [
      {
        name: 'Primary Functionality Tests',
        command:
          'npx playwright test tests/e2e/search-filters.test.ts --grep "Primary Functionality Tests"',
      },
      {
        name: 'Filter Logic Verification',
        command:
          'npx playwright test tests/e2e/search-filters.test.ts --grep "Filter Logic Verification"',
      },
      {
        name: 'Edge Cases and State Management',
        command:
          'npx playwright test tests/e2e/search-filters.test.ts --grep "Edge Cases and State Management"',
      },
      {
        name: 'Regression Testing',
        command: 'npx playwright test tests/e2e/search-filters.test.ts --grep "Regression Testing"',
      },
      {
        name: 'Accessibility and UI Behavior',
        command:
          'npx playwright test tests/e2e/search-filters.test.ts --grep "Accessibility and UI Behavior"',
      },
    ]

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.command)
    }
  }

  private async runRegressionTests() {
    console.log('🔄 Running Regression Tests...\n')

    // Run related search component tests to ensure no regressions
    const regressionSuites = [
      {
        name: 'Search Components Regression',
        command:
          'npx playwright test tests/components/search-components.test.ts --grep "Search Page"',
      },
      {
        name: 'Search Workflow Regression',
        command:
          'npx playwright test tests/e2e/search-workflow.test.ts --grep "Search Data Validation"',
      },
    ]

    for (const suite of regressionSuites) {
      await this.runTestSuite(suite.name, suite.command)
    }
  }

  private async runTestSuite(suiteName: string, command: string): Promise<void> {
    console.log(`Running: ${suiteName}`)
    const suiteStartTime = Date.now()

    try {
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: process.cwd(),
      })

      const duration = Date.now() - suiteStartTime
      const testResults = this.parsePlaywrightOutput(output)

      const suite: TestSuite = {
        name: suiteName,
        tests: testResults,
        totalDuration: duration,
        passedCount: testResults.filter(t => t.passed).length,
        failedCount: testResults.filter(t => !t.passed).length,
      }

      this.results.push(suite)

      if (suite.failedCount === 0) {
        console.log(`✅ ${suiteName} - All tests passed (${duration}ms)\n`)
      } else {
        console.log(`❌ ${suiteName} - ${suite.failedCount} tests failed (${duration}ms)\n`)
      }
    } catch (error: unknown) {
      const duration = Date.now() - suiteStartTime
      const suite: TestSuite = {
        name: suiteName,
        tests: [
          {
            name: 'Suite Execution',
            passed: false,
            duration,
            error: error instanceof Error ? error.message : String(error),
          },
        ],
        totalDuration: duration,
        passedCount: 0,
        failedCount: 1,
      }

      this.results.push(suite)
      console.log(`❌ ${suiteName} - Failed to execute (${duration}ms)`)
      console.log(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
    }
  }

  private parsePlaywrightOutput(output: string): TestResult[] {
    const tests: TestResult[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      // Parse Playwright test results
      if (line.includes('✓') || line.includes('✗')) {
        const passed = line.includes('✓')
        const nameMatch = line.match(/[✓✗]\s+(.+?)\s+\((\d+)ms\)/)
        if (nameMatch) {
          tests.push({
            name: nameMatch[1].trim(),
            passed,
            duration: parseInt(nameMatch[2]),
          })
        }
      }
    }

    // If no tests parsed, assume single test result
    if (tests.length === 0) {
      tests.push({
        name: 'Test execution',
        passed: !output.includes('failed') && !output.includes('error'),
        duration: 0,
      })
    }

    return tests
  }

  private generateReport() {
    const totalDuration = Date.now() - this.startTime
    const totalTests = this.results.reduce((sum, suite) => sum + suite.tests.length, 0)
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passedCount, 0)
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failedCount, 0)

    console.log('\n' + '='.repeat(80))
    console.log('🎯 SEARCHFILTERS COMPONENT VERIFICATION REPORT')
    console.log('='.repeat(80))

    console.log(`\n📊 OVERALL RESULTS:`)
    console.log(`   Total Tests: ${totalTests}`)
    console.log(`   Passed: ${totalPassed} ✅`)
    console.log(`   Failed: ${totalFailed} ${totalFailed > 0 ? '❌' : '✅'}`)
    console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`)
    console.log(`   Total Duration: ${totalDuration}ms`)

    console.log(`\n📋 DETAILED RESULTS:`)

    for (const suite of this.results) {
      console.log(`\n   ${suite.name}:`)
      console.log(`   ├─ Tests: ${suite.tests.length}`)
      console.log(`   ├─ Passed: ${suite.passedCount}`)
      console.log(`   ├─ Failed: ${suite.failedCount}`)
      console.log(`   └─ Duration: ${suite.totalDuration}ms`)

      if (suite.failedCount > 0) {
        console.log(`   Failed Tests:`)
        suite.tests
          .filter(t => !t.passed)
          .forEach(test => {
            console.log(`     • ${test.name}`)
            if (test.error) {
              console.log(`       Error: ${test.error}`)
            }
          })
      }
    }

    console.log(`\n🔍 VERIFICATION FOCUS AREAS:`)
    console.log(`   ✓ Radix UI SelectItem error fixes`)
    console.log(`   ✓ "any" value handling instead of empty strings`)
    console.log(`   ✓ onValueChange logic for undefined conversion`)
    console.log(`   ✓ Filter state management`)
    console.log(`   ✓ UI interaction behavior`)
    console.log(`   ✓ Regression prevention`)

    if (totalFailed === 0) {
      console.log(`\n🎉 SUCCESS: All SearchFilters component fixes verified!`)
      console.log(`   The Select component fixes are working correctly.`)
      console.log(`   No regressions detected in related components.`)
    } else {
      console.log(`\n⚠️  ISSUES DETECTED: ${totalFailed} test(s) failed`)
      console.log(`   Please review the failed tests above.`)
      console.log(`   Some fixes may need adjustment or additional work.`)
    }

    // Generate JSON report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        successRate: (totalPassed / totalTests) * 100,
        totalDuration,
      },
      suites: this.results,
      focusAreas: [
        'Radix UI SelectItem error fixes',
        'Any value handling instead of empty strings',
        'onValueChange logic for undefined conversion',
        'Filter state management',
        'UI interaction behavior',
        'Regression prevention',
      ],
    }

    const reportPath = path.join(process.cwd(), 'search-filters-verification-report.json')
    writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)

    console.log('\n' + '='.repeat(80))
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new SearchFiltersVerifier()
  verifier.runVerification().catch(error => {
    console.error('❌ Verification script failed:', error)
    process.exit(1)
  })
}

export { SearchFiltersVerifier }
