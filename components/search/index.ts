/**
 * Search Components Export Index
 *
 * Exports all search-related components for easy importing.
 * Follows the existing pattern from other component directories.
 */

export { SearchInput } from './search-input'
export { SearchResults } from './search-results'
export { SearchFilters } from './search-filters'
export { Search } from './search'

// Re-export types for convenience
export type {
  SearchResult,
  SearchFilters as SearchFiltersType,
  SearchSuggestion,
  SearchQueryType,
  SearchRequest,
  SearchResponse,
} from '@/lib/schemas/search'
