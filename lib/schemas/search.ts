/**
 * Comprehensive Zod Validation Schemas for Search Operations
 *
 * This module provides runtime validation schemas using Zod for all search-related
 * operations including keyword search, filters, analytics, and search history.
 *
 * Schemas follow the existing note validation patterns and integrate seamlessly
 * with the unified Next.js + Hono.js architecture.
 */

import { z } from 'zod'

// ============================================================================
// BASE SEARCH SCHEMAS
// ============================================================================

/**
 * Search query type enum
 */
export const SearchQueryTypeSchema = z.enum(['keyword', 'semantic', 'hybrid'])

/**
 * Search sort options
 */
export const SearchSortSchema = z.object({
  sortBy: z.enum(['relevance', 'created_at', 'updated_at', 'word_count']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Date range filter schema
 */
export const DateRangeFilterSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine(data => data.from <= data.to, {
    message: 'Start date must be before or equal to end date',
  })

/**
 * Search filters schema
 */
export const SearchFiltersSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  clusterId: z.string().uuid().optional(),
  dateRange: DateRangeFilterSchema.optional(),
  hasEmbedding: z.boolean().optional(),
  importance: z.enum(['low', 'medium', 'high']).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  categories: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  wordCountMin: z.number().int().min(0).optional(),
  wordCountMax: z.number().int().min(0).optional(),
})

// ============================================================================
// SEARCH REQUEST SCHEMAS
// ============================================================================

/**
 * Base search request schema
 */
export const SearchRequestSchema = z.object({
  query: z.string().trim().min(1, 'Search query is required').max(500, 'Search query too long'),
  type: SearchQueryTypeSchema.default('keyword'),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(20),
  offset: z.coerce.number().int().min(0).default(0),
  filters: SearchFiltersSchema.optional(),
  sort: SearchSortSchema.optional(),
  includeSnippets: z.boolean().default(true),
  includeHighlighting: z.boolean().default(true),
})

/**
 * Search suggestions request schema
 */
export const SearchSuggestionsRequestSchema = z.object({
  query: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  includeHistory: z.boolean().default(true),
  includePopular: z.boolean().default(true),
})

/**
 * Search history request schema
 */
export const SearchHistoryRequestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: SearchQueryTypeSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

/**
 * Search analytics request schema
 */
export const SearchAnalyticsRequestSchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('week'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  queryType: SearchQueryTypeSchema.optional(),
})

// ============================================================================
// SEARCH RESPONSE SCHEMAS
// ============================================================================

/**
 * Search result item schema
 */
export const SearchResultSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  highlightedContent: z.string().optional(),
  snippet: z.string().optional(),
  userId: z.string().uuid(),
  clusterId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.object({
    wordCount: z.number().int().min(0),
    characterCount: z.number().int().min(0),
    tags: z.array(z.string()),
    importance: z.enum(['low', 'medium', 'high']).optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    categories: z.array(z.string()).optional(),
  }),
  rank: z.number().min(0).optional(),
  score: z.number().min(0).max(1).optional(),
})

/**
 * Search pagination schema
 */
export const SearchPaginationSchema = z.object({
  limit: z.number().int().positive(),
  offset: z.number().int().min(0),
  total: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
})

/**
 * Search response schema
 */
export const SearchResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    results: z.array(SearchResultSchema),
    pagination: SearchPaginationSchema,
    query: z.string(),
    type: SearchQueryTypeSchema,
    executionTimeMs: z.number().int().min(0),
    totalResults: z.number().int().min(0),
    filters: SearchFiltersSchema.optional(),
  }),
  timestamp: z.string().datetime(),
})

/**
 * Search suggestion item schema
 */
export const SearchSuggestionSchema = z.object({
  query: z.string(),
  type: z.enum(['history', 'popular', 'completion']),
  useCount: z.number().int().min(0).optional(),
  lastUsedAt: z.string().datetime().optional(),
})

/**
 * Search suggestions response schema
 */
export const SearchSuggestionsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    suggestions: z.array(SearchSuggestionSchema),
    total: z.number().int().min(0),
  }),
  timestamp: z.string().datetime(),
})

