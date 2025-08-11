#!/usr/bin/env tsx

/**
 * Database Health Check Script
 * Verifies database connection, extensions, and schema setup
 */

import { createSupabaseServiceClient } from '../lib/supabase/server'
import { checkDatabaseConnection, prisma } from '../lib/prisma'
import { validateRequiredServices } from '../lib/env'

async function checkSupabaseConnection() {
  console.log('🔍 Checking Supabase connection...')

  try {
    const supabase = await createSupabaseServiceClient()

    // Test basic connectivity
    const { error } = await supabase.from('information_schema.tables').select('table_name').limit(1)

    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return false
    }

    console.log('✅ Supabase connection successful')
    return true
  } catch (error) {
    console.error('❌ Supabase connection error:', error)
    return false
  }
}

async function checkPrismaConnection() {
  console.log('🔍 Checking Prisma connection...')

  try {
    const isConnected = await checkDatabaseConnection()

    if (isConnected) {
      console.log('✅ Prisma connection successful')
      return true
    } else {
      console.error('❌ Prisma connection failed')
      return false
    }
  } catch (error) {
    console.error('❌ Prisma connection error:', error)
    return false
  }
}

async function checkDatabaseExtensions() {
  console.log('🔍 Checking required database extensions...')

  try {
    const extensions = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension
      WHERE extname IN ('vector', 'uuid-ossp', 'pgcrypto')
      ORDER BY extname;
    `

    const requiredExtensions = ['pgcrypto', 'uuid-ossp', 'vector']
    const installedExtensions = extensions.map((ext: { extname: string }) => ext.extname)

    console.log(`📦 Installed extensions: ${installedExtensions.join(', ')}`)

    const missingExtensions = requiredExtensions.filter(ext => !installedExtensions.includes(ext))

    if (missingExtensions.length > 0) {
      console.error(`❌ Missing extensions: ${missingExtensions.join(', ')}`)
      console.log('💡 Run the database migration to install missing extensions')
      return false
    }

    console.log('✅ All required extensions are installed')
    return true
  } catch (error) {
    console.error('❌ Error checking extensions:', error)
    return false
  }
}

async function checkDatabaseTables() {
  console.log('🔍 Checking database tables...')

  try {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `

    const requiredTables = [
      'users',
      'notes',
      'clusters',
      'documents',
      'search_index',
      'activity_logs',
      'job_queue',
      'accounts',
      'sessions',
      'verification_tokens',
      'rate_limits',
      'embedding_cache',
    ]

    const existingTables = tables.map((t: { table_name: string }) => t.table_name)
    console.log(`📊 Found ${existingTables.length} tables`)

    const missingTables = requiredTables.filter(table => !existingTables.includes(table))

    if (missingTables.length > 0) {
      console.error(`❌ Missing tables: ${missingTables.join(', ')}`)
      console.log('💡 Run the database migration to create missing tables')
      return false
    }

    console.log('✅ All required tables exist')
    return true
  } catch (error) {
    console.error('❌ Error checking tables:', error)
    return false
  }
}

async function checkRLSPolicies() {
  console.log('🔍 Checking Row Level Security policies...')

  try {
    const policies = await prisma.$queryRaw<
      Array<{
        tablename: string
        policyname: string
        permissive: string
        cmd: string
      }>
    >`
      SELECT tablename, policyname, permissive, cmd
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `

    const tablesWithRLS = [
      'users',
      'notes',
      'clusters',
      'documents',
      'search_index',
      'activity_logs',
    ]
    const policyTables = [...new Set(policies.map((p: { tablename: string }) => p.tablename))]

    console.log(`🔒 Found ${policies.length} RLS policies across ${policyTables.length} tables`)

    const missingRLS = tablesWithRLS.filter(table => !policyTables.includes(table))

    if (missingRLS.length > 0) {
      console.warn(`⚠️  Tables missing RLS policies: ${missingRLS.join(', ')}`)
      console.log('💡 Run the database migration to enable RLS policies')
      return false
    }

    console.log('✅ All required RLS policies are in place')
    return true
  } catch (error) {
    console.error('❌ Error checking RLS policies:', error)
    return false
  }
}

async function checkDatabaseIndexes() {
  console.log('🔍 Checking database indexes...')

  try {
    const indexes = await prisma.$queryRaw<
      Array<{
        indexname: string
        tablename: string
        indexdef: string
      }>
    >`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname;
    `

    console.log(`📈 Found ${indexes.length} performance indexes`)

    // Check for vector indexes specifically
    const vectorIndexes = indexes.filter(
      (idx: { indexdef: string }) =>
        idx.indexdef.includes('hnsw') || idx.indexdef.includes('vector')
    )

    if (vectorIndexes.length > 0) {
      console.log(`🔍 Vector indexes found: ${vectorIndexes.length}`)
    } else {
      console.warn('⚠️  No vector indexes found - similarity search may be slow')
    }

    console.log('✅ Database indexes are configured')
    return true
  } catch (error) {
    console.error('❌ Error checking indexes:', error)
    return false
  }
}

async function testVectorOperations() {
  console.log('🔍 Testing vector operations...')

  try {
    // Test that vector operations work
    await prisma.$queryRaw`
      SELECT '[0.1,0.2,0.3]'::vector <-> '[0.2,0.1,0.4]'::vector as distance;
    `

    console.log('✅ Vector operations working correctly')
    return true
  } catch (error) {
    console.error('❌ Vector operations failed:', error)
    console.log('💡 Ensure pgvector extension is properly installed')
    return false
  }
}

async function checkEnvironmentConfig() {
  console.log('🔍 Checking environment configuration...')

  try {
    validateRequiredServices()
    console.log('✅ Environment configuration is valid')
    return true
  } catch (error) {
    console.error('❌ Environment configuration errors:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Context AI Database Health Check\n')

  const checks = [
    { name: 'Environment Config', fn: checkEnvironmentConfig },
    { name: 'Supabase Connection', fn: checkSupabaseConnection },
    { name: 'Prisma Connection', fn: checkPrismaConnection },
    { name: 'Database Extensions', fn: checkDatabaseExtensions },
    { name: 'Database Tables', fn: checkDatabaseTables },
    { name: 'RLS Policies', fn: checkRLSPolicies },
    { name: 'Database Indexes', fn: checkDatabaseIndexes },
    { name: 'Vector Operations', fn: testVectorOperations },
  ]

  const results = []

  for (const check of checks) {
    try {
      const passed = await check.fn()
      results.push({ name: check.name, passed })
      console.log() // Empty line between checks
    } catch (error) {
      console.error(`❌ ${check.name} check failed:`, error)
      results.push({ name: check.name, passed: false })
      console.log()
    }
  }

  // Summary
  console.log('📊 Health Check Summary:')
  console.log('='.repeat(40))

  const passed = results.filter(r => r.passed).length
  const total = results.length

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`${status} ${result.name}`)
  })

  console.log('='.repeat(40))
  console.log(`${passed}/${total} checks passed`)

  if (passed === total) {
    console.log('\n🎉 All database health checks passed!')
    console.log('Your database is ready for development.')
  } else {
    console.log(`\n⚠️  ${total - passed} checks failed.`)
    console.log('Please review the errors above and run the database migration.')
    console.log('\nTo fix issues:')
    console.log('1. Copy database/migrations/001_initial_schema.sql')
    console.log('2. Run it in Supabase Dashboard > SQL Editor')
    console.log('3. Re-run this health check')
    process.exit(1)
  }

  await prisma.$disconnect()
}

// Handle errors gracefully
main().catch(error => {
  console.error('🚨 Health check failed:', error)
  process.exit(1)
})
