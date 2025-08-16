/**
 * Search Test Suite Execution Script
 *
 * Executes comprehensive search functionality tests and generates detailed reports
 */
import { execSync } from 'child_process'
import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'

interface TestResult {
  suite: string
  passed: number
  failed: number
  skipped: number
  duration: number
  errors: string[]
}

interface TestReport {
  timestamp: string
  environment: {
    baseUrl: string
    supabaseUrl: string
    nodeVersion: string
  }
  summary: {
    totalTests: number
    totalPassed: number
    totalFailed: number
    totalSkipped: number
    totalDuration: number
  }
  suites: TestResult[]
  coverage?: Record<string, unknown>
}

const _TEST_SUITES = [
  {
    name: 'Database Integration',
    path: 'tests/database/search-database.test.ts',
    description: 'Tests search tables, functions, and RLS policies',
  },
  {
    name: 'API Routes',
    path: 'tests/api/search-api.test.ts',
    description: 'Tests search API endpoints with authentication',
  },
  {
    name: 'Component Integration',
    path: 'tests/components/search-components.test.ts',
    description: 'Tests search UI components and interactions',
  },
  {
    name: 'End-to-End Workflow',
    path: 'tests/e2e/search-workflow.test.ts',
    description: 'Tests complete search user journeys',
  },
  {
    name: 'Data Validation',
    path: 'tests/validation/search-validation.test.ts',
    description: 'Tests data integrity and validation',
  },
]

function runCommand(command: string): { stdout: string; stderr: string; success: boolean } {
  try {
    const _stdout = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { stdout, stderr: '', success: true }
  } catch (error: Record<string, unknown>) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      success: false,
    }
  }
}

function parseTestResults(output: string): Partial<TestResult> {
  // Parse Playwright test output
  const _lines = output.split('\n')
  let passed = 0
  let failed = 0
  let skipped = 0
  const errors: string[] = []

  for (const line of lines) {
    if (line.includes('✓') || line.includes('PASS')) {
      passed++
    } else if (line.includes('✗') || line.includes('FAIL')) {
      failed++
      errors.push(line.trim())
    } else if (line.includes('SKIP')) {
      skipped++
    }
  }

  // Extract duration if available
  const _durationMatch = output.match(/(\d+(?:\.\d+)?)\s*(?:ms|s)/i)
  const _duration = durationMatch ? parseFloat(durationMatch[1]) : 0

  return { passed, failed, skipped, duration, errors }
}

function generateTestReport(results: TestResult[]): TestReport {
  const _summary = results.reduce(
    (acc, result) => ({
      totalTests: acc.totalTests + result.passed + result.failed + result.skipped,
      totalPassed: acc.totalPassed + result.passed,
      totalFailed: acc.totalFailed + result.failed,
      totalSkipped: acc.totalSkipped + result.skipped,
      totalDuration: acc.totalDuration + result.duration,
    }),
    { totalTests: 0, totalPassed: 0, totalFailed: 0, totalSkipped: 0, totalDuration: 0 }
  )

  return {
    timestamp: new Date().toISOString(),
    environment: {
      baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3002',
      supabaseUrl:
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jaklhhckzosiodpsicrd.supabase.co',
      nodeVersion: process.version,
    },
    summary,
    suites: results,
  }
}

