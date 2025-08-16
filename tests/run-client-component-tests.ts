#!/usr/bin/env tsx
/**
 * Client Component Error Tests Runner
 *
 * Specialized test runner for Client Component error regression tests.
 * This runner ensures that the search page Client Component fix is working
 * correctly and monitors for any serialization errors.
 */

import { execSync } from 'child_process'
import { join } from 'path'

interface TestResult {
  testFile: string
  passed: number
  failed: number
  skipped: number
  duration: number
  errors: string[]
}

interface TestSummary {
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
  results: TestResult[]
  success: boolean
}

const _CLIENT_COMPONENT_TESTS = [
  'tests/e2e/client-component-regression.test.ts',
  'tests/e2e/search-page-errors.test.ts',
  'tests/e2e/search-interaction.test.ts',
]

async function runTest(testFile: string): Promise<TestResult> {
  console.log(`\n🧪 Running ${testFile}...`)

  const _startTime = Date.now()
  let passed = 0
  let failed = 0
  let skipped = 0
  const errors: string[] = []

  try {
    const _command = `npx playwright test "${testFile}" --project=chromium --workers=1 --reporter=json`
    const _output = execSync(command, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 300000, // 5 minute timeout per test file
    })

    // Parse Playwright JSON output
    try {
      const _jsonOutput = JSON.parse(output)
      if (jsonOutput.suites) {
        jsonOutput.suites.forEach((suite: Record<string, unknown>) => {
          suite.specs?.forEach((spec: Record<string, unknown>) => {
            spec.tests?.forEach((test: Record<string, unknown>) => {
              switch (test.outcome) {
                case 'expected':
                  passed++
                  break
                case 'unexpected':
                  failed++
                  if (test.errors?.length > 0) {
                    errors.push(...test.errors.map((e: Record<string, unknown>) => e.message || e.toString()))
                  }
                  break
                case 'skipped':
                  skipped++
                  break
              }
            })
          })
        })
      }
    } catch (parseError) {
      console.warn('Could not parse test output as JSON, using basic parsing')

      // Fallback parsing
      const _lines = output.split('\n')
      lines.forEach(line => {
        if (line.includes('✓') || line.includes('passed')) passed++
        if (line.includes('✗') || line.includes('failed')) failed++
        if (line.includes('⊝') || line.includes('skipped')) skipped++
        if (line.includes('Error:') || line.includes('AssertionError')) {
          errors.push(line.trim())
        }
      })
    }
  } catch (error) {
    console.error(`❌ Test execution failed for ${testFile}:`, error)
    failed = 1
    errors.push(`Test execution failed: ${error}`)
  }

  const _duration = Date.now() - startTime

  return {
    testFile,
    passed,
    failed,
    skipped,
    duration,
    errors,
  }
}

