// Database utility functions for Supabase
// These functions provide type-safe database operations

import { createSupabaseServerClient, createSupabaseServiceClient } from './server'
import { supabase } from './client'
import type {
  Database,
  TablesInsert,
  TablesUpdate,
  VectorSearchResult,
  Json,
} from '../types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Type alias for convenience
type SupabaseDatabase = SupabaseClient<Database>

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function createUser(client: SupabaseDatabase, userData: TablesInsert<'users'>) {
  const { data, error } = await client.from('users').insert(userData).select().single()

  if (error) throw error
  return data
}

export async function getUserById(client: SupabaseDatabase, userId: string) {
  const { data, error } = await client.from('users').select('*').eq('id', userId).single()

  if (error) throw error
  return data
}

export async function updateUser(
  client: SupabaseDatabase,
  userId: string,
  updates: TablesUpdate<'users'>
) {
  const { data, error } = await client
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================================
// NOTE OPERATIONS
// ============================================================================

export async function createNote(client: SupabaseDatabase, noteData: TablesInsert<'notes'>) {
  const { data, error } = await client.from('notes').insert(noteData).select().single()

  if (error) throw error
  return data
}

export async function getNotesByUserId(
  client: SupabaseDatabase,
  userId: string,
  options?: {
    limit?: number
    offset?: number
    orderBy?: 'created_at' | 'updated_at'
    order?: 'asc' | 'desc'
  }
) {
  const { limit = 50, offset = 0, orderBy = 'created_at', order = 'desc' } = options || {}

  const { data, error } = await client
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order(orderBy, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data
}

export async function updateNote(
  client: SupabaseDatabase,
  noteId: string,
  updates: TablesUpdate<'notes'>
) {
  const { data, error } = await client
    .from('notes')
    .update(updates)
    .eq('id', noteId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteNote(client: SupabaseDatabase, noteId: string) {
  const { data, error } = await client.from('notes').delete().eq('id', noteId).select().single()

  if (error) throw error
  return data
}

// ============================================================================
// CLUSTER OPERATIONS
// ============================================================================

export async function createCluster(
  client: SupabaseDatabase,
  clusterData: TablesInsert<'clusters'>
) {
  const { data, error } = await client.from('clusters').insert(clusterData).select().single()

  if (error) throw error
  return data
}

export async function getClustersByUserId(
  client: SupabaseDatabase,
  userId: string,
  status?: 'suggested' | 'accepted' | 'dismissed'
) {
  let query = client
    .from('clusters')
    .select(
      `
      *,
      notes (
        id,
        content,
        created_at,
        updated_at,
        metadata
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function updateCluster(
  client: SupabaseDatabase,
  clusterId: string,
  updates: TablesUpdate<'clusters'>
) {
  const { data, error } = await client
    .from('clusters')
    .update(updates)
    .eq('id', clusterId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function acceptCluster(client: SupabaseDatabase, clusterId: string) {
  return updateCluster(client, clusterId, {
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  })
}

export async function dismissCluster(client: SupabaseDatabase, clusterId: string) {
  return updateCluster(client, clusterId, {
    status: 'dismissed',
    dismissed_at: new Date().toISOString(),
  })
}

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

export async function createDocument(
  client: SupabaseDatabase,
  documentData: TablesInsert<'documents'>
) {
  const { data, error } = await client.from('documents').insert(documentData).select().single()

  if (error) throw error
  return data
}

export async function getDocumentsByUserId(
  client: SupabaseDatabase,
  userId: string,
  status?: 'draft' | 'published' | 'archived'
) {
  let query = client
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getPublicDocument(client: SupabaseDatabase, shareId: string) {
  const { data, error } = await client
    .from('documents')
    .select(
      `
      *,
      users!inner (
        name,
        avatar
      )
    `
    )
    .eq('share_id', shareId)
    .eq('is_public', true)
    .or(`share_expires_at.is.null,share_expires_at.gt.${new Date().toISOString()}`)
    .single()

  if (error) throw error
  return data
}

export async function updateDocument(
  client: SupabaseDatabase,
  documentId: string,
  updates: TablesUpdate<'documents'>
) {
  const { data, error } = await client
    .from('documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export async function searchContent(
  client: SupabaseDatabase,
  userId: string,
  query: string,
  entityType?: 'note' | 'document'
) {
  let supabaseQuery = client
    .from('search_index')
    .select('*')
    .eq('user_id', userId)
    .textSearch('content', query, {
      config: 'english',
      type: 'websearch',
    })
    .order('created_at', { ascending: false })
    .limit(50)

  if (entityType) {
    supabaseQuery = supabaseQuery.eq('entity_type', entityType)
  }

  const { data, error } = await supabaseQuery

  if (error) throw error
  return data
}

// ============================================================================
// VECTOR SEARCH OPERATIONS
// ============================================================================

export async function vectorSearch(
  client: SupabaseDatabase,
  userId: string,
  embedding: number[],
  threshold: number = 0.5,
  limit: number = 10
): Promise<VectorSearchResult[]> {
  // Use the database function for vector similarity search
  const { data, error } = await client.rpc('similarity_search', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    user_id: userId,
  })

  if (error) throw error
  return data || []
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

export function subscribeToUserNotes(
  client: SupabaseDatabase,
  userId: string,
  callback: (payload: Record<string, unknown>) => void
) {
  return client
    .channel('user-notes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}

export function subscribeToUserClusters(
  client: SupabaseDatabase,
  userId: string,
  callback: (payload: Record<string, unknown>) => void
) {
  return client
    .channel('user-clusters')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'clusters',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}

export function subscribeToUserDocuments(
  client: SupabaseDatabase,
  userId: string,
  callback: (payload: Record<string, unknown>) => void
) {
  return client
    .channel('user-documents')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}

// ============================================================================
// ANALYTICS AND STATS
// ============================================================================

export async function getUserStats(client: SupabaseDatabase, userId: string) {
  // Get user statistics
  const [notesCount, documentsCount, clustersCount] = await Promise.all([
    client.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('clusters').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  return {
    notes: notesCount.count || 0,
    documents: documentsCount.count || 0,
    clusters: clustersCount.count || 0,
  }
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

export async function logActivity(
  client: SupabaseDatabase,
  activityData: TablesInsert<'activity_logs'>
) {
  const { data, error } = await client.from('activity_logs').insert(activityData).select().single()

  if (error) throw error
  return data
}

// ============================================================================
// BACKGROUND JOBS
// ============================================================================

export async function createJob(client: SupabaseDatabase, jobData: TablesInsert<'job_queue'>) {
  const { data, error } = await client.from('job_queue').insert(jobData).select().single()

  if (error) throw error
  return data
}

export async function getNextPendingJob(
  client: SupabaseDatabase,
  jobType?: 'embedding' | 'clustering' | 'document_generation'
) {
  let query = client
    .from('job_queue')
    .select('*')
    .eq('status', 'pending')
    .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
    .order('created_at', { ascending: true })
    .limit(1)

  if (jobType) {
    query = query.eq('type', jobType)
  }

  const { data, error } = await query

  if (error) throw error
  return data?.[0] || null
}

export async function updateJobStatus(
  client: SupabaseDatabase,
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  result?: Record<string, unknown>,
  error?: string
) {
  const updates: TablesUpdate<'job_queue'> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (result) updates.result = result as Json
  if (error) updates.error = error
  if (status === 'processing') updates.attempts = 1

  const { data, error: updateError } = await client
    .from('job_queue')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single()

  if (updateError) throw updateError
  return data
}

// ============================================================================
// CLIENT FACTORIES
// ============================================================================

// Factory functions to get the right client for different contexts
export async function getServerClient() {
  return await createSupabaseServerClient()
}

export async function getServiceClient() {
  return await createSupabaseServiceClient()
}

export function getBrowserClient() {
  return supabase
}

// Helper to determine which client to use
export async function getSupabaseClient(context: 'server' | 'service' | 'browser' = 'browser') {
  switch (context) {
    case 'server':
      return await getServerClient()
    case 'service':
      return await getServiceClient()
    case 'browser':
    default:
      return getBrowserClient()
  }
}
