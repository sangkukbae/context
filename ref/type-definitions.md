# Type Definitions Reference

This document provides comprehensive reference for TypeScript type definitions used throughout the Context application.

## Core Type System

### API Response Types

#### Generic API Response

```typescript
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}
```

#### API Error Response

```typescript
export interface ApiError {
  error: string
  message: string
  timestamp: string
  statusCode?: number
}
```

### User Types

#### User Model

```typescript
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}
```

#### User Profile

```typescript
export interface UserProfile extends User {
  preferences: UserPreferences
  subscription?: UserSubscription
}
```

#### User Preferences

```typescript
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  autoSave: boolean
  notifications: boolean
  clusterSuggestions: boolean
}
```

#### User Subscription

```typescript
export interface UserSubscription {
  plan: 'free' | 'pro' | 'team'
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd: Date
}
```

### Note Types

#### Note Model

```typescript
export interface Note {
  id: string
  content: string
  userId: string
  createdAt: Date
  updatedAt: Date
  metadata: NoteMetadata
  clusterId?: string
}
```

#### Note Metadata

```typescript
export interface NoteMetadata {
  wordCount: number
  characterCount: number
  tags: string[]
  source?: string
}
```

#### Note Operations

```typescript
export interface CreateNoteRequest {
  content: string
  metadata?: Partial<NoteMetadata>
}

export interface UpdateNoteRequest {
  content?: string
  metadata?: Partial<NoteMetadata>
}
```

### Cluster Types

#### Cluster Model

```typescript
export interface Cluster {
  id: string
  title: string
  description?: string
  userId: string
  notes: Note[]
  createdAt: Date
  updatedAt: Date
  metadata: ClusterMetadata
}
```

#### Cluster Metadata

```typescript
export interface ClusterMetadata {
  confidence: number
  noteCount: number
  totalWords: number
  themes: string[]
  suggestedAt?: Date
  acceptedAt?: Date
  dismissedAt?: Date
}
```

#### Cluster Suggestion

```typescript
export interface ClusterSuggestion {
  id: string
  clusterId: string
  title: string
  description: string
  notes: Note[]
  confidence: number
  themes: string[]
  createdAt: Date
}
```

### Document Types

#### Document Model

```typescript
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
```

#### Document Metadata

```typescript
export interface DocumentMetadata {
  wordCount: number
  readingTime: number
  tags: string[]
  version: number
  shareSettings?: ShareSettings
}
```

#### Share Settings

```typescript
export interface ShareSettings {
  isPublic: boolean
  shareId?: string
  allowComments: boolean
  expiresAt?: Date
  password?: string
}
```

### Search Types

#### Search Query

```typescript
export interface SearchQuery {
  query: string
  filters?: SearchFilters
  limit?: number
  offset?: number
}
```

#### Search Filters

```typescript
export interface SearchFilters {
  dateRange?: {
    from: Date
    to: Date
  }
  tags?: string[]
  type?: 'notes' | 'documents' | 'all'
  clusterId?: string
}
```

#### Search Result

```typescript
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
```

#### Search Response

```typescript
export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  took: number
}
```

## AI and ML Types

### Embedding Types

```typescript
export interface EmbeddingRequest {
  text: string
  model?: string
}

export interface EmbeddingResponse {
  embedding: number[]
  tokens: number
}
```

### Clustering Types

```typescript
export interface ClusteringRequest {
  noteIds: string[]
  threshold?: number
}
```

### Document Generation Types

```typescript
export interface DocumentGenerationRequest {
  clusterId: string
  title?: string
  style?: 'formal' | 'casual' | 'academic'
  length?: 'short' | 'medium' | 'long'
}
```

## Monitoring Types

### Health Check Types

```typescript
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  services: {
    database: ServiceStatus
    supabase: ServiceStatus
    openai?: ServiceStatus
    redis?: ServiceStatus
  }
  features: {
    aiClustering: boolean
    documentGeneration: boolean
    semanticSearch: boolean
    realTimeSync: boolean
  }
  monitoring: {
    sentry: boolean
    vercelAnalytics: boolean
    supabaseDashboard: boolean
  }
  uptime: number
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  error?: string
}
```

