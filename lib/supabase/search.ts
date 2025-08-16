/**
 * Supabase Database Operations for Search Functionality
 *
 * This module implements all search-related database operations using Supabase
 * including keyword search, search analytics, history, and caching.
 *
 * Follows the existing patterns from lib/supabase/database.ts for consistency
 * and maintains RLS (Row Level Security) compliance.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/types/supabase'
import type {
  SearchResult,
  SearchFilters,
  SearchQueryType,
  SearchSuggestion,
  SearchHistoryItem,
  SearchAnalytics,
} from '@/lib/schemas/search'

// Type for authenticated Supabase client
type AuthenticatedSupabaseClient = SupabaseClient<Database>

// ============================================================================
// CORE SEARCH OPERATIONS
// ============================================================================

/**
 * Perform keyword search with full-text search and ranking
 */
export async function searchNotesKeyword(
  supabase: AuthenticatedSupabaseClient,
  userId: string,
  query: string,
  options: {
    limit?: number
    offset?: number
    filters?: SearchFilters
    includeSnippets?: boolean
    includeHighlighting?: boolean
  } = {}
): Promise<{
  results: SearchResult[]
  total: number
  executionTimeMs: number
}> {
  const startTime = Date.now()
  const {
    limit = 20,
    offset = 0,
    filters = {},
    includeSnippets = true,
    includeHighlighting = true,
  } = options

  try {
    // Call the PostgreSQL search function
    const { data, error } = await supabase.rpc('search_notes_keyword', {
      p_user_id: userId,
      p_query: query,
      p_limit: limit,
      p_offset: offset,
      p_filters: (filters as Json) || {},
    })

    if (error) {
      console.error('Search error:', error)
      throw new Error(`Search failed: ${error.message}`)
    }

    // Transform results to match SearchResult schema
    const results: SearchResult[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      content: row.content,
      highlightedContent: includeHighlighting ? row.highlighted_content : undefined,
      snippet: includeSnippets ? row.snippet : undefined,
      userId: userId,
      clusterId: row.cluster_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: {
        wordCount: ((row.metadata as Record<string, unknown>)?.wordCount as number) || 0,
        characterCount: ((row.metadata as Record<string, unknown>)?.characterCount as number) || 0,
        tags: ((row.metadata as Record<string, unknown>)?.tags as string[]) || [],
        importance: (row.metadata as Record<string, unknown>)?.importance as string,
        sentiment: (row.metadata as Record<string, unknown>)?.sentiment as string,
        categories: (row.metadata as Record<string, unknown>)?.categories as string[],
      },
      rank: row.rank,
      score: Math.min((row.rank as number) || 0, 1), // Normalize rank to 0-1 score
    }))

    const executionTimeMs = Date.now() - startTime

    // Track search analytics
    await trackSearchQuery(
      supabase,
      userId,
      query,
      'keyword',
      results.length,
      executionTimeMs,
      filters
    )

    return {
      results,
      total: results.length, // For cursor-based pagination, we don't have exact total
      executionTimeMs,
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error('Keyword search failed:', error)

    // Track failed search
    await trackSearchQuery(supabase, userId, query, 'keyword', 0, executionTimeMs, filters)

    throw error
  }
}

/**
 * Get search suggestions based on history and popular queries
 */
export async function getSearchSuggestions(
  supabase: AuthenticatedSupabaseClient,
  userId: string,
  queryPrefix: string = '',
  limit: number = 10
): Promise<SearchSuggestion[]> {
  try {
    const { data, error } = await supabase.rpc('get_search_suggestions', {
      p_user_id: userId,
      p_query_prefix: queryPrefix,
      p_limit: limit,
    })

    if (error) {
      console.error('Search suggestions error:', error)
      return []
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      query: row.query,
      type: 'history' as const,
      useCount: row.use_count,
      lastUsedAt: row.last_used_at,
    }))
  } catch (error) {
    console.error('Failed to get search suggestions:', error)
    return []
  }
}

// ============================================================================
// SEARCH ANALYTICS AND TRACKING
// ============================================================================

/**
 * Track search query for analytics and history
 */
export async function trackSearchQuery(
  supabase: AuthenticatedSupabaseClient,
  userId: string,
  query: string,
  queryType: SearchQueryType,
  resultsCount: number,
  executionTimeMs: number,
  filters: SearchFilters = {}
): Promise<void> {
  try {
    const { error } = await supabase.rpc('track_search_query', {
      p_user_id: userId,
      p_query: query,
      p_query_type: queryType,
      p_results_count: resultsCount,
      p_execution_time_ms: executionTimeMs,
      p_filters: (filters as Json) || {},
    })

    if (error) {
      console.error('Failed to track search query:', error)
      // Don't throw - tracking failures shouldn't break search
    }
  } catch (error) {
    console.error('Error tracking search query:', error)
    // Don't throw - tracking failures shouldn't break search
  }
}

/**
 * Get user's search history with pagination
 */
