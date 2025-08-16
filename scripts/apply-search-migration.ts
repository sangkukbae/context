#!/usr/bin/env tsx

/**
 * Apply Search Enhancement Migration
 *
 * This script provides instructions for applying the search enhancement database migration
 * including search_content TSVECTOR column, indexes, and search functions.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function logStep(message: string) {
  console.log(`${colors.blue}🔄 ${message}${colors.reset}`)
}

function logSuccess(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`)
}

function logError(message: string) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`)
}

function logWarning(message: string) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`)
}

// function logInfo(message: string) {
//   console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`)
// }

async function applySearchMigration() {
  console.log(`${colors.bright}Search Enhancement Migration Setup${colors.reset}`)
  console.log('='.repeat(50))
  console.log('')

  // Get Supabase credentials from environment
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    logError('Required environment variables not found')
    console.log('')
    console.log('Please ensure these are set in your .env.local file:')
    console.log('  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
    console.log('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
    console.log('')
    console.log('You can find these values in your Supabase dashboard:')
    console.log('  Project Settings > API > Project URL & service_role key')
    process.exit(1)
  }

  try {
    logStep('Connecting to Supabase...')

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Test connection
    const { data, error } = await supabase.from('users').select('id').limit(1)
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      throw new Error(`Connection test failed: ${error.message}`)
    }
    console.log(`Connection test returned ${data?.length || 0} user records`)
    logSuccess('Connected to Supabase successfully')

    // Read migration file
    logStep('Reading migration file...')
    const migrationPath = join(process.cwd(), 'database/migrations/003_search_enhancement.sql')

    try {
      const migrationSQL = readFileSync(migrationPath, 'utf8')
      logSuccess(`Loaded migration file (${migrationSQL.length} characters)`)
    } catch (error) {
      throw new Error(
        `Failed to read migration file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // Provide manual migration instructions
    console.log('')
    console.log(`${colors.yellow}${colors.bright}MANUAL MIGRATION REQUIRED${colors.reset}`)
    console.log('')
    console.log('Due to the complexity of this migration, please run it manually in Supabase:')
    console.log('')
    console.log('📋 Step-by-step instructions:')
    console.log('')
    console.log('1. Open your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy the entire contents of this file:')
    console.log(`   ${colors.cyan}database/migrations/003_search_enhancement.sql${colors.reset}`)
    console.log('4. Paste it into the SQL Editor')
    console.log('5. Click "Run" to execute the migration')
    console.log('')
    console.log(`${colors.bright}What this migration creates:${colors.reset}`)
    console.log('  • search_content TSVECTOR column on notes table')
    console.log('  • Optimized GIN indexes for fast full-text search')
    console.log('  • search_analytics table for query performance tracking')
    console.log('  • search_history table for user search suggestions')
    console.log('  • search_cache table for query result caching')
    console.log('  • PostgreSQL search functions with ranking and highlighting')
    console.log('  • Row Level Security policies for search data')
    console.log('')

    // Test current database state
    logStep('Testing current database state...')

    try {
      // Check if notes table exists and has the required structure
      const { data: tableExists, error: tableError } = await supabase
        .from('notes')
        .select('id, content, metadata')
        .limit(1)

      if (tableError) {
        logWarning('Notes table access test failed - please check your database setup')
      } else {
        logSuccess(`Notes table is accessible with ${tableExists?.length || 0} test records`)
      }
    } catch (testError) {
      logWarning(
        `Database test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`
      )
    }

    // Success summary
    console.log('')
    console.log(
      `${colors.green}${colors.bright}🎉 Search Enhancement Setup Complete!${colors.reset}`
    )
    console.log('')
    console.log('After running the manual migration, these features will be available:')
    console.log(`${colors.cyan}  ✓ Full-text search with PostgreSQL TSVECTOR${colors.reset}`)
    console.log(`${colors.cyan}  ✓ Search content highlighting and snippets${colors.reset}`)
    console.log(`${colors.cyan}  ✓ Search analytics and performance tracking${colors.reset}`)
    console.log(`${colors.cyan}  ✓ Search history and suggestions${colors.reset}`)
    console.log(`${colors.cyan}  ✓ Search result caching for performance${colors.reset}`)
    console.log(`${colors.cyan}  ✓ Optimized GIN indexes for fast queries${colors.reset}`)
    console.log('')
    console.log('Next steps:')
    console.log('  1. Run the manual migration in Supabase SQL Editor')
    console.log('  2. Test the search API at /api/search')
    console.log('  3. Integrate search components into your app')
    console.log('  4. Monitor search performance in Supabase dashboard')
    console.log('')
    console.log('Search API endpoints that will be available:')
    console.log('  POST /api/search - Main search endpoint')
    console.log('  GET  /api/search/suggestions - Search suggestions')
    console.log('  GET  /api/search/history - Search history')
    console.log('  GET  /api/search/analytics - Search analytics')
    console.log('')
  } catch (error) {
    logError(`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.log('')
    console.log('Common issues and solutions:')
    console.log('  • Invalid credentials: Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    console.log("  • Permission denied: Ensure you're using the service_role key (not anon key)")
    console.log('  • Network issues: Check your internet connection and Supabase status')
    console.log('')
    console.log('If issues persist:')
    console.log('  1. Check Supabase logs in your dashboard')
    console.log('  2. Verify your project is not paused')
    console.log('  3. Ensure you have the correct environment variables')
    console.log('')
    process.exit(1)
  }
}

// Execute the setup
applySearchMigration().catch(error => {
  console.log(
    `${colors.red}❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}${colors.reset}`
  )
  process.exit(1)
})
