/**
 * Dashboard Visibility Tests Runner
 *
 * Runs comprehensive tests to verify that text visibility fixes are working properly:
 * 1. Dashboard text elements are visible with proper contrast
 * 2. Design system OKLCH colors are being used instead of hardcoded grays
 * 3. Visual regression tests pass
 */
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const _execAsync = promisify(exec)

interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  errors?: string[]
}

interface TestSuite {
  name: string
  results: TestResult[]
  totalTests: number
  passed: number
  failed: number
  duration: number
}

async function runPlaywrightTests(testFile: string): Promise<TestSuite> {
  const _testPath = path.join('tests', testFile)
  console.log(`🧪 Running ${testFile}...`)

  try {
    const _startTime = Date.now()
    const { stdout, stderr } = await execAsync(`pnpm test ${testPath} --reporter=json`, {
      cwd: process.cwd(),
      timeout: 120000, // 2 minutes timeout
    })

    const _duration = Date.now() - startTime

    // Parse Playwright JSON output
    let results: TestResult[] = []
    let totalTests = 0
    let passed = 0
    let failed = 0

    try {
      const _jsonOutput = JSON.parse(stdout)
      if (jsonOutput.suites) {
        for (const suite of jsonOutput.suites) {
          for (const spec of suite.specs || []) {
            for (const test of spec.tests || []) {
              totalTests++
              const result: TestResult = {
                name: test.title || spec.title,
                status: test.results?.[0]?.status || 'skipped',
                duration: test.results?.[0]?.duration || 0,
              }

              if (result.status === 'passed') passed++
              else if (result.status === 'failed') {
                failed++
                result.errors = test.results?.[0]?.errors || []
              }

              results.push(result)
            }
          }
        }
      }
    } catch (parseError) {
      console.log('Could not parse JSON output, using fallback parsing')

      // Fallback: parse text output
      const _lines = stdout.split('\n')
      for (const line of lines) {
        if (line.includes('✓') || line.includes('✗') || line.includes('○')) {
          totalTests++
          const _status = line.includes('✓') ? 'passed' : line.includes('✗') ? 'failed' : 'skipped'

          if (status === 'passed') passed++
          else if (status === 'failed') failed++

          results.push({
            name: line.trim(),
            status,
            duration: 0,
          })
        }
      }
    }

    return {
      name: testFile,
      results,
      totalTests,
      passed,
      failed,
      duration,
    }
  } catch (error: Record<string, unknown>) {
    console.error(`❌ Error running ${testFile}:`, error.message)

    return {
      name: testFile,
      results: [
        {
          name: 'Test execution failed',
          status: 'failed',
          duration: 0,
          errors: [error.message],
        },
      ],
      totalTests: 1,
      passed: 0,
      failed: 1,
      duration: 0,
    }
  }
}

async function checkEnvironment(): Promise<void> {
  console.log('🔍 Checking environment...')

  try {
    // Check if development server is running
    await execAsync('curl -f http://localhost:3004 > /dev/null 2>&1')
    console.log('✅ Development server is running on port 3004')
  } catch {
    console.log('⚠️  Development server is not running on port 3004')
    console.log('   Please run: pnpm dev')
  }

  try {
    // Check Playwright installation
    await execAsync('npx playwright --version')
    console.log('✅ Playwright is installed')
  } catch {
    console.log('❌ Playwright is not installed')
    console.log('   Please run: npx playwright install')
    process.exit(1)
  }
}

async function main() {
  console.log('🎯 Dashboard Visibility Test Runner')
  console.log('=====================================\n')

  await checkEnvironment()
  console.log()

  const _testSuites = [
    'e2e/dashboard-visibility.test.ts',
    'e2e/visual-regression.test.ts',
    'e2e/css-colors.test.ts',
  ]

  const results: TestSuite[] = []
  let totalDuration = 0

  for (const testFile of testSuites) {
    const _result = await runPlaywrightTests(testFile)
    results.push(result)
    totalDuration += result.duration
  }

  // Summary Report
  console.log('\n📊 Test Summary')
  console.log('================')

  let totalTests = 0
  let totalPassed = 0
  let totalFailed = 0

  for (const suite of results) {
    const _status = suite.failed === 0 ? '✅' : '❌'
    console.log(`${status} ${suite.name}`)
    console.log(`   Tests: ${suite.totalTests}, Passed: ${suite.passed}, Failed: ${suite.failed}`)
    console.log(`   Duration: ${(suite.duration / 1000).toFixed(2)}s\n`)

    totalTests += suite.totalTests
    totalPassed += suite.passed
    totalFailed += suite.failed
  }

  // Overall Results
  console.log('🎯 Overall Results')
  console.log('==================')
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`)
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)

  // Failed Test Details
  if (totalFailed > 0) {
    console.log('\n❌ Failed Tests Details')
    console.log('=======================')

    for (const suite of results) {
      const _failedTests = suite.results.filter(r => r.status === 'failed')
      if (failedTests.length > 0) {
        console.log(`\n${suite.name}:`)
        for (const test of failedTests) {
          console.log(`  • ${test.name}`)
          if (test.errors) {
            for (const error of test.errors) {
              console.log(`    Error: ${error}`)
            }
          }
        }
      }
    }
  }

  // Text Visibility Specific Checks
  console.log('\n🎨 Text Visibility Status')
  console.log('=========================')

  const _visibilityTests = results.find(r => r.name.includes('dashboard-visibility'))
  const _cssTests = results.find(r => r.name.includes('css-colors'))
  const _visualTests = results.find(r => r.name.includes('visual-regression'))

  if (visibilityTests && visibilityTests.failed === 0) {
    console.log('✅ Dashboard text visibility: All tests passed')
  } else {
    console.log('❌ Dashboard text visibility: Some tests failed')
  }

  if (cssTests && cssTests.failed === 0) {
    console.log('✅ OKLCH color system: All tests passed')
  } else {
    console.log('❌ OKLCH color system: Some tests failed')
  }

  if (visualTests && visualTests.failed === 0) {
    console.log('✅ Visual regression: All tests passed')
  } else {
    console.log('❌ Visual regression: Some tests failed')
  }

  // Recommendations
  console.log('\n💡 Recommendations')
  console.log('==================')

  if (totalFailed === 0) {
    console.log('🎉 All dashboard visibility tests are passing!')
    console.log('✅ Text visibility issues have been successfully fixed')
    console.log('✅ Design system colors are being used correctly')
    console.log('✅ No visual regressions detected')
  } else {
    console.log('🔧 Some tests are failing. Consider:')

    if (visibilityTests && visibilityTests.failed > 0) {
      console.log('• Check that all text elements use design system colors')
      console.log('• Verify contrast ratios meet accessibility standards')
    }

    if (cssTests && cssTests.failed > 0) {
      console.log('• Ensure no hardcoded gray colors (bg-gray-50, text-gray-900, etc.)')
      console.log('• Verify OKLCH color variables are properly defined in globals.css')
    }

    if (visualTests && visualTests.failed > 0) {
      console.log('• Review visual changes and update baselines if needed')
      console.log('• Check theme switching functionality')
    }

    console.log('\nRun individual test files for more details:')
    console.log('• pnpm test tests/e2e/dashboard-visibility.test.ts')
    console.log('• pnpm test tests/e2e/css-colors.test.ts')
    console.log('• pnpm test tests/e2e/visual-regression.test.ts')
  }

  process.exit(totalFailed > 0 ? 1 : 0)
}

// Run the tests
main().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})
