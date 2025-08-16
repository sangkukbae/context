'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  Hash,
  Calendar,
  Link,
  Brain,
  Star,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { NoteDTO, NoteOptimisticUpdate } from '@/lib/types/note'
import { generateNoteSnippet } from '@/lib/schemas/note'

// Re-export the proper types
export type { NoteDTO as Note } from '@/lib/types/note'

interface NoteFeedProps {
  notes: NoteDTO[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => Promise<void>
  onEditNote?: (note: NoteDTO) => void
  onDeleteNote?: (noteId: string) => void
  onToggleFavorite?: (noteId: string) => void
  onViewCluster?: (clusterId: string) => void
  optimisticUpdates?: NoteOptimisticUpdate[]
  className?: string
}

interface NoteItemProps {
  note: NoteDTO
  onEdit?: (note: NoteDTO) => void
  onDelete?: (noteId: string) => void
  onToggleFavorite?: (noteId: string) => void
  onViewCluster?: (clusterId: string) => void
  isOptimistic?: boolean
}

function NoteItem({
  note,
  onEdit,
  onDelete,
  onToggleFavorite,
  onViewCluster,
  isOptimistic = false,
}: NoteItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const { content, createdAt, updatedAt, metadata, clusterId } = note
  const isLongContent = content.length > 280
  const displayContent = isExpanded ? content : generateNoteSnippet(content, 280)
  const shouldShowExpand = isLongContent && !isExpanded
  const shouldShowCollapse = isLongContent && isExpanded

  const createdDate = new Date(createdAt)
  const updatedDate = new Date(updatedAt)
  const wasUpdated = updatedDate.getTime() !== createdDate.getTime()
  const isImportant = metadata.importance === 'high'
  const hasLinkedNotes = metadata.linkedNoteIds && metadata.linkedNoteIds.length > 0
  const hasCategories = metadata.categories && metadata.categories.length > 0

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-sm transition-all duration-200',
        isOptimistic && 'opacity-60 animate-pulse',
        isImportant && 'border-l-4 border-l-yellow-500'
      )}
    >
      <div className="space-y-3">
        {/* Header with timestamp and actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span title={format(createdDate, 'PPpp')}>
              {formatDistanceToNow(createdDate, { addSuffix: true })}
            </span>
            {wasUpdated && (
              <>
                <span>•</span>
                <span title={`Updated ${format(updatedDate, 'PPpp')}`}>edited</span>
              </>
            )}
            {isImportant && (
              <>
                <span>•</span>
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              </>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              <DropdownMenuItem onClick={() => onEdit?.(note)} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {onToggleFavorite && (
                <DropdownMenuItem
                  onClick={() => onToggleFavorite(note.id)}
                  className="cursor-pointer"
                >
                  <Star className="w-4 h-4 mr-2" />
                  {isImportant ? 'Remove from favorites' : 'Add to favorites'}
                </DropdownMenuItem>
              )}
              {hasLinkedNotes && (
                <DropdownMenuItem className="cursor-pointer">
                  <Link className="w-4 h-4 mr-2" />
                  View linked notes ({metadata.linkedNoteIds!.length})
                </DropdownMenuItem>
              )}
              {clusterId && onViewCluster && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onViewCluster(clusterId)}
                    className="cursor-pointer"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    View cluster
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(note.id)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {isExpanded ? content : displayContent}
            {shouldShowExpand && (
              <button
                onClick={() => setIsExpanded(true)}
                className="ml-2 text-accent hover:text-accent/80 text-sm font-medium inline-flex items-center gap-1 transition-colors"
              >
                Show more
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            {shouldShowCollapse && (
              <button
                onClick={() => setIsExpanded(false)}
                className="ml-2 text-accent hover:text-accent/80 text-sm font-medium block mt-2 transition-colors"
              >
                Show less
              </button>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {metadata.wordCount.toLocaleString()} words •{' '}
              {metadata.characterCount.toLocaleString()} chars
            </div>

            {metadata.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {metadata.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {metadata.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{metadata.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {hasCategories && (
              <div className="flex items-center gap-1 flex-wrap">
                {metadata.categories!.slice(0, 2).map(category => (
                  <Badge
                    key={category}
                    variant="outline"
                    className="text-xs bg-accent/10 text-accent"
                  >
                    {category}
                  </Badge>
                ))}
                {metadata.categories!.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{metadata.categories!.length - 2} categories
                  </Badge>
                )}
              </div>
            )}

            {clusterId && (
              <Badge
                variant="outline"
                className="text-xs bg-secondary/50 text-secondary-foreground"
              >
                <Brain className="w-3 h-3 mr-1" />
                Clustered
              </Badge>
            )}

            {metadata.sentiment && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  metadata.sentiment === 'positive' &&
                    'bg-green-500/10 text-green-700 dark:text-green-400',
                  metadata.sentiment === 'negative' && 'bg-destructive/10 text-destructive',
                  metadata.sentiment === 'neutral' && 'bg-muted text-muted-foreground'
                )}
              >
                {metadata.sentiment}
              </Badge>
            )}

            {hasLinkedNotes && (
              <Badge variant="outline" className="text-xs">
                <Link className="w-3 h-3 mr-1" />
                {metadata.linkedNoteIds!.length} linked
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function NoteItemSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </Card>
  )
}

export function NoteFeed({
  notes,
  loading = false,
  hasMore = false,
  onLoadMore,
  onEditNote,
  onDeleteNote,
  onToggleFavorite,
  onViewCluster,
  optimisticUpdates = [],
  className,
}: NoteFeedProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !onLoadMore) return

    setIsLoadingMore(true)
    try {
      await onLoadMore()
    } catch (error) {
      console.error('Failed to load more notes:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, onLoadMore])

  // Auto-load more when scrolling near bottom
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || isLoadingMore) return

      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 1000

      if (isNearBottom) {
        handleLoadMore()
      }
    },
    [hasMore, isLoadingMore, handleLoadMore]
  )

  const sortedNotes = useMemo(() => {
    return [...notes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [notes])

  // Merge optimistic updates with actual notes
  const notesWithOptimistic = useMemo(() => {
    const optimisticNotes: NoteDTO[] = optimisticUpdates
      .filter(update => update.operation === 'create' && update.note)
      .map(
        update =>
          ({
            ...update.note!,
            id: update.tempId,
            createdAt: update.timestamp.toISOString(),
            updatedAt: update.timestamp.toISOString(),
          }) as NoteDTO
      )

    return [...optimisticNotes, ...sortedNotes]
  }, [sortedNotes, optimisticUpdates])

  if (loading && notes.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <NoteItemSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (notes.length === 0 && !loading && optimisticUpdates.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <div className="space-y-4">
          <div className="text-4xl">📝</div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">No notes yet</h3>
            <p className="text-muted-foreground">
              Start capturing your thoughts above. Every great idea begins with a single note.
            </p>
            <div className="text-xs text-muted-foreground mt-4">
              Tips: Use ⌘+Enter to quickly save notes, and add #tags for organization
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <ScrollArea className={cn('h-[600px] w-full', className)} onScroll={handleScroll}>
      <div className="space-y-4 pr-4">
        {notesWithOptimistic.map(note => {
          const isOptimistic = optimisticUpdates.some(update => update.tempId === note.id)
          return (
            <NoteItem
              key={note.id}
              note={note}
              onEdit={onEditNote}
              onDelete={onDeleteNote}
              onToggleFavorite={onToggleFavorite}
              onViewCluster={onViewCluster}
              isOptimistic={isOptimistic}
            />
          )
        })}

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <NoteItemSkeleton key={`loading-${i}`} />
            ))}
          </div>
        )}

        {/* Load more button for manual loading */}
        {hasMore && !isLoadingMore && (
          <div className="pt-4 text-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load More Notes'}
            </Button>
          </div>
        )}

        {/* End of notes indicator */}
        {!hasMore && notes.length > 0 && (
          <div className="pt-8 pb-4 text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Calendar className="w-4 h-4" />
              <div>You&apos;ve reached the beginning of your notes</div>
              <div className="text-xs">Total: {notes.length.toLocaleString()} notes</div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