### Alert Types

```typescript
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface AlertConfig {
  name: string
  severity: AlertSeverity
  threshold: number
  window: number // in milliseconds
  description: string
}

export interface SystemAlert {
  id: string
  level: 'info' | 'warning' | 'error' | 'critical'
  title: string
  description: string
  timestamp: Date
  resolved: boolean
}
```

### Performance Types

```typescript
export interface PerformanceMetrics {
  responseTime: number
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  activeConnections: number
  requestsPerMinute: number
}
```

## WebSocket Types

### WebSocket Message

```typescript
export interface WebSocketMessage<T = unknown> {
  type: string
  data: T
  timestamp: Date
  userId?: string
}
```

### Real-time Updates

```typescript
export interface NoteUpdateMessage {
  type: 'note:update' | 'note:create' | 'note:delete'
  noteId: string
  note?: Note
}

export interface ClusterUpdateMessage {
  type: 'cluster:suggestion' | 'cluster:update'
  clusterId: string
  cluster?: Cluster
}
```

## Pagination Types

### Pagination Request

```typescript
export interface PaginationRequest {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
```

### Paginated Response

```typescript
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
```

## Form and Validation Types

### Form Field Error

```typescript
export interface FormFieldError {
  field: string
  message: string
}
```

### Form Validation Result

```typescript
export interface FormValidationResult {
  isValid: boolean
  errors: FormFieldError[]
}
```

## Authentication Types

### Session Types

```typescript
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
```

## Database Types

### Supabase Types

```typescript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar: string | null
          email_verified: string | null
          created_at: string
          updated_at: string
          preferences: Json
          subscription_plan: string
          subscription_status: string | null
          subscription_current_period_end: string | null
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          avatar?: string | null
          email_verified?: string | null
          created_at?: string
          updated_at?: string
          preferences?: Json
          subscription_plan?: string
          subscription_status?: string | null
          subscription_current_period_end?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar?: string | null
          email_verified?: string | null
          created_at?: string
          updated_at?: string
          preferences?: Json
          subscription_plan?: string
          subscription_status?: string | null
          subscription_current_period_end?: string | null
        }
      }
      notes: {
        Row: {
          id: string
          content: string
          user_id: string
          cluster_id: string | null
          created_at: string
          updated_at: string
          metadata: Json
          embedding: string | null
          embedding_updated_at: string | null
        }
        Insert: {
          id?: string
          content: string
          user_id: string
          cluster_id?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
          embedding?: string | null
          embedding_updated_at?: string | null
        }
        Update: {
          id?: string
          content?: string
          user_id?: string
          cluster_id?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
          embedding?: string | null
          embedding_updated_at?: string | null
        }
      }
      // ... other tables
    }
  }
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
```

## Component Types

### Health Dashboard Component Types

```typescript
export interface HealthDashboardProps {
  className?: string
}

export interface PerformanceMetrics {
  responseTime: number
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  activeConnections: number
  requestsPerMinute: number
}

export interface SystemAlert {
  id: string
  level: 'info' | 'warning' | 'error' | 'critical'
  title: string
  description: string
  timestamp: Date
  resolved: boolean
}
```

### UI Component Types

```typescript
// Button component props
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

// Badge component props
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

// Card component props
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

// Input component props
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// Progress component props
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}
```

## Utility Types

### Common Utility Types

```typescript
// Make all properties optional except specified keys
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

// Make specified properties optional
export type PartialPick<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Nullable wrapper
export type Nullable<T> = T | null

// Optional wrapper
export type Optional<T> = T | undefined

// Deep partial
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

// Extract array element type
export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never

// String literal union from object keys
export type KeysOfUnion<T> = T extends T ? keyof T : never

// Non-nullable object properties
export type NonNullable<T> = {
  [P in keyof T]: NonNullable<T[P]>
}
```

### API Utility Types

```typescript
// Extract data type from API response
export type ExtractApiData<T> = T extends ApiResponse<infer U> ? U : never

// Make API response
export type MakeApiResponse<T> = ApiResponse<T>

// Paginated data type
export type Paginated<T> = PaginatedResponse<T>

// Search result for specific type
export type SearchResultFor<T extends 'note' | 'document'> = SearchResult & { type: T }
```