function printReport(report: TestReport) {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 SEARCH FUNCTIONALITY TEST REPORT')
  console.log('='.repeat(80))

  console.log(`\n📊 Test Summary:`)
  console.log(`   Total Tests: ${report.summary.totalTests}`)
  console.log(`   ✅ Passed: ${report.summary.totalPassed}`)
  console.log(`   ❌ Failed: ${report.summary.totalFailed}`)
  console.log(`   ⏭️  Skipped: ${report.summary.totalSkipped}`)
  console.log(`   ⏱️  Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`)

  console.log(`\n🌐 Environment:`)
  console.log(`   Base URL: ${report.environment.baseUrl}`)
  console.log(`   Supabase: ${report.environment.supabaseUrl}`)
  console.log(`   Node: ${report.environment.nodeVersion}`)

  console.log(`\n📋 Test Suite Results:`)

  report.suites.forEach(suite => {
    const _status = suite.failed > 0 ? '❌' : '✅'
    const _total = suite.passed + suite.failed + suite.skipped
    console.log(
      `   ${status} ${suite.suite}: ${suite.passed}/${total} passed (${(suite.duration / 1000).toFixed(2)}s)`
    )

    if (suite.errors.length > 0) {
      console.log(`      Errors:`)
      suite.errors.forEach(error => {
        console.log(`        - ${error}`)
      })
    }
  })

  const _overallStatus = report.summary.totalFailed === 0 ? 'PASSED' : 'FAILED'
  const _statusIcon = overallStatus === 'PASSED' ? '✅' : '❌'

  console.log(`\n${statusIcon} Overall Status: ${overallStatus}`)
  console.log('='.repeat(80))
}

async function main() {
  console.log('🚀 Starting Search Functionality Test Suite...\n')

  // Check if environment is ready
  const _envChecks = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  ]

  for (const check of envChecks) {
    if (!check.value) {
      console.error(`❌ Missing environment variable: ${check.name}`)
      process.exit(1)
    }
  }

  console.log('✅ Environment variables configured')

  // Check if server is running
  try {
    const _baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3002'
    const _healthCheck = runCommand(`curl -s ${baseUrl}/api/health || true`)
    if (!healthCheck.success || !healthCheck.stdout.includes('success')) {
      console.warn(`⚠️  Warning: Server may not be running at ${baseUrl}`)
      console.log('Please ensure the development server is running with: pnpm dev')
    } else {
      console.log('✅ Development server is running')
    }
  } catch (error) {
    console.warn('⚠️  Could not verify server status')
  }

  const results: TestResult[] = []

  // Run each test suite
  for (const suite of TEST_SUITES) {
    console.log(`\n🧪 Running ${suite.name} tests...`)
    console.log(`   Description: ${suite.description}`)

    const _startTime = Date.now()

    // Run Playwright tests for this suite
    const _command = `npx playwright test ${suite.path} --reporter=line`
    const _result = runCommand(command)

    const _duration = Date.now() - startTime
    const _parsedResults = parseTestResults(result.stdout + result.stderr)

    const suiteResult: TestResult = {
      suite: suite.name,
      passed: parsedResults.passed || 0,
      failed: parsedResults.failed || 0,
      skipped: parsedResults.skipped || 0,
      duration: parsedResults.duration || duration,
      errors: parsedResults.errors || [],
    }

    if (!result.success) {
      suiteResult.failed = Math.max(suiteResult.failed, 1)
      suiteResult.errors.push(`Test execution failed: ${result.stderr}`)
    }

    results.push(suiteResult)

    const _status = suiteResult.failed > 0 ? '❌' : '✅'
    const _total = suiteResult.passed + suiteResult.failed + suiteResult.skipped
    console.log(`   ${status} ${suiteResult.passed}/${total} tests passed`)
  }

  // Generate and save report
  const _report = generateTestReport(results)

  const _reportPath = join(process.cwd(), 'test-results', 'search-test-report.json')
  const _reportDir = join(process.cwd(), 'test-results')

  try {
    if (!existsSync(reportDir)) {
      runCommand(`mkdir -p ${reportDir}`)
    }
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Test report saved to: ${reportPath}`)
  } catch (error) {
    console.warn(`⚠️  Could not save test report: ${error}`)
  }

  // Print report
  printReport(report)

  // Exit with appropriate code
  const _exitCode = report.summary.totalFailed > 0 ? 1 : 0
  process.exit(exitCode)
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  })
}

export { main, generateTestReport, TEST_SUITES }
