// Database Schema Types
// These types represent the actual database structure for Prisma/Drizzle ORM

export interface UserSchema {
  id: string
  email: string
  name: string | null
  avatar: string | null
  emailVerified: Date | null
  createdAt: Date
  updatedAt: Date

  // Preferences stored as JSON
  preferences: {
    theme: 'light' | 'dark' | 'system'
    autoSave: boolean
    notifications: boolean
    clusterSuggestions: boolean
  }

  // Subscription info
  subscriptionPlan: 'free' | 'pro' | 'team'
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | null
  subscriptionCurrentPeriodEnd: Date | null
}

export interface NoteSchema {
  id: string
  content: string
  userId: string
  clusterId: string | null
  createdAt: Date
  updatedAt: Date

  // Metadata stored as JSON
  metadata: {
    wordCount: number
    characterCount: number
    tags: string[]
    source?: string
  }

  // Vector embedding for semantic search
  embedding: number[] | null
  embeddingUpdatedAt: Date | null
}

export interface ClusterSchema {
  id: string
  title: string
  description: string | null
  userId: string
  createdAt: Date
  updatedAt: Date

  // Cluster metadata
  confidence: number
  noteCount: number
  totalWords: number
  themes: string[] // stored as JSON array

  // Suggestion lifecycle
  suggestedAt: Date | null
  acceptedAt: Date | null
  dismissedAt: Date | null

  // Status tracking
  status: 'suggested' | 'accepted' | 'dismissed'
}

export interface DocumentSchema {
  id: string
  title: string
  content: string
  userId: string
  clusterId: string | null
  status: 'draft' | 'published' | 'archived'
  createdAt: Date
  updatedAt: Date

  // Document metadata
  wordCount: number
  readingTime: number
  tags: string[] // stored as JSON array
  version: number

  // Sharing configuration
  isPublic: boolean
  shareId: string | null
  allowComments: boolean
  shareExpiresAt: Date | null
  sharePassword: string | null // hashed
}

export interface SessionSchema {
  id: string
  sessionToken: string
  userId: string
  expires: Date
  createdAt: Date
  updatedAt: Date
}

export interface AccountSchema {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token: string | null
  access_token: string | null
  expires_at: number | null
  token_type: string | null
  scope: string | null
  id_token: string | null
  session_state: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VerificationTokenSchema {
  identifier: string
  token: string
  expires: Date
}

// Search index schema for full-text search
export interface SearchIndexSchema {
  id: string
  entityId: string // noteId or documentId
  entityType: 'note' | 'document'
  userId: string
  content: string
  title: string | null
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

// Activity log for user actions
export interface ActivityLogSchema {
  id: string
  userId: string
  action: string
  entityType: 'note' | 'cluster' | 'document' | 'user'
  entityId: string | null
  metadata: Record<string, unknown> // JSON field
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

// AI processing jobs queue
export interface JobQueueSchema {
  id: string
  type: 'embedding' | 'clustering' | 'document_generation'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  payload: Record<string, unknown> // JSON field
  result: Record<string, unknown> | null // JSON field
  error: string | null
  attempts: number
  maxAttempts: number
  createdAt: Date
  updatedAt: Date
  scheduledFor: Date | null
}

// Rate limiting storage
export interface RateLimitSchema {
  id: string
  key: string // user:action or ip:action
  count: number
  windowStart: Date
  expiresAt: Date
}

// Embeddings cache
export interface EmbeddingCacheSchema {
  id: string
  textHash: string // SHA-256 hash of the text
  embedding: number[]
  model: string
  createdAt: Date
  expiresAt: Date | null
}

// Database relationship types
export interface UserRelations {
  notes: NoteSchema[]
  clusters: ClusterSchema[]
  documents: DocumentSchema[]
  sessions: SessionSchema[]
  accounts: AccountSchema[]
  activityLogs: ActivityLogSchema[]
}

export interface NoteRelations {
  user: UserSchema
  cluster?: ClusterSchema
}

export interface ClusterRelations {
  user: UserSchema
  notes: NoteSchema[]
  documents: DocumentSchema[]
}

export interface DocumentRelations {
  user: UserSchema
  cluster?: ClusterSchema
}

// Query types for complex database operations
export interface NoteQueryFilters {
  userId: string
  clusterId?: string
  dateRange?: {
    from: Date
    to: Date
  }
  tags?: string[]
  search?: string
}

export interface ClusterQueryFilters {
  userId: string
  status?: 'suggested' | 'accepted' | 'dismissed'
  confidence?: {
    min: number
    max: number
  }
}

export interface DocumentQueryFilters {
  userId: string
  status?: 'draft' | 'published' | 'archived'
  clusterId?: string
  isPublic?: boolean
}

// Aggregation result types
export interface UserStatsResult {
  totalNotes: number
  totalDocuments: number
  totalClusters: number
  acceptedClusters: number
  totalWords: number
  averageWordsPerNote: number
  joinedDaysAgo: number
}

export interface ClusterAnalytics {
  totalSuggested: number
  totalAccepted: number
  totalDismissed: number
  acceptanceRate: number
  averageConfidence: number
  averageNotesPerCluster: number
}

export interface SearchAnalytics {
  totalSearches: number
  averageResults: number
  popularQueries: Array<{
    query: string
    count: number
  }>
}

// Migration helpers
export interface DatabaseMigration {
  version: string
  name: string
  up: string
  down: string
  appliedAt: Date | null
}

// Index definitions for optimal query performance
export interface DatabaseIndex {
  tableName: string
  indexName: string
  columns: string[]
  unique?: boolean
  where?: string
}

// Common database indexes we need
export const REQUIRED_INDEXES: DatabaseIndex[] = [
  {
    tableName: 'notes',
    indexName: 'idx_notes_user_created',
    columns: ['userId', 'createdAt'],
  },
  {
    tableName: 'notes',
    indexName: 'idx_notes_cluster',
    columns: ['clusterId'],
  },
  {
    tableName: 'clusters',
    indexName: 'idx_clusters_user_status',
    columns: ['userId', 'status'],
  },
  {
    tableName: 'documents',
    indexName: 'idx_documents_user_status',
    columns: ['userId', 'status'],
  },
  {
    tableName: 'documents',
    indexName: 'idx_documents_share_id',
    columns: ['shareId'],
    unique: true,
    where: 'shareId IS NOT NULL',
  },
  {
    tableName: 'search_index',
    indexName: 'idx_search_user_type',
    columns: ['userId', 'entityType'],
  },
  {
    tableName: 'activity_logs',
    indexName: 'idx_activity_user_created',
    columns: ['userId', 'createdAt'],
  },
  {
    tableName: 'job_queue',
    indexName: 'idx_jobs_status_scheduled',
    columns: ['status', 'scheduledFor'],
  },
]
