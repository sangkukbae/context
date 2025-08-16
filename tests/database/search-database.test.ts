/**
 * Database Integration Tests for Search Functionality
 *
 * Tests the database layer including:
 * - Search tables structure and constraints
 * - Search functions and triggers
 * - RLS policies
 * - Full-text search functionality
 */
import { test, expect } from '../fixtures/auth'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'
import { setupTestData, cleanupTestData } from '../fixtures/search-data'

const _supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jaklhhckzosiodpsicrd.supabase.co'
const _supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

test.describe('Search Database Integration', () => {
  test.beforeEach(async ({ authenticatedUser }) => {
    await setupTestData(authenticatedUser.id, authenticatedUser.accessToken)
  })

  test.afterEach(async ({ authenticatedUser }) => {
    await cleanupTestData(authenticatedUser.id, authenticatedUser.accessToken)
  })

  test('should have search tables with correct structure', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    // Test search_history table structure
    const { data: historyData, error: historyError } = await supabase
      .from('search_history')
      .select('*')
      .limit(1)

    expect(historyError).toBeNull()
    expect(Array.isArray(historyData)).toBe(true)

    // Test search_analytics table structure
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('search_analytics')
      .select('*')
      .limit(1)

    expect(analyticsError).toBeNull()
    expect(Array.isArray(analyticsData)).toBe(true)

    // Test search_cache table structure
    const { data: cacheData, error: cacheError } = await supabase
      .from('search_cache')
      .select('*')
      .limit(1)

    expect(cacheError).toBeNull()
    expect(Array.isArray(cacheData)).toBe(true)
  })

  test('should have search_content column on notes table', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    const { data, error } = await supabase
      .from('notes')
      .select('id, content, search_content')
      .eq('user_id', authenticatedUser.id)
      .limit(1)

    expect(error).toBeNull()
    expect(data).toBeDefined()
    if (data && data.length > 0) {
      expect(data[0]).toHaveProperty('search_content')
    }
  })

  test('should enforce RLS policies on search tables', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    // Try to access search_history - should only see own records
    const { data: historyData, error: historyError } = await supabase
      .from('search_history')
      .select('*')

    expect(historyError).toBeNull()
    if (historyData && historyData.length > 0) {
      historyData.forEach(record => {
        expect(record.user_id).toBe(authenticatedUser.id)
      })
    }

    // Try to access search_analytics - should only see own records
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('search_analytics')
      .select('*')

    expect(analyticsError).toBeNull()
    if (analyticsData && analyticsData.length > 0) {
      analyticsData.forEach(record => {
        expect(record.user_id).toBe(authenticatedUser.id)
      })
    }
  })

  test('should have working search_notes_keyword function', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    const { data, error } = await supabase.rpc('search_notes_keyword', {
      p_user_id: authenticatedUser.id,
      p_query: 'machine learning',
      p_limit: 10,
      p_offset: 0,
      p_filters: {},
    })

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    expect(data?.length).toBeGreaterThan(0)

    if (data && data.length > 0) {
      const _result = data[0]
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('rank')
      expect(result).toHaveProperty('snippet')
      expect(result).toHaveProperty('highlighted_content')
    }
  })

  test('should handle Korean text search correctly', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    const { data, error } = await supabase.rpc('search_notes_keyword', {
      p_user_id: authenticatedUser.id,
      p_query: '한국어',
      p_limit: 10,
      p_offset: 0,
      p_filters: {},
    })

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    expect(data?.length).toBeGreaterThan(0)

    if (data && data.length > 0) {
      const _koreanNote = data.find((note: { content: string }) => note.content.includes('한국어'))
      expect(koreanNote).toBeDefined()
    }
  })

  test('should have working track_search_query function', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    const { error } = await supabase.rpc('track_search_query', {
      p_user_id: authenticatedUser.id,
      p_query: 'test query',
      p_query_type: 'keyword',
      p_results_count: 5,
      p_execution_time_ms: 150,
      p_filters: { tags: ['test'] },
    })

    expect(error).toBeNull()

    // Verify the search was tracked
    const { data: historyData } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', authenticatedUser.id)
      .eq('query', 'test query')

    expect(historyData?.length).toBeGreaterThan(0)

    const { data: analyticsData } = await supabase
      .from('search_analytics')
      .select('*')
      .eq('user_id', authenticatedUser.id)
      .eq('query', 'test query')

    expect(analyticsData?.length).toBeGreaterThan(0)
  })

  test('should have working get_search_suggestions function', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    // First, create some search history
    await supabase.rpc('track_search_query', {
      p_user_id: authenticatedUser.id,
      p_query: 'machine learning algorithms',
      p_query_type: 'keyword',
      p_results_count: 3,
      p_execution_time_ms: 200,
      p_filters: {},
    })

    // Test suggestions
    const { data, error } = await supabase.rpc('get_search_suggestions', {
      p_user_id: authenticatedUser.id,
      p_query_prefix: 'machine',
      p_limit: 5,
    })

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)

    if (data && data.length > 0) {
      const _suggestion = data[0]
      expect(suggestion).toHaveProperty('query')
      expect(suggestion).toHaveProperty('use_count')
      expect(suggestion).toHaveProperty('last_used_at')
    }
  })

  test('should handle search filters correctly', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    // Search with tag filter
    const { data, error } = await supabase.rpc('search_notes_keyword', {
      p_user_id: authenticatedUser.id,
      p_query: 'technology',
      p_limit: 10,
      p_offset: 0,
      p_filters: { tags: ['machine-learning'] },
    })

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)

    // Should only return notes with machine-learning tag
    if (data && data.length > 0) {
      data.forEach((note: { metadata: unknown }) => {
        const _metadata = note.metadata as Record<string, unknown>
        if (metadata?.tags) {
          expect(metadata.tags).toContain('machine-learning')
        }
      })
    }
  })

  test('should maintain search performance under 500ms', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    const _startTime = Date.now()

    const { data, error } = await supabase.rpc('search_notes_keyword', {
      p_user_id: authenticatedUser.id,
      p_query: 'machine learning algorithms sophisticated natural language processing',
      p_limit: 20,
      p_offset: 0,
      p_filters: {},
    })

    const _executionTime = Date.now() - startTime

    expect(error).toBeNull()
    expect(executionTime).toBeLessThan(500)
    expect(Array.isArray(data)).toBe(true)
  })

  test('should handle search cache operations', async ({ authenticatedUser }) => {
    const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authenticatedUser.accessToken}`,
        },
      },
    })

    // Insert cache entry
    const _cacheKey = `test-cache-${Date.now()}`
    const _testResults = [{ id: '123', content: 'test content', score: 0.8 }]

    const { error: insertError } = await supabase.from('search_cache').insert({
      cache_key: cacheKey,
      user_id: authenticatedUser.id,
      query: 'test query',
      filters: {},
      results: testResults as any,
      results_count: 1,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })

    expect(insertError).toBeNull()

    // Retrieve cache entry
    const { data: cacheData, error: selectError } = await supabase
      .from('search_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('user_id', authenticatedUser.id)
      .single()

    expect(selectError).toBeNull()
    expect(cacheData).toBeDefined()
    expect(cacheData?.results).toEqual(testResults)
  })
})
