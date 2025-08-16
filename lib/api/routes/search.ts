/**
 * Search API routes for Hono.js
 *
 * Implements comprehensive search functionality including keyword search,
 * search suggestions, history, analytics, and caching.
 *
 * Follows the existing patterns from notes.ts for consistency with
 * authentication, validation, error handling, and response formatting.
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Context } from 'hono'
import type { ApiResponse } from '@/lib/types'
import type { Database } from '@/lib/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import {
  SearchRequestSchema,
  SearchSuggestionsRequestSchema,
  SearchHistoryRequestSchema,
  SearchAnalyticsRequestSchema,
  SearchQueryParamsSchema,
  SearchParamsSchema,
  sanitizeSearchQuery,
  generateSearchCacheKey,
  validateSearchFilters,
  type SearchRequest,
  type SearchQueryParams,
} from '@/lib/schemas/search'
import {
  searchNotesKeyword,
  getSearchSuggestions,
  getSearchHistory,
  getSearchAnalytics,
  getCachedSearchResults,
  setCachedSearchResults,
  clearSearchHistory,
  deleteSearchHistoryItem,
  getSearchStats,
} from '@/lib/supabase/search'

// Type for Hono context with Supabase client
type HonoContext = Context

// ============================================================================
// HELPER FUNCTIONS FOR AUTHENTICATION
// ============================================================================

async function createAuthenticatedClient(accessToken: string): Promise<SupabaseClient<Database>> {
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  )

  return supabase
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

async function authMiddleware(c: Context, next: () => Promise<void>) {
  try {
    const authHeader = c.req.header('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        401
      )
    }

    const token = authHeader.substring(7)

    // Create an authenticated client with the user's token for RLS to work properly
    const userSupabase = await createAuthenticatedClient(token)

    // Verify the token and get user info
    const {
      data: { user },
      error,
    } = await userSupabase.auth.getUser()

    if (error || !user) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        401
      )
    }

    // Store user info and authenticated client in context
    c.set('supabase', userSupabase)
    c.set('userId', user.id)
    c.set('user', { id: user.id, email: user.email || '' })

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      500
    )
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// function getClientInfo(c: Context) {
//   return {
//     ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
//     userAgent: c.req.header('user-agent') || '',
//   }
// }

function transformSearchParams(params: SearchQueryParams): SearchRequest {
  return {
    query: params.q || '',
    type: params.type || 'keyword',
    limit: params.limit || 20,
    offset: params.offset || 0,
    filters: {
      tags: params.tags,
      clusterId: params.clusterId,
      dateRange:
        params.dateFrom && params.dateTo
          ? {
              from: params.dateFrom,
              to: params.dateTo,
            }
          : undefined,
    },
    sort: {
      sortBy: params.sort || 'relevance',
      sortOrder: params.order || 'desc',
    },
    includeSnippets: true,
    includeHighlighting: true,
  }
}

// ============================================================================
// CREATE SEARCH ROUTER
// ============================================================================

const app = new Hono()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

// ============================================================================
// MAIN SEARCH ENDPOINT
// ============================================================================

app.post(
  '/',
  zValidator('json', SearchRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid search request',
          validation: result.error.issues,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    const startTime = Date.now()

    try {
      const searchRequest = (await c.req.json()) as SearchRequest
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>

      // Sanitize and validate search query
      const sanitizedQuery = sanitizeSearchQuery(searchRequest.query)
      if (!sanitizedQuery) {
        return c.json(
          {
            success: false,
            error: 'Validation Error',
            message: 'Search query cannot be empty',
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          400
        )
      }

      // Validate filters
      const filterValidation = validateSearchFilters(searchRequest.filters || {})
      if (!filterValidation.valid) {
        return c.json(
          {
            success: false,
            error: 'Validation Error',
            message: 'Invalid search filters',
            issues: filterValidation.issues,
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          400
        )
      }

      // Check cache first (for keyword searches)
      if (searchRequest.type === 'keyword') {
        const cacheKey = generateSearchCacheKey(
          userId,
          sanitizedQuery,
          filterValidation.sanitizedFilters,
          searchRequest.type
        )

        const cachedResults = await getCachedSearchResults(supabase, cacheKey, userId)
        if (cachedResults) {
          const totalExecutionTime = Date.now() - startTime

          return c.json(
            {
              success: true,
              data: {
                results: cachedResults,
                pagination: {
                  limit: searchRequest.limit,
                  offset: searchRequest.offset,
                  total: cachedResults.length,
                  hasNext: cachedResults.length >= searchRequest.limit,
                  hasPrev: searchRequest.offset > 0,
                },
                query: sanitizedQuery,
                type: searchRequest.type,
                executionTimeMs: totalExecutionTime,
                totalResults: cachedResults.length,
                filters: filterValidation.sanitizedFilters,
                cached: true,
              },
              timestamp: new Date().toISOString(),
            } as ApiResponse,
            200
          )
        }
      }

      // Perform search based on type
      let searchResults

      switch (searchRequest.type) {
        case 'keyword':
          searchResults = await searchNotesKeyword(supabase, userId, sanitizedQuery, {
            limit: searchRequest.limit,
            offset: searchRequest.offset,
            filters: filterValidation.sanitizedFilters,
            includeSnippets: searchRequest.includeSnippets,
            includeHighlighting: searchRequest.includeHighlighting,
          })
          break

        case 'semantic':
          // TODO: Implement semantic search when vector embeddings are ready
          return c.json(
            {
              success: false,
              error: 'Not Implemented',
              message: 'Semantic search is not yet available',
              timestamp: new Date().toISOString(),
            } as ApiResponse,
            501
          )

        case 'hybrid':
          // TODO: Implement hybrid search combining keyword + semantic
          return c.json(
            {
              success: false,
              error: 'Not Implemented',
              message: 'Hybrid search is not yet available',
              timestamp: new Date().toISOString(),
            } as ApiResponse,
            501
          )

        default:
          return c.json(
            {
              success: false,
              error: 'Validation Error',
              message: 'Invalid search type',
              timestamp: new Date().toISOString(),
            } as ApiResponse,
            400
          )
      }

      // Cache results for keyword searches
      if (searchRequest.type === 'keyword' && searchResults.results.length > 0) {
        const cacheKey = generateSearchCacheKey(
          userId,
          sanitizedQuery,
          filterValidation.sanitizedFilters,
          searchRequest.type
        )

        // Don't await - cache in background
        setCachedSearchResults(
          supabase,
          cacheKey,
          userId,
          sanitizedQuery,
          searchResults.results,
          filterValidation.sanitizedFilters,
          60 // 1 hour TTL
        ).catch(error => {
          console.error('Failed to cache search results:', error)
        })
      }

      const totalExecutionTime = Date.now() - startTime

      return c.json(
        {
          success: true,
          data: {
            results: searchResults.results,
            pagination: {
              limit: searchRequest.limit,
              offset: searchRequest.offset,
              total: searchResults.total,
              hasNext: searchResults.results.length >= searchRequest.limit,
              hasPrev: searchRequest.offset > 0,
            },
            query: sanitizedQuery,
            type: searchRequest.type,
            executionTimeMs: totalExecutionTime,
            totalResults: searchResults.total,
            filters: filterValidation.sanitizedFilters,
            cached: false,
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      const totalExecutionTime = Date.now() - startTime
      console.error('Search error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Search failed',
          executionTimeMs: totalExecutionTime,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// SEARCH VIA GET (for simple queries)
// ============================================================================

app.get(
  '/',
  zValidator('query', SearchQueryParamsSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid query parameters',
          validation: result.error.issues,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const queryParams = c.req.query() as unknown as SearchQueryParams
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>

      if (!queryParams.q) {
        return c.json(
          {
            success: false,
            error: 'Validation Error',
            message: 'Search query is required',
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          400
        )
      }

      // Transform query params to search request
      const searchRequest = transformSearchParams(queryParams)

      // Sanitize query
      const sanitizedQuery = sanitizeSearchQuery(searchRequest.query)

      // Validate filters
      const filterValidation = validateSearchFilters(searchRequest.filters || {})
      if (!filterValidation.valid) {
        return c.json(
          {
            success: false,
            error: 'Validation Error',
            message: 'Invalid search filters',
            issues: filterValidation.issues,
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          400
        )
      }

      // Perform keyword search
      const searchResults = await searchNotesKeyword(supabase, userId, sanitizedQuery, {
        limit: searchRequest.limit,
        offset: searchRequest.offset,
        filters: filterValidation.sanitizedFilters,
        includeSnippets: searchRequest.includeSnippets,
        includeHighlighting: searchRequest.includeHighlighting,
      })

      return c.json(
        {
          success: true,
          data: {
            results: searchResults.results,
            pagination: {
              limit: searchRequest.limit,
              offset: searchRequest.offset,
              total: searchResults.total,
              hasNext: searchResults.results.length >= searchRequest.limit,
              hasPrev: searchRequest.offset > 0,
            },
            query: sanitizedQuery,
            type: searchRequest.type,
            executionTimeMs: searchResults.executionTimeMs,
            totalResults: searchResults.total,
            filters: filterValidation.sanitizedFilters,
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      console.error('GET search error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Search failed',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// SEARCH SUGGESTIONS
// ============================================================================

app.get(
  '/suggestions',
  zValidator('query', SearchSuggestionsRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid suggestions request',
          validation: result.error.issues,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const query = c.req.query()
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>

      const queryPrefix = query.query || ''
      const limit = parseInt(query.limit || '10', 10)

      const suggestions = await getSearchSuggestions(supabase, userId, queryPrefix, limit)

      return c.json(
        {
          success: true,
          data: {
            suggestions,
            total: suggestions.length,
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      console.error('Search suggestions error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to get search suggestions',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// SEARCH HISTORY
// ============================================================================

app.get(
  '/history',
  zValidator('query', SearchHistoryRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid history request',
          validation: result.error.issues,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const query = c.req.query()
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>

      const limit = parseInt(query.limit || '20', 10)
      const offset = parseInt(query.offset || '0', 10)

      const historyResult = await getSearchHistory(supabase, userId, {
        limit,
        offset,
        queryType: query.type as 'keyword' | 'semantic' | 'hybrid',
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      })

      return c.json(
        {
          success: true,
          data: {
            history: historyResult.history,
            pagination: {
              limit,
              offset,
              total: historyResult.total,
              hasNext: historyResult.history.length >= limit,
              hasPrev: offset > 0,
            },
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      console.error('Search history error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to get search history',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// DELETE SEARCH HISTORY
// ============================================================================

app.delete('/history', async (c: HonoContext) => {
  try {
    const userId = c.get('userId') as string
    const supabase = c.get('supabase') as SupabaseClient<Database>

    const query = c.req.query()
    const olderThan = query.olderThan ? new Date(query.olderThan) : undefined

    const deletedCount = await clearSearchHistory(supabase, userId, olderThan)

    return c.json(
      {
        success: true,
        data: {
          deletedCount,
          message: `Deleted ${deletedCount} search history items`,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      200
    )
  } catch (error) {
    console.error('Clear search history error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to clear search history',
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      500
    )
  }
})

// ============================================================================
// DELETE SPECIFIC SEARCH HISTORY ITEM
// ============================================================================

app.delete(
  '/history/:id',
  zValidator('param', SearchParamsSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid history item ID',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const historyId = c.req.param('id')
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>

      const success = await deleteSearchHistoryItem(supabase, userId, historyId)

      if (!success) {
        return c.json(
          {
            success: false,
            error: 'Not Found',
            message: 'Search history item not found',
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          404
        )
      }

      return c.json(
        {
          success: true,
          data: {
            id: historyId,
            message: 'Search history item deleted successfully',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      console.error('Delete search history item error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to delete search history item',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// SEARCH ANALYTICS
// ============================================================================

app.get(
  '/analytics',
  zValidator('query', SearchAnalyticsRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid analytics request',
          validation: result.error.issues,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const query = c.req.query()
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>

      const analytics = await getSearchAnalytics(supabase, userId, {
        period: query.period as 'day' | 'week' | 'month' | 'year',
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        queryType: query.queryType as 'keyword' | 'semantic' | 'hybrid',
      })

      return c.json(
        {
          success: true,
          data: analytics,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      console.error('Search analytics error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to get search analytics',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// SEARCH STATISTICS
// ============================================================================

app.get('/stats', async (c: HonoContext) => {
  try {
    const userId = c.get('userId') as string
    const supabase = c.get('supabase') as SupabaseClient<Database>

    const stats = await getSearchStats(supabase, userId)

    return c.json(
      {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      200
    )
  } catch (error) {
    console.error('Search stats error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to get search statistics',
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      500
    )
  }
})

export { app as searchRouter }
