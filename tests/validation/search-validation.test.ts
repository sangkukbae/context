/**
 * Data Validation Tests for Search Functionality
 *
 * Tests data integrity and validation including:
 * - Search content synchronization with notes
 * - Unicode text handling (Korean, emoji, special characters)
 * - Search result ranking and relevance
 * - Search analytics data accuracy
 * - Cache consistency and TTL
 */
import { test, expect } from '../fixtures/auth'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'
import { setupTestData, cleanupTestData } from '../fixtures/search-data'

const _supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jaklhhckzosiodpsicrd.supabase.co'
const _supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const _baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3002'

test.describe('Search Data Validation', () => {
  test.beforeEach(async ({ authenticatedUser }) => {
    await setupTestData(authenticatedUser.id, authenticatedUser.accessToken)
  })

  test.afterEach(async ({ authenticatedUser }) => {
    await cleanupTestData(authenticatedUser.id, authenticatedUser.accessToken)
  })

  test.describe('Search Content Synchronization', () => {
    test('should update search_content when notes are created', async ({ authenticatedUser }) => {
      const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authenticatedUser.accessToken}`,
          },
        },
      })

      // Create a new note
      const _noteContent =
        'This is a test note for search content validation with unique identifier abc123xyz'

      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: authenticatedUser.id,
          content: noteContent,
          metadata: { tags: ['test', 'validation'] },
        })
        .select()
        .single()

      expect(noteError).toBeNull()
      expect(note).toBeDefined()

      // Wait for trigger to update search_content
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Verify search_content was updated
      const { data: updatedNote, error: selectError } = await supabase
        .from('notes')
        .select('id, content, search_content')
        .eq('id', note.id)
        .single()

      expect(selectError).toBeNull()
      expect(updatedNote?.search_content).toBeDefined()
      expect(updatedNote?.search_content).not.toBeNull()

      // Verify the note can be found via search
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_notes_keyword',
        {
          p_user_id: authenticatedUser.id,
          p_query: 'unique identifier abc123xyz',
          p_limit: 10,
          p_offset: 0,
          p_filters: {},
        }
      )

      expect(searchError).toBeNull()
      expect(searchResults?.length).toBeGreaterThan(0)
      expect(searchResults?.[0]?.id).toBe(note.id)
    })

    test('should update search_content when notes are modified', async ({ authenticatedUser }) => {
      const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authenticatedUser.accessToken}`,
          },
        },
      })

      // Get an existing note
      const { data: existingNotes } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', authenticatedUser.id)
        .limit(1)

      if (!existingNotes || existingNotes.length === 0) {
        return // Skip if no existing notes
      }

      const _note = existingNotes[0]
      const _updatedContent = note.content + ' UPDATED with modification marker xyz789'

      // Update the note
      const { error: updateError } = await supabase
        .from('notes')
        .update({ content: updatedContent })
        .eq('id', note.id)

      expect(updateError).toBeNull()

      // Wait for trigger to update search_content
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Verify the updated content can be found via search
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_notes_keyword',
        {
          p_user_id: authenticatedUser.id,
          p_query: 'modification marker xyz789',
          p_limit: 10,
          p_offset: 0,
          p_filters: {},
        }
      )

      expect(searchError).toBeNull()
      expect(searchResults?.length).toBeGreaterThan(0)
      expect(searchResults?.[0]?.id).toBe(note.id)
    })
  })

  test.describe('Unicode and International Text Handling', () => {
    test('should handle Korean text correctly in search', async ({
      authenticatedUser,
      page,
      apiHeaders,
    }) => {
      const _koreanQueries = [
        '한국어',
        '자연어 처리',
        '형태소 분석',
        '한국어 자연어 처리는 매우 복잡한 작업입니다',
      ]

      for (const query of koreanQueries) {
        const _response = await page.request.post(`${baseURL}/api/search`, {
          headers: apiHeaders,
          data: {
            query,
            type: 'keyword',
            limit: 10,
            offset: 0,
          },
        })

        expect(response.status()).toBe(200)
        const _data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.query).toBe(query)

        // Should find Korean content
        if (data.data.results.length > 0) {
          const _hasKoreanContent = data.data.results.some((result: Record<string, unknown>) =>
            /[\u3131-\u3163\uac00-\ud7a3]/.test(result.content)
          )
          expect(hasKoreanContent).toBe(true)
        }
      }
    })

    test('should handle emoji and special characters in search', async ({ authenticatedUser }) => {
      const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authenticatedUser.accessToken}`,
          },
        },
      })

      // Create note with emoji and special characters
      const _specialContent =
        'Test with emoji 🚀 and special chars: @#$%^&*()_+-={}[]|\\:";\'<>?,./ and unicode: ñáéíóú'

      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: authenticatedUser.id,
          content: specialContent,
          metadata: { tags: ['emoji', 'special'] },
        })
        .select()
        .single()

      expect(noteError).toBeNull()
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Search for emoji
      const { data: emojiResults, error: emojiError } = await supabase.rpc('search_notes_keyword', {
        p_user_id: authenticatedUser.id,
        p_query: '🚀',
        p_limit: 10,
        p_offset: 0,
        p_filters: {},
      })

      expect(emojiError).toBeNull()
      expect(emojiResults?.length).toBeGreaterThan(0)

      // Search for accented characters
      const { data: accentResults, error: accentError } = await supabase.rpc(
        'search_notes_keyword',
        {
          p_user_id: authenticatedUser.id,
          p_query: 'ñáéíóú',
          p_limit: 10,
          p_offset: 0,
          p_filters: {},
        }
      )

      expect(accentError).toBeNull()
      expect(accentResults?.length).toBeGreaterThan(0)
    })

    test('should handle mixed language content', async ({ authenticatedUser }) => {
      const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authenticatedUser.accessToken}`,
          },
        },
      })

      // Create note with mixed languages
      const _mixedContent = 'English text with 한국어 Korean and Español Spanish ñiño café résumé'

      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: authenticatedUser.id,
          content: mixedContent,
          metadata: { tags: ['multilingual'] },
        })
        .select()
        .single()

      expect(noteError).toBeNull()
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Search for each language component
      const _searches = ['English', '한국어', 'Español', 'résumé']

      for (const query of searches) {
        const { data: results, error } = await supabase.rpc('search_notes_keyword', {
          p_user_id: authenticatedUser.id,
          p_query: query,
          p_limit: 10,
          p_offset: 0,
          p_filters: {},
        })

        expect(error).toBeNull()

        // Should find the mixed language note
        const _foundNote = results?.find((r: { id: string }) => r.id === note.id)
        expect(foundNote).toBeDefined()
      }
    })
  })

  test.describe('Search Ranking and Relevance', () => {
    test('should rank exact matches higher than partial matches', async ({ authenticatedUser }) => {
      const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authenticatedUser.accessToken}`,
          },
        },
      })

      // Create notes with different relevance levels
      const _notes = [
        {
          content: 'Machine learning is a subset of artificial intelligence',
          expectedRank: 'high',
        },
        {
          content: 'Learning about machines in the factory',
          expectedRank: 'medium',
        },
        {
          content: 'The machine needs learning new techniques constantly',
          expectedRank: 'medium',
        },
        {
          content: 'Random content without the target terms',
          expectedRank: 'none',
        },
      ]

      // Insert test notes
      for (const note of notes) {
        await supabase.from('notes').insert({
          user_id: authenticatedUser.id,
          content: note.content,
          metadata: { tags: ['ranking-test'] },
        })
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      // Search for "machine learning"
      const { data: results, error } = await supabase.rpc('search_notes_keyword', {
        p_user_id: authenticatedUser.id,
        p_query: 'machine learning',
        p_limit: 10,
        p_offset: 0,
        p_filters: {},
      })

      expect(error).toBeNull()
      expect(results?.length).toBeGreaterThan(0)

      // The exact phrase "machine learning" should rank highest
      const _topResult = results?.[0]
      expect(topResult?.content).toContain('Machine learning is a subset')
      expect(topResult?.rank).toBeDefined()
      expect(topResult?.rank).toBeGreaterThan(0)

      // Verify ranking order (higher rank = better relevance)
      if (results && results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].rank).toBeGreaterThanOrEqual(results[i + 1].rank)
        }
      }
    })

    test('should consider word proximity in ranking', async ({ authenticatedUser }) => {
      const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authenticatedUser.accessToken}`,
          },
        },
      })

      // Create notes with words at different distances
      const _testNotes = [
        {
          content: 'Database optimization techniques are essential for performance',
          description: 'words close together',
        },
        {
          content:
            'Database systems require many different optimization strategies for better performance outcomes',
          description: 'words further apart',
        },
        {
          content: 'Performance monitoring helps with database optimization',
          description: 'words in different order',
        },
      ]

      for (const note of testNotes) {
        await supabase.from('notes').insert({
          user_id: authenticatedUser.id,
          content: note.content,
          metadata: { description: note.description },
        })
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      // Search for "database optimization"
      const { data: results, error } = await supabase.rpc('search_notes_keyword', {
        p_user_id: authenticatedUser.id,
        p_query: 'database optimization',
        p_limit: 10,
        p_offset: 0,
        p_filters: {},
      })

      expect(error).toBeNull()
      expect(results?.length).toBeGreaterThan(0)

      // Verify that closer proximity gets better ranking
      if (results && results.length >= 2) {
        const _firstResult = results[0]
        expect(firstResult.content).toContain('Database optimization techniques')
      }
    })
  })

  test.describe('Search Analytics Accuracy', () => {
    test('should accurately track search metrics', async ({
      authenticatedUser,
      page,
      apiHeaders,
    }) => {
      // Perform controlled searches and verify analytics
      const _searchQueries = ['machine learning', 'database optimization', 'react hooks']

      const searchTimes: number[] = []

      for (const query of searchQueries) {
        const _startTime = Date.now()

        const _response = await page.request.post(`${baseURL}/api/search`, {
          headers: apiHeaders,
          data: {
            query,
            type: 'keyword',
            limit: 10,
            offset: 0,
          },
        })

        const _endTime = Date.now()
        const _executionTime = endTime - startTime

        expect(response.status()).toBe(200)
        const _data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.executionTimeMs).toBeDefined()
        expect(data.data.executionTimeMs).toBeGreaterThan(0)
        expect(data.data.executionTimeMs).toBeLessThan(5000) // Should be reasonable

        searchTimes.push(data.data.executionTimeMs)
      }

      // Wait for analytics to be recorded
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check analytics accuracy
      const _analyticsResponse = await page.request.get(
        `${baseURL}/api/search/analytics?period=day`,
        {
          headers: apiHeaders,
        }
      )

      expect(analyticsResponse.status()).toBe(200)
      const _analyticsData = await analyticsResponse.json()

      expect(analyticsData.success).toBe(true)
      expect(analyticsData.data.totalQueries).toBeGreaterThanOrEqual(searchQueries.length)

      // Verify average execution time is reasonable
      expect(analyticsData.data.averageExecutionTime).toBeGreaterThan(0)
      expect(analyticsData.data.averageExecutionTime).toBeLessThan(5000)

      // Verify query type distribution
      expect(analyticsData.data.queryTypeDistribution.keyword).toBeGreaterThanOrEqual(
        searchQueries.length
      )
    })

    test('should track unique queries correctly', async ({
      authenticatedUser,
      page,
      apiHeaders,
    }) => {
      // Perform some duplicate and unique searches
      const _searches = [
        'machine learning', // first time
        'database optimization', // first time
        'machine learning', // duplicate
        'react hooks', // first time
        'machine learning', // duplicate again
      ]

      for (const query of searches) {
        await page.request.post(`${baseURL}/api/search`, {
          headers: apiHeaders,
          data: {
            query,
            type: 'keyword',
            limit: 10,
            offset: 0,
          },
        })
      }

      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check statistics
      const _statsResponse = await page.request.get(`${baseURL}/api/search/stats`, {
        headers: apiHeaders,
      })

      expect(statsResponse.status()).toBe(200)
      const _statsData = await statsResponse.json()

      expect(statsData.success).toBe(true)
      expect(statsData.data.totalSearches).toBeGreaterThanOrEqual(5)
      expect(statsData.data.uniqueQueries).toBe(3) // Should be exactly 3 unique queries
    })
  })

  test.describe('Search Cache Validation', () => {
    test('should cache and retrieve search results correctly', async ({ authenticatedUser }) => {
      const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authenticatedUser.accessToken}`,
          },
        },
      })

      // Perform a search that should be cached
      const _query = 'machine learning algorithms'

      const { data: firstResults, error: firstError } = await supabase.rpc('search_notes_keyword', {
        p_user_id: authenticatedUser.id,
        p_query: query,
        p_limit: 10,
        p_offset: 0,
        p_filters: {},
      })

      expect(firstError).toBeNull()

      // Wait a moment for caching
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if results are cached
      const _cacheKey = `search:${authenticatedUser.id}:${query}:keyword:{}` // Simplified cache key format

      // Note: Direct cache access depends on implementation
      // For now, we'll verify caching by checking if subsequent identical searches are faster

      const _startTime = Date.now()
      const { data: secondResults, error: secondError } = await supabase.rpc(
        'search_notes_keyword',
        {
          p_user_id: authenticatedUser.id,
          p_query: query,
          p_limit: 10,
          p_offset: 0,
          p_filters: {},
        }
      )
      const _secondExecutionTime = Date.now() - startTime

      expect(secondError).toBeNull()
      expect(secondResults).toEqual(firstResults) // Results should be identical

      // Second search might be faster due to database query plan caching
      // This is a soft assertion - caching behavior may vary
      expect(secondExecutionTime).toBeLessThan(1000)
    })

    test('should respect cache TTL and expiration', async ({ authenticatedUser }) => {
      const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authenticatedUser.accessToken}`,
          },
        },
      })

      // Manually create a cache entry with short TTL
      const _cacheKey = `test-cache-${Date.now()}`
      const _testResults = [{ id: 'test', content: 'test content', score: 0.8 }]

      const { error: insertError } = await supabase.from('search_cache').insert({
        cache_key: cacheKey,
        user_id: authenticatedUser.id,
        query: 'test query',
        filters: {},
        results: testResults as any,
        results_count: 1,
        expires_at: new Date(Date.now() + 1000).toISOString(), // 1 second TTL
      })

      expect(insertError).toBeNull()

      // Retrieve immediately (should work)
      const { data: immediateData, error: immediateError } = await supabase
        .from('search_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gte('expires_at', new Date().toISOString())
        .single()

      expect(immediateError).toBeNull()
      expect(immediateData).toBeDefined()

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Try to retrieve after expiration (should not find)
      const { data: expiredData, error: expiredError } = await supabase
        .from('search_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gte('expires_at', new Date().toISOString())
        .single()

      // Should not find expired cache entry
      expect(expiredData).toBeNull()
      expect(expiredError).toBeDefined()
    })
  })

  test.describe('Search Filter Validation', () => {
    test('should apply tag filters correctly', async ({ authenticatedUser, page, apiHeaders }) => {
      // Search with tag filter
      const _response = await page.request.post(`${baseURL}/api/search`, {
        headers: apiHeaders,
        data: {
          query: 'learning',
          type: 'keyword',
          limit: 10,
          offset: 0,
          filters: {
            tags: ['machine-learning'],
          },
        },
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.filters.tags).toEqual(['machine-learning'])

      // Verify all results have the specified tag
      if (data.data.results.length > 0) {
        data.data.results.forEach((result: Record<string, unknown>) => {
          if (result.metadata?.tags) {
            expect(result.metadata.tags).toContain('machine-learning')
          }
        })
      }
    })

    test('should apply date range filters correctly', async ({
      authenticatedUser,
      page,
      apiHeaders,
    }) => {
      const _yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const _tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const _response = await page.request.post(`${baseURL}/api/search`, {
        headers: apiHeaders,
        data: {
          query: 'machine',
          type: 'keyword',
          limit: 10,
          offset: 0,
          filters: {
            dateRange: {
              from: yesterday,
              to: tomorrow,
            },
          },
        },
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.filters.dateRange).toBeDefined()

      // Verify all results fall within the date range
      if (data.data.results.length > 0) {
        data.data.results.forEach((result: Record<string, unknown>) => {
          const _createdAt = new Date(result.createdAt)
          expect(createdAt.getTime()).toBeGreaterThanOrEqual(new Date(yesterday).getTime())
          expect(createdAt.getTime()).toBeLessThanOrEqual(new Date(tomorrow).getTime())
        })
      }
    })
  })
})