export async function getSearchHistory(
  supabase: AuthenticatedSupabaseClient,
  userId: string,
  options: {
    limit?: number
    offset?: number
    queryType?: SearchQueryType
    dateFrom?: Date
    dateTo?: Date
  } = {}
): Promise<{
  history: SearchHistoryItem[]
  total: number
}> {
  const { limit = 20, offset = 0, queryType, dateFrom, dateTo } = options

  try {
    let query = supabase
      .from('search_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (queryType) {
      query = query.eq('query_type', queryType)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom.toISOString())
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo.toISOString())
    }

    const { data, count, error } = await query

    if (error) {
      console.error('Search history error:', error)
      throw new Error(`Failed to get search history: ${error.message}`)
    }

    const history: SearchHistoryItem[] = (data || []).map(row => ({
      id: row.id,
      query: row.query,
      type: row.query_type as SearchQueryType,
      filters: (row.filters as SearchFilters) || {},
      resultCount: row.result_count,
      useCount: row.use_count,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
    }))

    return {
      history,
      total: count || 0,
    }
  } catch (error) {
    console.error('Failed to get search history:', error)
    throw error
  }
}

/**
 * Get search analytics for user
 */
export async function getSearchAnalytics(
  supabase: AuthenticatedSupabaseClient,
  userId: string,
  options: {
    period?: 'day' | 'week' | 'month' | 'year'
    dateFrom?: Date
    dateTo?: Date
    queryType?: SearchQueryType
  } = {}
): Promise<SearchAnalytics> {
  const { period = 'week', dateFrom, dateTo, queryType } = options

  try {
    // Calculate date range if not provided
    const endDate = dateTo || new Date()
    const startDate =
      dateFrom ||
      (() => {
        const date = new Date(endDate)
        switch (period) {
          case 'day':
            date.setDate(date.getDate() - 1)
            break
          case 'week':
            date.setDate(date.getDate() - 7)
            break
          case 'month':
            date.setMonth(date.getMonth() - 1)
            break
          case 'year':
            date.setFullYear(date.getFullYear() - 1)
            break
        }
        return date
      })()

    let query = supabase
      .from('search_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (queryType) {
      query = query.eq('query_type', queryType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Search analytics error:', error)
      throw new Error(`Failed to get search analytics: ${error.message}`)
    }

    // Process analytics data
    const analytics = data || []
    const totalQueries = analytics.length
    const averageExecutionTime =
      totalQueries > 0
        ? analytics.reduce((sum, a) => sum + a.execution_time_ms, 0) / totalQueries
        : 0

    // Count queries by type
    const queryTypeDistribution = {
      keyword: analytics.filter(a => a.query_type === 'keyword').length,
      semantic: analytics.filter(a => a.query_type === 'semantic').length,
      hybrid: analytics.filter(a => a.query_type === 'hybrid').length,
    }

    // Performance metrics
    const fastQueries = analytics.filter(a => a.execution_time_ms < 200).length
    const slowQueries = analytics.filter(a => a.execution_time_ms > 1000).length
    const averageResultCount =
      totalQueries > 0 ? analytics.reduce((sum, a) => sum + a.results_count, 0) / totalQueries : 0

    // Most popular queries
    const queryGroups = analytics.reduce(
      (groups, a) => {
        const key = a.query.toLowerCase()
        if (!groups[key]) {
          groups[key] = { query: a.query, count: 0, totalResults: 0 }
        }
        groups[key].count++
        groups[key].totalResults += a.results_count
        return groups
      },
      {} as Record<string, { query: string; count: number; totalResults: number }>
    )

    const mostPopularQueries = Object.values(queryGroups)
      .sort((a, b) => (b as { count: number }).count - (a as { count: number }).count)
      .slice(0, 10)
      .map(g => {
        const group = g as { query: string; count: number; totalResults: number }
        return {
          query: group.query,
          count: group.count,
          averageResults: group.count > 0 ? group.totalResults / group.count : 0,
        }
      })

    // Time series data (simplified - group by day)
    const timeSeriesGroups = analytics.reduce(
      (groups, a) => {
        const date = new Date(a.created_at).toISOString().split('T')[0]
        if (!groups[date]) {
          groups[date] = { date, queryCount: 0, totalExecutionTime: 0 }
        }
        groups[date].queryCount++
        groups[date].totalExecutionTime += a.execution_time_ms
        return groups
      },
      {} as Record<string, { date: string; queryCount: number; totalExecutionTime: number }>
    )

    const timeSeriesData = (
      Object.values(timeSeriesGroups) as Array<{
        date: string
        queryCount: number
        totalExecutionTime: number
      }>
    )
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(g => ({
        date: new Date(g.date).toISOString(),
        queryCount: g.queryCount,
        averageExecutionTime: g.queryCount > 0 ? g.totalExecutionTime / g.queryCount : 0,
      }))

    return {
      totalQueries,
      averageExecutionTime,
      mostPopularQueries,
      queryTypeDistribution,
      performanceMetrics: {
        fastQueries,
        slowQueries,
        averageResultCount,
      },
      timeSeriesData,
    }
  } catch (error) {
    console.error('Failed to get search analytics:', error)
    throw error
  }
}

// ============================================================================
// SEARCH CACHE OPERATIONS
// ============================================================================

/**
 * Get cached search results
 */
export async function getCachedSearchResults(
  supabase: AuthenticatedSupabaseClient,
  cacheKey: string,
  userId: string
): Promise<SearchResult[] | null> {
  try {
    const { data, error } = await supabase
      .from('search_cache')
      .select('results, expires_at, hit_count')
      .eq('cache_key', cacheKey)
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null
    }

    // Update hit count
    const currentHitCount = ((data as Record<string, unknown>)?.hit_count as number) ?? 0
    await supabase
      .from('search_cache')
      .update({
        hit_count: currentHitCount + 1,
        last_hit_at: new Date().toISOString(),
      })
      .eq('cache_key', cacheKey)

    return data.results as SearchResult[]
  } catch (error) {
    console.error('Failed to get cached search results:', error)
    return null
  }
}

