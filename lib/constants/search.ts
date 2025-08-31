/**
 * Search Configuration Constants
 *
 * Centralized configuration for search functionality including
 * performance thresholds, cache settings, and other search-related constants.
 */

// ============================================================================
// PERFORMANCE THRESHOLDS
// ============================================================================

/** Performance threshold for fast queries (ms) */
export const PERFORMANCE_THRESHOLD_FAST = 200

/** Performance threshold for good queries (ms) */
export const PERFORMANCE_THRESHOLD_GOOD = 1000

/** Performance threshold for slow queries (anything above this is considered slow) (ms) */
export const PERFORMANCE_THRESHOLD_SLOW = 1000

// ============================================================================
// CACHE SETTINGS
// ============================================================================

/** Default cache TTL for search results (minutes) */
export const DEFAULT_CACHE_TTL_MINUTES = 60

/** Cache TTL for frequently accessed queries (minutes) */
export const FREQUENT_QUERY_CACHE_TTL_MINUTES = 120

/** Cache TTL for expensive semantic search results (minutes) */
export const SEMANTIC_SEARCH_CACHE_TTL_MINUTES = 180

// ============================================================================
// SEARCH LIMITS
// ============================================================================

/** Default search results limit */
export const DEFAULT_SEARCH_LIMIT = 20

/** Maximum search results limit */
export const MAX_SEARCH_LIMIT = 100

/** Default search suggestions limit */
export const DEFAULT_SUGGESTIONS_LIMIT = 5

/** Maximum search suggestions limit */
export const MAX_SUGGESTIONS_LIMIT = 20

// ============================================================================
// SEARCH VALIDATION
// ============================================================================

/** Minimum query length for search */
export const MIN_QUERY_LENGTH = 1

/** Maximum query length for search */
export const MAX_QUERY_LENGTH = 500

/** Minimum query length for suggestions */
export const MIN_SUGGESTION_QUERY_LENGTH = 2

// ============================================================================
// ANALYTICS SETTINGS
// ============================================================================

/** Number of days to keep search analytics data */
export const ANALYTICS_RETENTION_DAYS = 90

/** Batch size for analytics processing */
export const ANALYTICS_BATCH_SIZE = 1000
