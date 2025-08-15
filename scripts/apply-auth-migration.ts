#!/usr/bin/env tsx

import { readFileSync } from 'fs'
import { join } from 'path'

async function applyAuthMigration() {
  console.log('🔄 Applying auth triggers migration...')

  // Check if pg package is available for direct database connection
  let pg: unknown
  try {
    pg = await import('pg')
  } catch {
    console.log('⚠️  pg package not found. Please install it: npm install pg')
    console.log('🔄 Attempting to use Supabase SQL editor instructions instead...')

    const migrationPath = join(process.cwd(), 'database/migrations/002_auth_triggers.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')

    console.log('')
    console.log('📝 Please run the following SQL in your Supabase SQL Editor:')
    console.log('   https://app.supabase.com/project/[your-project]/sql')
    console.log('')
    console.log('='.repeat(80))
    console.log(migrationSQL)
    console.log('='.repeat(80))
    console.log('')
    console.log('After running the SQL, your Google OAuth should work properly!')
    return
  }

  // Use direct PostgreSQL connection
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required')
    console.error('   Make sure your .env file contains the database connection string')
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected to database')

    // Read the migration file
    const migrationPath = join(process.cwd(), 'database/migrations/002_auth_triggers.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')

    console.log('📝 Executing migration SQL...')

    // Execute the entire migration as one transaction
    await client.query('BEGIN')

    try {
      await client.query(migrationSQL)
      await client.query('COMMIT')

      console.log('✅ Auth triggers migration completed successfully!')
      console.log('')
      console.log('The following has been set up:')
      console.log('  ✓ handle_new_user() function')
      console.log('  ✓ Trigger on auth.users for new user creation')
      console.log('  ✓ Updated RLS policies for user profile creation')
      console.log('  ✓ sync_user_profile() helper function')
      console.log('')
      console.log('🎉 Google OAuth should now work properly!')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Migration failed:', errorMessage)

    // Provide helpful error context
    if (errorMessage.includes('permission denied')) {
      console.error('')
      console.error('💡 Permission error - this is likely because:')
      console.error('   1. The database user lacks required permissions')
      console.error('   2. RLS is preventing the operation')
      console.error('   3. You need to use the service role key')
      console.error('')
      console.error('💡 Alternative: Run this SQL manually in Supabase SQL Editor:')
      console.error('   https://app.supabase.com/project/[your-project]/sql')
    }

    if (error.message.includes('auth')) {
      console.error('')
      console.error('💡 This migration needs to create triggers on the auth.users table.')
      console.error('   Please ensure you have proper database permissions.')
    }

    process.exit(1)
  } finally {
    await client.end()
  }
}

// Execute if run directly
if (require.main === module) {
  applyAuthMigration().catch(console.error)
}

export { applyAuthMigration }
