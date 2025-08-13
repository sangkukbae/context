/**
 * Comprehensive Note Type Definitions
 *
 * This module provides type-safe definitions for the Note data model,
 * including core entities, DTOs, API types, and utility types.
 * Follows the unified Next.js + Hono.js architecture pattern.
 */

// ============================================================================
// CORE NOTE ENTITY TYPES
// ============================================================================

/**
 * Base note metadata interface - stored as JSON in database
 * Extensible for future AI features and analytics
 */
export interface NoteMetadata {
  /** Number of words in note content */
  readonly wordCount: number
  /** Number of characters in note content */
  readonly characterCount: number
  /** User-defined tags for categorization */
  tags: string[]
  /** Source of the note creation (e.g., 'web', 'mobile', 'api', 'import') */
  source?: string
  /** Schema version for metadata evolution */
  version?: number
  /** Edit history tracking for collaboration features */
  editHistory?: NoteEditEntry[]
  /** AI-derived importance level */
  importance?: 'low' | 'medium' | 'high'
  /** AI-derived sentiment analysis */
  sentiment?: 'positive' | 'neutral' | 'negative'
  /** AI-suggested categories */
  categories?: string[]
  /** Linked note IDs for knowledge graph */
  linkedNoteIds?: string[]
  /** Custom user-defined fields */
  custom?: Record<string, unknown>
}

/**
 * Edit history entry for tracking note modifications
 * Used for collaboration and version control features
 */
export interface NoteEditEntry {
  /** When the edit occurred */
  timestamp: Date
  /** Content length after edit */
  contentLength: number
  /** Whether tags were modified */
  tagsChanged: boolean
  /** Whether this was a significant content change */
  significantEdit: boolean
  /** Optional edit summary */
  summary?: string
}

/**
 * Core Note entity - matches database schema exactly
 * This is the canonical type for note data across the application
 */
export interface Note {
  /** Primary key - UUID */
  readonly id: string
  /** Note content in markdown format */
  content: string
  /** Owner user ID - foreign key to users table */
  readonly userId: string
  /** Optional cluster assignment - foreign key to clusters table */
  clusterId: string | null
  /** Record creation timestamp */
  readonly createdAt: Date
  /** Last modification timestamp */
  readonly updatedAt: Date
  /** Soft delete timestamp - null if not deleted */
  deletedAt: Date | null
  /** Rich metadata object */
  metadata: NoteMetadata
  /** Vector embedding for semantic search (pgvector) */
  embedding: number[] | null
  /** When embedding was last updated */
  embeddingUpdatedAt: Date | null
}

// ============================================================================
// NOTE DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

/**
 * Note DTO for API serialization - dates as ISO strings
 * Used for JSON responses to ensure consistent serialization
 */
export interface NoteDTO {
  readonly id: string
  content: string
  readonly userId: string
  clusterId: string | null
  readonly createdAt: string
  readonly updatedAt: string
  deletedAt: string | null
  metadata: NoteMetadata
  embedding: number[] | null
  embeddingUpdatedAt: string | null
}

/**
 * Compact note representation for lists and summaries
 * Optimized for minimal bandwidth and fast rendering
 */
export interface NotePreview {
  readonly id: string
  /** Truncated content (first 150 chars) */
  snippet: string
  readonly wordCount: number
  readonly characterCount: number
  tags: string[]
  readonly createdAt: Date
  readonly updatedAt: Date
  clusterId: string | null
  /** Whether note has embedding for semantic search */
  hasEmbedding: boolean
  /** Importance level if available */
  importance?: 'low' | 'medium' | 'high'
}

/**
 * Minimal note summary for analytics and statistics
 */
export interface NoteSummary {
  readonly id: string
  content: string
  readonly wordCount: number
  tags: string[]
  readonly createdAt: Date
  clusterId: string | null
}

/**
 * Soft-deleted note with recovery metadata
 */