/**
 * Search history item schema
 */
export const SearchHistoryItemSchema = z.object({
  id: z.string().uuid(),
  query: z.string(),
  type: SearchQueryTypeSchema,
  filters: SearchFiltersSchema.optional(),
  resultCount: z.number().int().min(0),
  useCount: z.number().int().min(1),
  lastUsedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
})

/**
 * Search history response schema
 */
export const SearchHistoryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    history: z.array(SearchHistoryItemSchema),
    pagination: SearchPaginationSchema,
  }),
  timestamp: z.string().datetime(),
})

/**
 * Search analytics schema
 */
export const SearchAnalyticsSchema = z.object({
  totalQueries: z.number().int().min(0),
  averageExecutionTime: z.number().min(0),
  mostPopularQueries: z.array(
    z.object({
      query: z.string(),
      count: z.number().int().positive(),
      averageResults: z.number().min(0),
    })
  ),
  queryTypeDistribution: z.object({
    keyword: z.number().int().min(0),
    semantic: z.number().int().min(0),
    hybrid: z.number().int().min(0),
  }),
  performanceMetrics: z.object({
    fastQueries: z.number().int().min(0), // <200ms
    slowQueries: z.number().int().min(0), // >1000ms
    averageResultCount: z.number().min(0),
  }),
  timeSeriesData: z.array(
    z.object({
      date: z.string().datetime(),
      queryCount: z.number().int().min(0),
      averageExecutionTime: z.number().min(0),
    })
  ),
})

/**
 * Search analytics response schema
 */
export const SearchAnalyticsResponseSchema = z.object({
  success: z.literal(true),
  data: SearchAnalyticsSchema,
  timestamp: z.string().datetime(),
})

// ============================================================================
// PARAMETER SCHEMAS
// ============================================================================

/**
 * Search ID parameter schema
 */
export const SearchParamsSchema = z.object({
  id: z.string().uuid('Invalid search ID format'),
})

/**
 * Search query parameter schema
 */
export const SearchQueryParamsSchema = z.object({
  q: z.string().trim().min(1).max(500).optional(),
  type: SearchQueryTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  tags: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',').map(tag => tag.trim()) : undefined)),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  clusterId: z.string().uuid().optional(),
  sort: z.enum(['relevance', 'created_at', 'updated_at', 'word_count']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Request types
export type SearchRequest = z.infer<typeof SearchRequestSchema>
export type SearchSuggestionsRequest = z.infer<typeof SearchSuggestionsRequestSchema>
export type SearchHistoryRequest = z.infer<typeof SearchHistoryRequestSchema>
export type SearchAnalyticsRequest = z.infer<typeof SearchAnalyticsRequestSchema>
export type SearchQueryParams = z.infer<typeof SearchQueryParamsSchema>

// Response types
export type SearchResponse = z.infer<typeof SearchResponseSchema>
export type SearchSuggestionsResponse = z.infer<typeof SearchSuggestionsResponseSchema>
export type SearchHistoryResponse = z.infer<typeof SearchHistoryResponseSchema>
export type SearchAnalyticsResponse = z.infer<typeof SearchAnalyticsResponseSchema>

// Entity types
export type SearchResult = z.infer<typeof SearchResultSchema>
export type SearchSuggestion = z.infer<typeof SearchSuggestionSchema>
export type SearchHistoryItem = z.infer<typeof SearchHistoryItemSchema>
export type SearchAnalytics = z.infer<typeof SearchAnalyticsSchema>
export type SearchFilters = z.infer<typeof SearchFiltersSchema>
export type SearchSort = z.infer<typeof SearchSortSchema>
export type SearchQueryType = z.infer<typeof SearchQueryTypeSchema>
export type DateRangeFilter = z.infer<typeof DateRangeFilterSchema>

// Parameter types
export type SearchParams = z.infer<typeof SearchParamsSchema>

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/['"]/g, '') // Remove quotes to prevent tsquery injection
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500) // Enforce max length
}

/**
 * Parse search query into PostgreSQL tsquery format
 */
