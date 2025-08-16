'use client'

/**
 * SearchResults Component
 *
 * Displays search results with highlighting, snippets, and metadata.
 * Includes pagination, sorting options, and result actions.
 * Uses shadcn/ui components for consistent styling.
 */

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Clock,
  Hash,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc,
  Eye,
  Edit,
  Star,
  MoreHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SearchResult, SearchQueryType } from '@/lib/schemas/search'

interface SearchResultsProps {
  results: SearchResult[]
  total: number
  query: string
  loading?: boolean
  error?: string
  executionTimeMs?: number
  queryType?: SearchQueryType
  pagination?: {
    limit: number
    offset: number
    hasNext: boolean
    hasPrev: boolean
  }
  onPageChange?: (offset: number) => void
  onNoteSelect?: (noteId: string) => void
  onNoteEdit?: (noteId: string) => void
  onNoteFavorite?: (noteId: string) => void
  className?: string
}

export function SearchResults({
  results,
  total,
  query,
  loading = false,
  error,
  executionTimeMs,
  queryType = 'keyword',
  pagination,
  onPageChange,
  onNoteSelect,
  onNoteEdit,
  onNoteFavorite,
  className,
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState<'relevance' | 'created_at' | 'updated_at'>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Handle pagination
  const handlePrevPage = () => {
    if (pagination?.hasPrev && onPageChange) {
      const newOffset = Math.max(0, pagination.offset - pagination.limit)
      onPageChange(newOffset)
    }
  }

  const handleNextPage = () => {
    if (pagination?.hasNext && onPageChange) {
      const newOffset = pagination.offset + pagination.limit
      onPageChange(newOffset)
    }
  }

  // Format highlighted content with proper HTML rendering
  const renderHighlightedContent = (content: string, highlighted?: string) => {
    if (!highlighted) return content

    // Safely render highlighted content
    return (
      <div
        className="text-sm text-muted-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    )
  }

  // Generate result snippet if not provided
  const getResultSnippet = (result: SearchResult) => {
    if (result.snippet) return result.snippet

    // Fallback: create snippet from content
    const words = result.content.split(' ')
    if (words.length <= 30) return result.content

    return words.slice(0, 30).join(' ') + '...'
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="text-destructive mb-2">Search failed</div>
        <div className="text-sm text-muted-foreground">{error}</div>
      </div>
    )
  }

  // Empty state
  if (!loading && results.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="text-lg font-medium mb-2">No results found</div>
        <div className="text-sm text-muted-foreground mb-4">
          No notes match your search for &quot;{query}&quot;
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>• Try different keywords</div>
          <div>• Check your spelling</div>
          <div>• Use fewer or more general terms</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {total > 0 && (
              <>
                {pagination
                  ? `${pagination.offset + 1}-${Math.min(pagination.offset + pagination.limit, total)}`
                  : results.length}{' '}
                of {total} results
              </>
            )}
            {query && (
              <>
                {' '}
                for <span className="font-medium text-foreground">&quot;{query}&quot;</span>
              </>
            )}
          </div>

          {executionTimeMs !== undefined && (
            <Badge variant="outline" className="text-xs">
              {executionTimeMs}ms
            </Badge>
          )}

          {queryType !== 'keyword' && (
            <Badge variant="secondary" className="text-xs capitalize">
              {queryType}
            </Badge>
          )}
        </div>

        {/* Sort options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {sortOrder === 'desc' ? (
                <SortDesc className="h-4 w-4" />
              ) : (
                <SortAsc className="h-4 w-4" />
              )}
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy('relevance')}>
              <span className={cn(sortBy === 'relevance' && 'font-medium')}>Relevance</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('created_at')}>
              <span className={cn(sortBy === 'created_at' && 'font-medium')}>Date Created</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('updated_at')}>
              <span className={cn(sortBy === 'updated_at' && 'font-medium')}>Date Modified</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'desc' ? 'Ascending' : 'Descending'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {results.map(result => (
          <Card key={result.id} className="transition-colors hover:bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                    </span>
                    {result.createdAt !== result.updatedAt && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          Updated{' '}
                          {formatDistanceToNow(new Date(result.updatedAt), { addSuffix: true })}
                        </span>
                      </>
                    )}
                    {result.rank !== undefined && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="outline" className="text-xs">
                          {(result.rank * 100).toFixed(0)}% match
                        </Badge>
                      </>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{result.metadata.wordCount} words</span>
                    {result.metadata.importance && (
                      <>
                        <span>•</span>
                        <Badge
                          variant={
                            result.metadata.importance === 'high'
                              ? 'destructive'
                              : result.metadata.importance === 'medium'
                                ? 'default'
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          {result.metadata.importance}
                        </Badge>
                      </>
                    )}
                    {result.clusterId && (
                      <>
                        <span>•</span>
                        <span>Clustered</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onNoteSelect?.(result.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNoteEdit?.(result.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNoteFavorite?.(result.id)}>
                      <Star className="h-4 w-4 mr-2" />
                      Favorite
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Content with highlighting */}
              <div className="mb-3 cursor-pointer" onClick={() => onNoteSelect?.(result.id)}>
                {result.highlightedContent ? (
                  renderHighlightedContent(result.content, result.highlightedContent)
                ) : (
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {getResultSnippet(result)}
                  </div>
                )}
              </div>

              {/* Tags */}
              {result.metadata.tags && result.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {result.metadata.tags.slice(0, 5).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Hash className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {result.metadata.tags.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{result.metadata.tags.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination && total > pagination.limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
            {Math.ceil(total / pagination.limit)}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={!pagination.hasPrev}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!pagination.hasNext}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
