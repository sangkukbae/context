// Core API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface ApiError {
  error: string
  message: string
  timestamp: string
  statusCode?: number
}

// User Types
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile extends User {
  preferences: UserPreferences
  subscription?: UserSubscription
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  autoSave: boolean
  notifications: boolean
  clusterSuggestions: boolean
}

export interface UserSubscription {
  plan: 'free' | 'pro' | 'team'
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd: Date
}

// Re-export note types from dedicated module
export type {
  Note,
  NoteDTO,
  NoteMetadata,
  NoteEditEntry,
  NotePreview,
  NoteSummary,
  DeletedNote,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteResponse,
  NoteListResponse,
  NoteFilter,
  NoteSortOptions,
  NoteQuery,
  NoteSearchQuery,
  BulkNoteOperation,
  BulkNoteOperationResult,
  NoteStats,
  NoteAnalytics,
  NoteActivity,
  NoteComponentProps,
  NoteFormState,
  NoteLoadingState,
  NoteOptimisticUpdate,
  SearchableNoteFields,
  SortableNoteFields,
  CalculatedMetadataFields,
  UserDefinedMetadataFields,
} from './note'

export { isDeletedNote, hasEmbedding, isClustered, toNotePreview, toNoteDTO } from './note'

// Cluster Types
export interface Cluster {
  id: string
  title: string
  description?: string
  userId: string
  notes: import('./note').Note[]
  createdAt: Date
  updatedAt: Date
  metadata: ClusterMetadata
}

export interface ClusterMetadata {
  confidence: number
  noteCount: number
  totalWords: number
  themes: string[]
  suggestedAt?: Date
  acceptedAt?: Date
  dismissedAt?: Date
}

export interface ClusterSuggestion {
  id: string
  clusterId: string
  title: string
  description: string
  notes: import('./note').Note[]
  confidence: number
  themes: string[]
  createdAt: Date
}

// Document Types
export interface Document {
  id: string
  title: string
  content: string
  userId: string
  clusterId?: string
  status: DocumentStatus
  createdAt: Date
  updatedAt: Date
  metadata: DocumentMetadata
}

export type DocumentStatus = 'draft' | 'published' | 'archived'

export interface DocumentMetadata {
  wordCount: number
  readingTime: number
  tags: string[]
  version: number
  shareSettings?: ShareSettings
}

export interface ShareSettings {
  isPublic: boolean
  shareId?: string
  allowComments: boolean
  expiresAt?: Date
  password?: string
}

// Search Types
export interface SearchQuery {
  query: string
  filters?: SearchFilters
  limit?: number
  offset?: number
}

export interface SearchFilters {
  dateRange?: {
    from: Date
    to: Date
  }
  tags?: string[]
  type?: 'notes' | 'documents' | 'all'
  clusterId?: string
}

export interface SearchResult {
  id: string
  type: 'note' | 'document'
  title: string
  content: string
  snippet: string
  relevance: number
  createdAt: Date
  metadata: Record<string, unknown>
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  took: number
}

// AI Types
export interface EmbeddingRequest {
  text: string
  model?: string
}

export interface EmbeddingResponse {
  embedding: number[]
  tokens: number
}

export interface ClusteringRequest {
  noteIds: string[]
  threshold?: number
}

export interface DocumentGenerationRequest {
  clusterId: string
  title?: string
  style?: 'formal' | 'casual' | 'academic'
  length?: 'short' | 'medium' | 'long'
}

// WebSocket Types
export interface WebSocketMessage<T = unknown> {
  type: string
  data: T
  timestamp: Date
  userId?: string
}

export interface NoteUpdateMessage {
  type: 'note:update' | 'note:create' | 'note:delete'
  noteId: string
  note?: import('./note').Note
}

export interface ClusterUpdateMessage {
  type: 'cluster:suggestion' | 'cluster:update'
  clusterId: string
  cluster?: Cluster
}

// Pagination Types
export interface PaginationRequest {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Form Types
export interface FormFieldError {
  field: string
  message: string
}

export interface FormValidationResult {
  isValid: boolean
  errors: FormFieldError[]
}

// Session Types
export interface Session {
  user: User
  expires: Date
}

export interface AuthRequest {
  email: string
  password?: string
  provider?: 'google' | 'github' | 'apple'
}

export interface AuthResponse {
  user: User
  session: Session
  accessToken: string
  refreshToken?: string
}

// Re-export database and API types
export * from './database'
export * from './supabase'

// Export all types for easy importing
export type {
  // Re-export commonly used types
  ApiResponse as API,
  User as UserType,
  Cluster as ClusterType,
  Document as DocumentType,
}