export interface DeletedNote extends Note {
  /** Guaranteed to be set for deleted notes */
  deletedAt: Date
  /** Whether the note can still be recovered */
  canRecover: boolean
  /** When the note will be permanently deleted */
  permanentDeleteAt: Date
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request payload for creating a new note
 */
export interface CreateNoteRequest {
  /** Note content - required, 1-50000 characters */
  content: string
  /** Optional metadata - will be merged with calculated values */
  metadata?: Partial<Omit<NoteMetadata, 'wordCount' | 'characterCount' | 'version'>>
  /** Optional cluster assignment */
  clusterId?: string | null
  /** Source identifier for tracking */
  source?: string
}

/**
 * Request payload for updating an existing note
 */
export interface UpdateNoteRequest {
  /** New content - if provided, metadata will be recalculated */
  content?: string
  /** Metadata updates - merged with existing metadata */
  metadata?: Partial<Omit<NoteMetadata, 'wordCount' | 'characterCount' | 'version'>>
  /** Change cluster assignment */
  clusterId?: string | null
}

/**
 * Response for single note operations
 */
export interface NoteResponse {
  success: true
  data: NoteDTO
  timestamp: string
}

/**
 * Response for note list operations with pagination
 */
export interface NoteListResponse {
  success: true
  data: {
    notes: NoteDTO[]
    pagination: {
      limit: number
      total: number
      hasNext: boolean
      nextCursor?: string
    }
  }
  timestamp: string
}

// ============================================================================
// QUERY AND FILTER TYPES
// ============================================================================

/**
 * Comprehensive filtering options for note queries
 */
export interface NoteFilter {
  /** Owner user ID - always required for security */
  userId: string
  /** Filter by cluster assignment */
  clusterId?: string | null
  /** Filter by tags (AND operation) */
  tags?: string[]
  /** Full-text search query */
  search?: string
  /** Date range filtering */
  dateRange?: {
    from: Date
    to: Date
  }
  /** Filter by embedding availability */
  hasEmbedding?: boolean
  /** Filter by importance level */
  importance?: 'low' | 'medium' | 'high'
  /** Filter by sentiment */
  sentiment?: 'positive' | 'neutral' | 'negative'
  /** Filter by AI categories */
  categories?: string[]
  /** Include soft-deleted notes */
  includeDeleted?: boolean
  /** Filter by content length */
  wordCountRange?: {
    min?: number
    max?: number
  }
}

/**
 * Sorting options for note queries
 */
export interface NoteSortOptions {
  /** Field to sort by */
  sortBy: 'createdAt' | 'updatedAt' | 'wordCount' | 'relevance'
  /** Sort order */
  sortOrder: 'asc' | 'desc'
}

/**
 * Complete query interface with pagination, filtering, and sorting
 */
export interface NoteQuery {
  /** Pagination - limit per page (1-100) */
  limit?: number
  /** Cursor-based pagination - ID of last note from previous page */
  cursor?: string
  /** Filtering options */
  filter?: NoteFilter
  /** Sorting options */
  sort?: NoteSortOptions
}

/**
 * Semantic search query for AI-powered search
 */
export interface NoteSearchQuery {
  /** Search query text */
  query: string
  /** Owner user ID for security */
  userId: string
  /** Maximum results to return */
  limit?: number
  /** Include full metadata in results */
  includeMetadata?: boolean
  /** Use vector search instead of full-text search */
  semanticSearch?: boolean
  /** Additional filters to apply */
  filters?: Omit<NoteFilter, 'search' | 'userId'>
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk operation request for multiple notes
 */
export interface BulkNoteOperation {
  /** Note IDs to operate on (max 50) */
  noteIds: string[]
  /** Operation type */
  operation: 'delete' | 'tag' | 'cluster' | 'recover' | 'uncluster'
  /** Operation-specific parameters */
  params?: {
    /** For 'tag' operation */
    tags?: string[]
    /** For 'cluster' operation */
    clusterId?: string
    /** For 'delete' operation */
    permanent?: boolean
  }
}

/**
 * Bulk operation result
 */
export interface BulkNoteOperationResult {
  /** Number of notes successfully processed */
  successful: number
  /** Number of notes that failed processing */
  failed: number
  /** IDs of successfully processed notes */
  successfulIds: string[]
  /** Failed operations with error details */
  failures: Array<{
    noteId: string
    error: string
  }>
}

// ============================================================================
// STATISTICS AND ANALYTICS
// ============================================================================

/**
 * User note statistics for dashboard
 */
export interface NoteStats {
  /** Total number of notes (excluding deleted) */
  totalNotes: number
  /** Total word count across all notes */
  totalWords: number
  /** Total character count across all notes */
  totalCharacters: number
  /** Average words per note */
  averageWordsPerNote: number
  /** Notes created this month */
  notesThisMonth: number
  /** Notes created this week */
  notesThisWeek: number
  /** Notes created today */
  notesToday: number
  /** Most frequently used tags */
  topTags: Array<{
    tag: string
    count: number
  }>
  /** Number of notes in clusters */
  clusteredNotes: number
  /** Number of unclustered notes */
  unclusteredNotes: number
  /** Number of notes with AI embeddings */
  embeddedNotes: number
  /** Soft-deleted notes count */
  deletedNotes: number
}

/**
 * Time-series data for note creation analytics
 */
export interface NoteAnalytics {
  /** Time period for analytics */
  period: 'day' | 'week' | 'month' | 'year'
  /** Data points for the period */
  data: Array<{
    date: string
    noteCount: number
    wordCount: number
    avgWordsPerNote: number
  }>
  /** Summary statistics */
  summary: {
    totalNotes: number
    totalWords: number
    averageDaily: number
    peakDay: {
      date: string
      count: number
    }
  }
}

// ============================================================================
// ACTIVITY AND AUDIT LOGGING
// ============================================================================

/**
 * Activity log entry for note operations
 * Used for audit trails and user activity tracking
 */
export interface NoteActivity {
  /** Activity ID */
  readonly id: string
  /** User who performed the action */
  readonly userId: string
  /** Type of action performed */
  action:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'recovered'
    | 'clustered'
    | 'unclustered'
    | 'tagged'
    | 'embedded'
  /** Note that was affected */
  noteId: string
  /** Additional metadata about the action */
  metadata?: {
    /** Changes made (for updates) */
    changes?: Partial<Note>
    /** Previous values (for updates) */
    previousValues?: Partial<Note>
    /** Source of the action */
    source?: string
    /** Bulk operation ID if part of bulk action */
    bulkOperationId?: string
  }
  /** IP address of the request */
  ipAddress?: string
  /** User agent string */
  userAgent?: string
  /** When the activity occurred */
  readonly createdAt: Date
}

// ============================================================================
// FRONTEND-SPECIFIC TYPES
// ============================================================================

/**
 * Note component props for React components
 */
export interface NoteComponentProps {
  /** Note data to display */
  note: Note | NoteDTO
  /** Whether the note is in edit mode */
  isEditing?: boolean
  /** Whether the note is selected (for bulk operations) */
  isSelected?: boolean
  /** Callback for content changes */
  onContentChange?: (content: string) => void
  /** Callback for metadata changes */
  onMetadataChange?: (metadata: Partial<NoteMetadata>) => void
  /** Callback for note selection */
  onSelectionChange?: (selected: boolean) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Form state for note editing
 */
export interface NoteFormState {
  /** Current content */
  content: string
  /** Current metadata */
  metadata: Partial<NoteMetadata>
  /** Whether the form has unsaved changes */
  isDirty: boolean
  /** Whether a save operation is in progress */
  isSaving: boolean
  /** Form validation errors */
  errors: Record<string, string>
  /** Whether the form is valid */
  isValid: boolean
}

/**
 * Loading states for note operations
 */
export interface NoteLoadingState {
  /** Whether notes are being loaded */
  isLoading: boolean
  /** Whether a create operation is in progress */
  isCreating: boolean
  /** Whether an update operation is in progress */
  isUpdating: boolean
  /** Whether a delete operation is in progress */
  isDeleting: boolean
  /** Whether a bulk operation is in progress */
  isBulkOperating: boolean
  /** Error message if any operation failed */
  error: string | null
}

/**
 * Optimistic update data for immediate UI feedback
 */
export interface NoteOptimisticUpdate {
  /** Temporary ID for the update */
  tempId: string
  /** Type of operation */
  operation: 'create' | 'update' | 'delete'
  /** Note data (for create/update) */
  note?: Partial<Note>
  /** Original note data (for rollback) */
  original?: Note
  /** When the optimistic update was created */
  timestamp: Date
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type for note fields that can be indexed for search
 */
export type SearchableNoteFields = 'content' | 'tags' | 'categories'

/**
 * Type for note fields that can be sorted
 */
export type SortableNoteFields = 'createdAt' | 'updatedAt' | 'wordCount' | 'characterCount'

/**
 * Type for note metadata fields that are calculated automatically
 */
export type CalculatedMetadataFields = 'wordCount' | 'characterCount' | 'version'

/**
 * Type for note metadata fields that can be set by users
 */
export type UserDefinedMetadataFields = Omit<NoteMetadata, CalculatedMetadataFields>

/**
 * Type guard to check if a note is deleted
 */
export function isDeletedNote(note: Note): note is DeletedNote {
  return note.deletedAt !== null
}

/**
 * Type guard to check if a note has an embedding
 */
export function hasEmbedding(note: Note): note is Note & { embedding: number[] } {
  return note.embedding !== null && note.embedding.length > 0
}

/**
 * Type guard to check if a note is clustered
 */
export function isClustered(note: Note): note is Note & { clusterId: string } {
  return note.clusterId !== null
}

/**
 * Extract note preview from full note data
 */
export function toNotePreview(note: Note, snippetLength = 150): NotePreview {
  return {
    id: note.id,
    snippet:
      note.content.length > snippetLength
        ? note.content.substring(0, snippetLength) + '...'
        : note.content,
    wordCount: note.metadata.wordCount,
    characterCount: note.metadata.characterCount,
    tags: note.metadata.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    clusterId: note.clusterId,
    hasEmbedding: note.embedding !== null,
    importance: note.metadata.importance,
  }
}

/**
 * Convert Note to NoteDTO for API responses
 */
export function toNoteDTO(note: Note): NoteDTO {
  return {
    id: note.id,
    content: note.content,
    userId: note.userId,
    clusterId: note.clusterId,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    deletedAt: note.deletedAt?.toISOString() || null,
    metadata: note.metadata,
    embedding: note.embedding,
    embeddingUpdatedAt: note.embeddingUpdatedAt?.toISOString() || null,
  }
}