### Environment Types

```typescript
export interface EnvironmentVariables {
  // Database
  DATABASE_URL: string
  DIRECT_URL: string

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string

  // AI Services
  OPENAI_API_KEY?: string

  // Monitoring
  SENTRY_DSN?: string
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: string
  SENTRY_AUTH_TOKEN?: string
  SENTRY_ORG?: string
  SENTRY_PROJECT?: string

  // Redis (optional)
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string

  // Feature Flags
  ENABLE_AI_CLUSTERING: boolean
  ENABLE_SEMANTIC_SEARCH: boolean
  ENABLE_DOCUMENT_GENERATION: boolean
  ENABLE_REAL_TIME_SYNC: boolean

  // App Configuration
  NODE_ENV: 'development' | 'production' | 'test'
  NEXT_PUBLIC_APP_URL: string
}
```

## Testing Types

### Test Fixture Types

```typescript
export interface TestHealthResponse extends HealthCheckResponse {
  // Additional test-specific properties if needed
}

export interface TestUser extends User {
  // Test-specific user properties
  password?: string
  isTestUser?: boolean
}

export interface TestNote extends Note {
  // Test-specific note properties
  isTestData?: boolean
}
```

### Mock Types

```typescript
export type MockFunction<T extends (...args: any[]) => any> = T & {
  mock: {
    calls: Parameters<T>[]
    results: Array<{ type: 'return' | 'throw'; value: ReturnType<T> }>
  }
}

export type MockedObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? MockFunction<T[K]> : T[K]
}
```

## Type Guards and Validators

### Type Guard Functions

```typescript
// Check if value is a User
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).email === 'string'
  )
}

// Check if value is a Note
export function isNote(value: unknown): value is Note {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'content' in value &&
    'userId' in value &&
    typeof (value as Note).id === 'string' &&
    typeof (value as Note).content === 'string' &&
    typeof (value as Note).userId === 'string'
  )
}

// Check if value is an ApiResponse
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'timestamp' in value &&
    typeof (value as ApiResponse).success === 'boolean' &&
    typeof (value as ApiResponse).timestamp === 'string'
  )
}

// Check if value is a HealthCheckResponse
export function isHealthCheckResponse(value: unknown): value is HealthCheckResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'services' in value &&
    ['healthy', 'degraded', 'unhealthy'].includes((value as HealthCheckResponse).status)
  )
}
```

## Type Exports

### Re-exported Types

```typescript
// Re-export commonly used types with shorter names
export type {
  ApiResponse as API,
  Note as NoteType,
  User as UserType,
  Cluster as ClusterType,
  Document as DocumentType,
  HealthCheckResponse as HealthCheck,
  ServiceStatus as ServiceHealth,
  SystemAlert as Alert,
  PerformanceMetrics as Performance,
}

// Re-export all types for easy importing
export * from './database'
export * from './supabase'
export * from './client'
export * from './api'
```

## Usage Examples

### Type Usage in Components

```typescript
import type { HealthCheckResponse, ServiceStatus } from '@/lib/types'

interface ComponentProps {
  health: HealthCheckResponse
  onRefresh: () => void
}

function HealthComponent({ health, onRefresh }: ComponentProps) {
  const getStatusColor = (status: ServiceStatus['status']): string => {
    switch (status) {
      case 'up': return 'green'
      case 'degraded': return 'yellow'
      case 'down': return 'red'
      default: return 'gray'
    }
  }

  return (
    <div>
      <h1>Status: {health.status}</h1>
      {/* Component implementation */}
    </div>
  )
}
```

### Type Usage in API Routes

```typescript
import type { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, Note, CreateNoteRequest } from '@/lib/types'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Note>>> {
  try {
    const data: CreateNoteRequest = await request.json()

    // Implementation
    const note: Note = {
      /* created note */
    }

    return NextResponse.json({
      success: true,
      data: note,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create note',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
```

This comprehensive type system provides full TypeScript coverage across the entire Context application, ensuring type safety and better developer experience.