/**
 * Cache search results
 */
export async function setCachedSearchResults(
  supabase: AuthenticatedSupabaseClient,
  cacheKey: string,
  userId: string,
  query: string,
  results: SearchResult[],
  filters: SearchFilters = {},
  ttlMinutes: number = 60
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

    const { error } = await supabase.from('search_cache').upsert({
      cache_key: cacheKey,
      user_id: userId,
      query,
      filters: filters as Json,
      results: results as Json,
      results_count: results.length,
      expires_at: expiresAt.toISOString(),
      hit_count: 0,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Failed to cache search results:', error)
      // Don't throw - caching failures shouldn't break search
    }
  } catch (error) {
    console.error('Error caching search results:', error)
    // Don't throw - caching failures shouldn't break search
  }
}

// ============================================================================
// SEARCH MANAGEMENT OPERATIONS
// ============================================================================

/**
 * Clear user's search history
 */
export async function clearSearchHistory(
  supabase: AuthenticatedSupabaseClient,
  userId: string,
  olderThan?: Date
): Promise<number> {
  try {
    let query = supabase.from('search_history').delete().eq('user_id', userId)

    if (olderThan) {
      query = query.lt('created_at', olderThan.toISOString())
    }

    const { data, error } = await query.select('id')

    if (error) {
      console.error('Failed to clear search history:', error)
      throw new Error(`Failed to clear search history: ${error.message}`)
    }

    return data?.length ?? 0
  } catch (error) {
    console.error('Error clearing search history:', error)
    throw error
  }
}

/**
 * Delete specific search history item
 */
export async function deleteSearchHistoryItem(
  supabase: AuthenticatedSupabaseClient,
  userId: string,
  historyId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', historyId)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to delete search history item:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting search history item:', error)
    return false
  }
}

/**
 * Cleanup old search data (for maintenance)
 */
export async function cleanupSearchData(supabase: AuthenticatedSupabaseClient): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_search_data')

    if (error) {
      console.error('Search cleanup error:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Failed to cleanup search data:', error)
    return 0
  }
}

// ============================================================================
// SEARCH UTILITIES
// ============================================================================

/**
 * Get search statistics for user
 */
export async function getSearchStats(
  supabase: AuthenticatedSupabaseClient,
  userId: string
): Promise<{
  totalSearches: number
  uniqueQueries: number
  averageResultsPerSearch: number
  mostUsedQuery: string | null
  searchesToday: number
  averageExecutionTime: number
}> {
  try {
    // Get basic stats from search_analytics
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('search_analytics')
      .select('query, results_count, execution_time_ms, created_at')
      .eq('user_id', userId)

    if (analyticsError) {
      throw analyticsError
    }

    const analytics = analyticsData || []
    const today = new Date().toISOString().split('T')[0]
    const searchesToday = analytics.filter(a => a.created_at.startsWith(today)).length

    // Get most used query from search_history
    const { data: historyData, error: historyError } = await supabase
      .from('search_history')
      .select('query, use_count')
      .eq('user_id', userId)
      .order('use_count', { ascending: false })
      .limit(1)

    if (historyError) {
      throw historyError
    }

    const mostUsedQuery = historyData?.[0]?.query || null

    return {
      totalSearches: analytics.length,
      uniqueQueries: new Set(analytics.map(a => a.query)).size,
      averageResultsPerSearch:
        analytics.length > 0
          ? analytics.reduce((sum, a) => sum + a.results_count, 0) / analytics.length
          : 0,
      mostUsedQuery,
      searchesToday,
      averageExecutionTime:
        analytics.length > 0
          ? analytics.reduce((sum, a) => sum + a.execution_time_ms, 0) / analytics.length
          : 0,
    }
  } catch (error) {
    console.error('Failed to get search stats:', error)
    throw error
  }
}
