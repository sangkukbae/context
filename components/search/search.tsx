'use client'

/**
 * Search Component
 *
 * Main search interface that combines SearchInput, SearchFilters, and SearchResults.
 * Manages search state, API calls, and user interactions.
 * Provides a complete search experience with caching and performance optimization.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Search as SearchIcon, Zap, Clock } from 'lucide-react'
import { SearchInput } from './search-input'
import { SearchResults } from './search-results'
import { SearchFilters } from './search-filters'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type {
  SearchResult,
  SearchFilters as SearchFiltersType,
  SearchQueryType,
  SearchResponse,
} from '@/lib/schemas/search'

interface SearchProps {
  initialQuery?: string
  initialFilters?: SearchFiltersType
  onNoteSelect?: (noteId: string) => void
  onNoteEdit?: (noteId: string) => void
  className?: string
}

interface SearchState {
  query: string
  filters: SearchFiltersType
  results: SearchResult[]
  total: number
  loading: boolean
  error: string | null
  executionTimeMs?: number
  queryType: SearchQueryType
  pagination: {
    limit: number
    offset: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function Search({
  initialQuery = '',
  initialFilters = {},
  onNoteSelect,
  onNoteEdit,
  className,
}: SearchProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [searchState, setSearchState] = useState<SearchState>({
    query: initialQuery,
    filters: initialFilters,
    results: [],
    total: 0,
    loading: false,
    error: null,
    queryType: 'keyword',
    pagination: {
      limit: 20,
      offset: 0,
      hasNext: false,
      hasPrev: false,
    },
  })

  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Fetch available tags for filter suggestions
  useEffect(() => {
    fetchAvailableTags()
  }, [])

  const fetchAvailableTags = async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token')
      if (!token) return

      // This would be a separate API endpoint to get popular tags
      // For now, we'll use some mock data
      setAvailableTags([
        'ideas',
        'todo',
        'meeting',
        'project',
        'research',
        'personal',
        'work',
        'thoughts',
        'planning',
        'goals',
        'notes',
        'draft',
      ])
    } catch (error) {
      console.error('Failed to fetch available tags:', error)
    }
  }

  // Perform search API call
  const performSearch = useCallback(
    async (
      searchQuery: string,
      searchFilters: SearchFiltersType = {},
      queryType: SearchQueryType = 'keyword',
      offset: number = 0,
      limit: number = 20
    ) => {
      if (!searchQuery.trim()) {
        setSearchState(prev => ({
          ...prev,
          results: [],
          total: 0,
          loading: false,
          error: null,
        }))
        return
      }

      setSearchState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }))

      try {
        const token = localStorage.getItem('supabase.auth.token')
        if (!token) {
          throw new Error('Authentication required')
        }

        const searchRequest = {
          query: searchQuery,
          type: queryType,
          limit,
          offset,
          filters: searchFilters,
          includeSnippets: true,
          includeHighlighting: true,
        }

        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchRequest),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Search failed')
        }

        const data: SearchResponse = await response.json()

        if (data.success) {
          setSearchState(prev => ({
            ...prev,
            results: data.data.results,
            total: data.data.totalResults,
            loading: false,
            error: null,
            executionTimeMs: data.data.executionTimeMs,
            pagination: {
              limit: data.data.pagination.limit,
              offset: data.data.pagination.offset,
              hasNext: data.data.pagination.hasNext,
              hasPrev: data.data.pagination.hasPrev,
            },
          }))

          // Add to search history
          if (!searchHistory.includes(searchQuery)) {
            setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)])
          }
        } else {
          throw new Error('Search request failed')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Search failed'

        setSearchState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
          results: [],
          total: 0,
        }))

        toast({
          title: 'Search Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    },
    [searchHistory, toast]
  )

  // Handle search input
  const handleSearch = useCallback(
    (query: string, filters?: SearchFiltersType) => {
      const searchFilters = filters || searchState.filters

      setSearchState(prev => ({
        ...prev,
        query,
        filters: searchFilters,
        pagination: { ...prev.pagination, offset: 0 },
      }))

      performSearch(query, searchFilters, searchState.queryType)
    },
    [searchState.filters, searchState.queryType, performSearch]
  )

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (filters: SearchFiltersType) => {
      setSearchState(prev => ({
        ...prev,
        filters,
        pagination: { ...prev.pagination, offset: 0 },
      }))

      if (searchState.query.trim()) {
        performSearch(searchState.query, filters, searchState.queryType)
      }
    },
    [searchState.query, searchState.queryType, performSearch]
  )

  // Handle pagination
  const handlePageChange = useCallback(
    (offset: number) => {
      setSearchState(prev => ({
        ...prev,
        pagination: { ...prev.pagination, offset },
      }))

      performSearch(searchState.query, searchState.filters, searchState.queryType, offset)
    },
    [searchState.query, searchState.filters, searchState.queryType, performSearch]
  )

  // Handle query type change
  const handleQueryTypeChange = useCallback(
    (queryType: SearchQueryType) => {
      setSearchState(prev => ({
        ...prev,
        queryType,
        pagination: { ...prev.pagination, offset: 0 },
      }))

      if (searchState.query.trim()) {
        performSearch(searchState.query, searchState.filters, queryType)
      }
    },
    [searchState.query, searchState.filters, performSearch]
  )

  // Clear filters
  const handleClearFilters = useCallback(() => {
    const clearedFilters: SearchFiltersType = {}

    setSearchState(prev => ({
      ...prev,
      filters: clearedFilters,
      pagination: { ...prev.pagination, offset: 0 },
    }))

    if (searchState.query.trim()) {
      performSearch(searchState.query, clearedFilters, searchState.queryType)
    }
  }, [searchState.query, searchState.queryType, performSearch])

  // Handle note actions
  const handleNoteSelect = useCallback(
    (noteId: string) => {
      if (onNoteSelect) {
        onNoteSelect(noteId)
      } else {
        // Default behavior: navigate to note
        router.push(`/dashboard?note=${noteId}`)
      }
    },
    [onNoteSelect, router]
  )

  const handleNoteEdit = useCallback(
    (noteId: string) => {
      if (onNoteEdit) {
        onNoteEdit(noteId)
      } else {
        // Default behavior: navigate to note in edit mode
        router.push(`/dashboard?note=${noteId}&edit=true`)
      }
    },
    [onNoteEdit, router]
  )

  const handleNoteFavorite = useCallback(
    (_noteId: string) => {
      toast({
        title: 'Feature Coming Soon',
        description: 'Note favoriting will be available in a future update.',
      })
    },
    [toast]
  )

  // Performance indicator
  const getPerformanceIndicator = () => {
    if (!searchState.executionTimeMs) return null

    if (searchState.executionTimeMs < 200) {
      return (
        <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 gap-1">
          <Zap className="h-3 w-3" />
          Fast
        </Badge>
      )
    } else if (searchState.executionTimeMs < 1000) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Good
        </Badge>
      )
    } else {
      return (
        <Badge variant="destructive" className="gap-1">
          <Clock className="h-3 w-3" />
          Slow
        </Badge>
      )
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search Header */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            Search Notes
            {getPerformanceIndicator()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <SearchInput
            onSearch={handleSearch}
            initialValue={searchState.query}
            loading={searchState.loading}
            className="w-full"
          />

          {/* Search Controls */}
          <div className="flex items-center justify-between gap-4">
            {/* Query Type Tabs */}
            <Tabs
              value={searchState.queryType}
              onValueChange={value => handleQueryTypeChange(value as SearchQueryType)}
              className="flex-1"
            >
              <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                <TabsTrigger value="keyword">Keyword</TabsTrigger>
                <TabsTrigger value="semantic" disabled>
                  Semantic
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Soon
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="hybrid" disabled>
                  Hybrid
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Soon
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filters */}
            <SearchFilters
              filters={searchState.filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              availableTags={availableTags}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {searchState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{searchState.error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results */}
      <SearchResults
        results={searchState.results}
        total={searchState.total}
        query={searchState.query}
        loading={searchState.loading}
        error={searchState.error || undefined}
        executionTimeMs={searchState.executionTimeMs}
        queryType={searchState.queryType}
        pagination={searchState.pagination}
        onPageChange={handlePageChange}
        onNoteSelect={handleNoteSelect}
        onNoteEdit={handleNoteEdit}
        onNoteFavorite={handleNoteFavorite}
      />

      {/* Search Tips */}
      {!searchState.query && !searchState.loading && searchState.results.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium mb-2">Search Your Notes</h3>
                <p className="text-muted-foreground mb-4">
                  Find notes by content, tags, or metadata. Use filters for precise results.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Search Tips:</h4>
                    <ul className="space-y-1 text-left">
                      <li>• Use quotes for exact phrases</li>
                      <li>• Add tags with # or filters</li>
                      <li>• Search is case-insensitive</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Keyboard Shortcuts:</h4>
                    <ul className="space-y-1 text-left">
                      <li>
                        • <kbd className="px-1 py-0.5 bg-muted rounded">⌘K</kbd> Focus search
                      </li>
                      <li>
                        • <kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd> Navigate
                        suggestions
                      </li>
                      <li>
                        • <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Search
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
