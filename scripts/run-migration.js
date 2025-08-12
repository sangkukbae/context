#!/usr/bin/env node

const { readFileSync } = require('fs')
const { join } = require('path')

// Simple script to run the auth migration
// This script connects directly to Supabase using pg client

async function runMigration() {
  const { Client } = require('pg')
  
  // Get database URL from environment
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required')
    process.exit(1)
  }
  
  console.log('🔄 Applying auth triggers migration...')
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to database')
    
    // Read the migration file
    const migrationPath = join(__dirname, '../database/migrations/002_auth_triggers.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📝 Executing migration...')
    
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
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Execute if run directly
runMigration().catch(console.error)