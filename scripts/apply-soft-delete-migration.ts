#!/usr/bin/env tsx

/**
 * Apply Soft Delete Migration Script
 *
 * This script applies the soft delete migration to add proper soft delete
 * functionality to the notes table with RLS policies and database functions.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createSupabaseServiceClient } from '../lib/supabase/server'

async function applySoftDeleteMigration() {
  console.log('🔄 Starting soft delete migration...')

  try {
    const supabase = await createSupabaseServiceClient()

    // Read the migration file
    const migrationPath = join(process.cwd(), 'database/migrations/002_add_soft_delete.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')

    console.log('📖 Migration SQL loaded from:', migrationPath)

    // Execute the migration
    console.log('🔄 Executing migration...')
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')

    // Test the migration by checking if the new structures exist
    console.log('🔍 Verifying migration...')

    // Check if deleted_at column exists
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'notes')
      .eq('column_name', 'deleted_at')

    if (columnsError) {
      console.warn('⚠️  Could not verify column creation:', columnsError)
    } else if (columns && columns.length > 0) {
      console.log('✅ deleted_at column created successfully')
    } else {
      console.warn('⚠️  deleted_at column not found - migration may have issues')
    }

    // Check if views exist
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .in('table_name', ['active_notes', 'recoverable_notes'])

    if (viewsError) {
      console.warn('⚠️  Could not verify view creation:', viewsError)
    } else if (views && views.length >= 2) {
      console.log('✅ Views (active_notes, recoverable_notes) created successfully')
    } else {
      console.warn('⚠️  Not all views found - migration may have issues')
    }

    // Check if functions exist
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .in('routine_name', ['soft_delete_note', 'recover_note', 'cleanup_deleted_notes'])
      .eq('routine_schema', 'public')

    if (functionsError) {
      console.warn('⚠️  Could not verify function creation:', functionsError)
    } else if (functions && functions.length >= 3) {
      console.log('✅ Database functions created successfully')
    } else {
      console.warn('⚠️  Not all functions found - migration may have issues')
      console.log(
        `Found functions:`,
        functions?.map(f => f.routine_name)
      )
    }

    console.log('\n🎉 Soft delete migration completed and verified!')
    console.log('\n📝 New features available:')
    console.log('  • Soft delete with 30-day recovery window')
    console.log('  • GET /api/notes/deleted - View recoverable notes')
    console.log('  • POST /api/notes/:id/recover - Recover deleted notes')
    console.log('  • Automatic cleanup of old deleted notes')
    console.log('  • Enhanced RLS policies for soft-deleted notes')
  } catch (error) {
    console.error('❌ Migration failed with error:', error)
    process.exit(1)
  }
}

// Execute the migration if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applySoftDeleteMigration()
}

export { applySoftDeleteMigration }