export function parseSearchQuery(query: string): string {
  const sanitized = sanitizeSearchQuery(query)

  // Split into words and join with & for AND operation
  const words = sanitized
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.replace(/[^\w\s]/g, '')) // Remove special chars
    .filter(word => word.length > 0)

  if (words.length === 0) {
    return ''
  }

  // Join with & for AND operation, or use | for OR if query contains "OR"
  if (sanitized.toUpperCase().includes(' OR ')) {
    return words.join(' | ')
  }

  return words.join(' & ')
}

/**
 * Generate search cache key
 */
export function generateSearchCacheKey(
  userId: string,
  query: string,
  filters?: SearchFilters,
  type: SearchQueryType = 'keyword'
): string {
  const data = {
    userId,
    query: sanitizeSearchQuery(query),
    filters: filters || {},
    type,
  }

  // In production, use crypto.createHash('sha256')
  return btoa(JSON.stringify(data)).replace(/[+/=]/g, '')
}

/**
 * Validate search filters
 */
export function validateSearchFilters(filters: SearchFilters): {
  valid: boolean
  issues: string[]
  sanitizedFilters: SearchFilters
} {
  const issues: string[] = []
  const sanitizedFilters: SearchFilters = { ...filters }

  // Validate date range
  if (filters.dateRange) {
    if (filters.dateRange.from > filters.dateRange.to) {
      issues.push('Start date must be before or equal to end date')
    }
  }

  // Validate word count range
  if (filters.wordCountMin !== undefined && filters.wordCountMax !== undefined) {
    if (filters.wordCountMin > filters.wordCountMax) {
      issues.push('Minimum word count must be less than or equal to maximum')
    }
  }

  // Validate tags
  if (filters.tags) {
    const validTags = filters.tags.filter(tag => {
      const trimmed = tag.trim()
      return trimmed.length > 0 && trimmed.length <= 50
    })

    if (validTags.length !== filters.tags.length) {
      issues.push('Some tags are invalid (empty or too long)')
    }

    sanitizedFilters.tags = validTags.slice(0, 10) // Limit to 10 tags
  }

  return {
    valid: issues.length === 0,
    issues,
    sanitizedFilters,
  }
}

/**
 * Create search analytics entry
 */
export function createSearchAnalytics(
  userId: string,
  query: string,
  type: SearchQueryType,
  results: number,
  executionTimeMs: number,
  filters?: SearchFilters
) {
  return {
    userId,
    query: sanitizeSearchQuery(query),
    queryType: type,
    resultsCount: results,
    executionTimeMs,
    filtersApplied: filters || {},
  }
}

/**
 * Generate search snippet from content
 */
export function generateSearchSnippet(content: string, query: string, maxLength = 150): string {
  const queryWords = sanitizeSearchQuery(query)
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2)

  if (queryWords.length === 0) {
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '')
  }

  // Find the best snippet containing query words
  const contentLower = content.toLowerCase()
  let bestIndex = -1
  let maxMatches = 0

  for (let i = 0; i <= content.length - maxLength; i += 50) {
    const snippet = contentLower.substring(i, i + maxLength)
    const matches = queryWords.filter(word => snippet.includes(word)).length

    if (matches > maxMatches) {
      maxMatches = matches
      bestIndex = i
    }
  }

  if (bestIndex === -1) {
    bestIndex = 0
  }

  let snippet = content.substring(bestIndex, bestIndex + maxLength)

  // Try to break at word boundary
  if (snippet.length === maxLength && bestIndex + maxLength < content.length) {
    const lastSpace = snippet.lastIndexOf(' ')
    if (lastSpace > maxLength * 0.8) {
      snippet = snippet.substring(0, lastSpace) + '...'
    } else {
      snippet = snippet + '...'
    }
  }

  return snippet
}

/**
 * Highlight search terms in content
 */
export function highlightSearchTerms(
  content: string,
  query: string,
  startTag = '<mark>',
  endTag = '</mark>'
): string {
  const queryWords = sanitizeSearchQuery(query)
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2)

  if (queryWords.length === 0) {
    return content
  }

  let highlighted = content

  queryWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    highlighted = highlighted.replace(regex, `${startTag}$&${endTag}`)
  })

  return highlighted
}