async function runAllClientComponentTests(): Promise<TestSummary> {
  console.log('🚀 Starting Client Component Error Regression Tests')
  console.log('='.repeat(60))

  const results: TestResult[] = []
  let totalPassed = 0
  let totalFailed = 0
  let totalSkipped = 0
  let totalDuration = 0

  // Run tests sequentially to avoid conflicts
  for (const testFile of CLIENT_COMPONENT_TESTS) {
    const _result = await runTest(testFile)
    results.push(result)

    totalPassed += result.passed
    totalFailed += result.failed
    totalSkipped += result.skipped
    totalDuration += result.duration

    // Print immediate results
    if (result.failed > 0) {
      console.log(
        `❌ ${testFile}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`
      )
      if (result.errors.length > 0) {
        console.log('   Errors:')
        result.errors.forEach(error => console.log(`   - ${error}`))
      }
    } else {
      console.log(`✅ ${testFile}: ${result.passed} passed, ${result.skipped} skipped`)
    }

    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`)
  }

  const _totalTests = totalPassed + totalFailed + totalSkipped
  const _success = totalFailed === 0

  return {
    totalTests,
    totalPassed,
    totalFailed,
    totalSkipped,
    totalDuration,
    results,
    success,
  }
}

function printDetailedReport(summary: TestSummary) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 CLIENT COMPONENT ERROR REGRESSION TEST SUMMARY')
  console.log('='.repeat(60))

  console.log(`\n📈 Overall Results:`)
  console.log(`   Total Tests: ${summary.totalTests}`)
  console.log(`   ✅ Passed: ${summary.totalPassed}`)
  console.log(`   ❌ Failed: ${summary.totalFailed}`)
  console.log(`   ⊝ Skipped: ${summary.totalSkipped}`)
  console.log(`   ⏱️ Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`)
  console.log(
    `   📊 Success Rate: ${((summary.totalPassed / (summary.totalPassed + summary.totalFailed)) * 100).toFixed(1)}%`
  )

  console.log(`\n📋 Test File Breakdown:`)
  summary.results.forEach(result => {
    const _status = result.failed > 0 ? '❌' : '✅'
    console.log(`   ${status} ${result.testFile}`)
    console.log(
      `      Passed: ${result.passed}, Failed: ${result.failed}, Skipped: ${result.skipped}`
    )
    console.log(`      Duration: ${(result.duration / 1000).toFixed(2)}s`)

    if (result.errors.length > 0) {
      console.log(`      Errors:`)
      result.errors.forEach(error => {
        console.log(`        - ${error}`)
      })
    }
  })

  console.log(`\n🎯 Client Component Fix Validation:`)
  if (summary.success) {
    console.log(`   ✅ All tests passed - Client Component error fix is working correctly`)
    console.log(
      `   ✅ No "Event handlers cannot be passed to Client Component props" errors detected`
    )
    console.log(`   ✅ Search page functionality is working without serialization issues`)
    console.log(`   ✅ Note selection and editing functionality is intact`)
  } else {
    console.log(`   ❌ Some tests failed - Client Component issues may still exist`)
    console.log(`   ⚠️ Check the error details above for specific Client Component problems`)
    console.log(`   ⚠️ Review the search page implementation for serialization issues`)
  }

  console.log(`\n📝 Test Coverage Areas:`)
  console.log(`   🔍 Search page rendering without Client Component errors`)
  console.log(`   🖱️ Note selection and editing event handlers`)
  console.log(`   🧭 Navigation between search and dashboard`)
  console.log(`   📊 Console error monitoring and categorization`)
  console.log(`   ⚡ Performance impact assessment`)
  console.log(`   🔄 Error recovery and resilience testing`)

  if (summary.success) {
    console.log(`\n🎉 CLIENT COMPONENT ERROR FIX VALIDATION: SUCCESS`)
    console.log(`   The search page Client Component error has been successfully fixed!`)
  } else {
    console.log(`\n⚠️ CLIENT COMPONENT ERROR FIX VALIDATION: NEEDS ATTENTION`)
    console.log(`   Some issues detected - please review the error details above.`)
  }

  console.log('\n' + '='.repeat(60))
}

function printQuickStart() {
  console.log('\n🚀 Client Component Error Tests Quick Start Guide:')
  console.log('='.repeat(50))
  console.log('\n📋 Prerequisites:')
  console.log('   1. Development server running on localhost:3002')
  console.log('   2. Supabase environment variables configured')
  console.log('   3. Playwright browsers installed (npx playwright install)')
  console.log('   4. Test data fixtures available')

  console.log('\n⚡ Run Commands:')
  console.log('   # Run all Client Component tests')
  console.log('   tsx tests/run-client-component-tests.ts')
  console.log('')
  console.log('   # Run individual test files')
  console.log('   npx playwright test tests/e2e/client-component-regression.test.ts')
  console.log('   npx playwright test tests/e2e/search-page-errors.test.ts')
  console.log('   npx playwright test tests/e2e/search-interaction.test.ts')
  console.log('')
  console.log('   # Run with UI for debugging')
  console.log('   npx playwright test tests/e2e/client-component-regression.test.ts --ui')

  console.log('\n🎯 What These Tests Validate:')
  console.log('   ✅ Search page loads without Client Component serialization errors')
  console.log('   ✅ Event handlers (onNoteSelect, onNoteEdit) work correctly')
  console.log('   ✅ No "Event handlers cannot be passed to Client Component props" errors')
  console.log('   ✅ Navigation flows function properly')
  console.log('   ✅ Console error monitoring detects Next.js App Router issues')
  console.log('   ✅ Performance is not degraded by error handling')

  console.log('\n🔍 Key Error Patterns Monitored:')
  console.log('   - "Event handlers cannot be passed to Client Component props"')
  console.log('   - "Functions cannot be passed directly to Client Components"')
  console.log('   - "Unsupported Server Component prop"')
  console.log('   - Hydration mismatches')
  console.log('   - Serialization errors')
  console.log('   - React rendering errors')
}

async function main() {
  // Check if help was requested
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printQuickStart()
    return
  }

  try {
    const _summary = await runAllClientComponentTests()
    printDetailedReport(summary)

    // Exit with appropriate code
    process.exit(summary.success ? 0 : 1)
  } catch (error) {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
  })
}

export { runAllClientComponentTests }
export type { TestSummary, TestResult }
