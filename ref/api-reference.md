# API Reference

This document provides comprehensive reference for all API endpoints in the Context application, including the unified API client, authentication, and detailed endpoint documentation.

## Table of Contents

- [Overview](#overview)
- [Unified API Client](#unified-api-client)
- [Authentication](#authentication)
- [Base URL and Endpoints](#base-url-and-endpoints)
- [Health Check](#health-check)
- [Notes API](#notes-api)
- [Error Handling](#error-handling)
- [Response Formats](#response-formats)
- [Examples](#examples)

## Overview

The Context API is built using **Next.js 15 App Router** with **Hono.js** for efficient request handling. All API routes are unified under a single endpoint pattern (`/api/[...route]`) for consistent behavior and easy maintenance.

### Key Features

- **Unified Architecture**: Single endpoint pattern handles all API requests
- **Unified API Client**: Centralized client with automatic authentication and error handling
- **Type Safety**: Full TypeScript integration with shared types between client and server
- **Authentication**: JWT-based authentication via Supabase with automatic session management
- **Real-time**: Supabase Realtime integration for live updates
- **Monitoring**: Built-in health checks and performance monitoring

## Unified API Client

The application includes a unified API client (`lib/api/client.ts`) that provides automatic authentication, response unwrapping, and error handling.

### Basic Usage

```typescript
import { apiClient } from '@/lib/api/client'

// GET request
const notes = await apiClient.get<Note[]>('/api/notes')

// POST request with body
const newNote = await apiClient.post<Note>('/api/notes', {
  content: 'New note content',
})

// PUT request
const updatedNote = await apiClient.put<Note>(`/api/notes/${id}`, {
  content: 'Updated content',
})

// DELETE request
await apiClient.delete(`/api/notes/${id}`)
```

### Client Features

- **Automatic Authentication**: Attaches Supabase access tokens to all requests
- **Response Unwrapping**: Automatically extracts data from API response envelopes
- **Error Handling**: Throws typed `ApiError` instances with detailed error information
- **Session Management**: Automatically handles 401 errors with sign-out and redirect
- **Type Safety**: Full TypeScript support with generic type parameters

### ApiError Class

```typescript
class ApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    message: string,
    public response?: Response
  )
}

// Usage in try-catch
try {
  const notes = await apiClient.get<Note[]>('/api/notes')
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}:`, error.message)
  }
}
```

## Authentication

The Context API uses Supabase authentication with JWT tokens.

### Manual Authentication Headers

When not using the unified API client:

```bash
Authorization: Bearer <jwt_token>
```

### Automatic Authentication

The unified API client automatically handles authentication:

```typescript
// No need to manually add auth headers
const notes = await apiClient.get<Note[]>('/api/notes')
```

## Base URL and Endpoints

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.vercel.app`
- **API Base**: All endpoints start with `/api/`

## API Routes

### Health Check

#### GET `/api/health`

Returns the current health status of all system components.

**Response Structure:**

```typescript
interface HealthCheckResponse {
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

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  error?: string
}
```

**HTTP Status Codes:**

- `200` - All systems healthy
- `206` - Some systems degraded but functional
- `503` - Critical systems down

**Example Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "environment": "development",
  "services": {
    "database": {
      "status": "up",
      "responseTime": 150
    },
    "supabase": {
      "status": "up",
      "responseTime": 200
    }
  },
  "features": {
    "aiClustering": true,
    "documentGeneration": true,
    "semanticSearch": true,
    "realTimeSync": true
  },
  "monitoring": {
    "sentry": true,
    "vercelAnalytics": true,
    "supabaseDashboard": true
  },
  "uptime": 3600000
}
```

### Notes API

All Notes API endpoints require authentication and operate only on the authenticated user's notes. The API provides comprehensive CRUD operations with advanced features like soft delete, recovery, and rich metadata handling.

#### GET `/api/notes`

Retrieve paginated list of user's notes with advanced filtering and sorting.

**Query Parameters:**

```typescript
{
  limit?: number // 1-100, default: 20
  cursor?: string // UUID for cursor-based pagination
  filter?: {
    clusterId?: string | null
    tags?: string[] // max 10 tags
    dateRange?: { from: Date, to: Date }
    search?: string // 1-500 characters
    hasEmbedding?: boolean
    importance?: 'low' | 'medium' | 'high'
    sentiment?: 'positive' | 'neutral' | 'negative'
    categories?: string[]
    includeDeleted?: boolean // default: false
    wordCountRange?: { min?: number, max?: number }
  }
  sort?: {
    sortBy?: 'createdAt' | 'updatedAt' | 'wordCount' | 'relevance' // default: 'createdAt'
    sortOrder?: 'asc' | 'desc' // default: 'desc'
  }
}
```

**Response:**

```typescript
{
  success: true
  data: {
    data: Note[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
  timestamp: string
}
```

#### POST `/api/notes`

Create a new note with rich metadata and content validation.

**Request Body:**

```typescript
{
  content: string // 1-50,000 characters, required
  metadata?: {
    tags?: string[] // max 20 tags, each 1-50 chars
    source?: string // 1-100 chars
    importance?: 'low' | 'medium' | 'high'
    categories?: string[] // max 10, each 1-50 chars
    linkedNoteIds?: string[] // UUIDs, max 50
    custom?: Record<string, unknown>
  }
  clusterId?: string | null // UUID
  source?: string // 1-100 chars
}
```

**Response:**

```typescript
{
  success: true
  data: Note // includes auto-calculated metadata (wordCount, characterCount, etc.)
  message: string
  timestamp: string
}
```

#### GET `/api/notes/:id`

Retrieve a specific note by ID.

**Path Parameters:**

- `id` (string, required): Note UUID

**Response:**

```typescript
{
  success: true
  data: Note
  timestamp: string
}
```

#### PUT `/api/notes/:id`

Update an existing note. At least one field must be provided.

**Path Parameters:**

- `id` (string, required): Note UUID

**Request Body:**

```typescript
{
  content?: string // 1-50,000 characters
  metadata?: {
    tags?: string[]
    source?: string
    importance?: 'low' | 'medium' | 'high'
    sentiment?: 'positive' | 'neutral' | 'negative'
    categories?: string[]
    linkedNoteIds?: string[]
    custom?: Record<string, unknown>
  }
  clusterId?: string | null
}
```

**Response:**

```typescript
{
  success: true
  data: Note // updated note with new metadata
  timestamp: string
}
```

#### DELETE `/api/notes/:id`

Soft delete a note (recoverable for 30 days).

**Path Parameters:**

- `id` (string, required): Note UUID

**Response:**

```typescript
{
  success: true
  message: string // includes recovery deadline
  timestamp: string
}
```

#### POST `/api/notes/:id/recover`

Recover a soft-deleted note within the 30-day recovery window.

**Path Parameters:**

- `id` (string, required): Note UUID

**Response:**

```typescript
{
  success: true
  data: Note // recovered note
  message: string
  timestamp: string
}
```

#### GET `/api/notes/deleted`

List recoverable deleted notes with recovery status.

**Query Parameters:**

```typescript
{
  limit?: number // 1-50, default: 20
  cursor?: string // UUID for pagination
  olderThan?: string // ISO datetime filter
}
```

**Response:**

```typescript
{
  success: true
  data: {
    data: DeletedNote[] // includes deletedAt, canRecover, daysDeleted, recoveryDeadline
    pagination: PaginationInfo
  }
  timestamp: string
}
```

## Error Handling

The API uses consistent error handling across all endpoints with structured error responses.

### HTTP Status Codes

- **200 OK** - Successful request
- **201 Created** - Resource successfully created
- **400 Bad Request** - Invalid request data or validation errors
- **401 Unauthorized** - Missing or invalid authentication token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found or user doesn't have access
- **500 Internal Server Error** - Server-side error

### Error Response Format

```typescript
{
  success: false
  error: string // Error type/category
  message: string // Human-readable error description
  validation?: ZodIssue[] // Detailed validation errors for 400 responses
  timestamp: string // ISO datetime
}
```

### Common Error Examples

**Validation Error (400):**

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid request data",
  "validation": [
    {
      "path": ["content"],
      "message": "Content must be between 1 and 50000 characters",
      "code": "too_big"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Authentication Error (401):**

```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Authentication required. Please log in.",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Not Found Error (404):**

```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Note not found or you don't have permission to access it",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Response Formats

All API responses follow a consistent envelope format for easy client-side handling.

### Success Response Format

```typescript
{
  success: true
  data: T // Response data (type varies by endpoint)
  message?: string // Optional success message
  timestamp: string // ISO datetime
}
```

### Paginated Response Format

For endpoints that return lists of items:

```typescript
{
  success: true
  data: {
    data: T[] // Array of items
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
  timestamp: string
}
```

## Examples

### Using the Unified API Client

```typescript
import { apiClient } from '@/lib/api/client'
import type { Note } from '@/lib/types'

// Create a note
try {
  const newNote = await apiClient.post<Note>('/api/notes', {
    content: 'This is my new note',
    metadata: {
      tags: ['important', 'project'],
      importance: 'high',
    },
  })
  console.log('Created note:', newNote.id)
} catch (error) {
  if (error instanceof ApiError) {
    console.error('Failed to create note:', error.message)
  }
}

// List notes with filtering
const notes = await apiClient.get<PaginatedResponse<Note>>('/api/notes', {
  params: {
    limit: 10,
    filter: {
      tags: ['important'],
      importance: 'high',
    },
    sort: {
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    },
  },
})

// Update a note
const updatedNote = await apiClient.put<Note>(`/api/notes/${noteId}`, {
  content: 'Updated content',
  metadata: {
    importance: 'medium',
  },
})

// Soft delete and recover
await apiClient.delete(`/api/notes/${noteId}`)
const recovered = await apiClient.post<Note>(`/api/notes/${noteId}/recover`)
```

### Manual HTTP Requests

```typescript
// Using fetch with manual authentication
const token = 'your-jwt-token'

const response = await fetch('/api/notes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    content: 'New note content',
    metadata: { tags: ['example'] },
  }),
})

const result = await response.json()
if (result.success) {
  console.log('Note created:', result.data)
} else {
  console.error('Error:', result.message)
}
```

### Pagination Example

```typescript
// Cursor-based pagination
let cursor: string | undefined
const allNotes: Note[] = []

do {
  const response = await apiClient.get<PaginatedResponse<Note>>('/api/notes', {
    params: {
      limit: 50,
      cursor,
      sort: { sortBy: 'createdAt', sortOrder: 'desc' },
    },
  })

  allNotes.push(...response.data)
  cursor = response.pagination.hasNext ? response.pagination.nextCursor : undefined
} while (cursor)
```

Create a new document from a cluster.

**Request Body:**

```typescript
{
  clusterId: string
  title?: string
  style?: 'formal' | 'casual' | 'academic'
  length?: 'short' | 'medium' | 'long'
}
```

## Error Handling

All API endpoints return consistent error responses:

```typescript
{
  success: false
  error: string
  message: string
  timestamp: string
  statusCode?: number
}
```

### Common Error Codes

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per user
- **Search endpoints**: 20 requests per minute per user
- **AI endpoints**: 10 requests per minute per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1642234567
```

## Request/Response Types

See the [Type Definitions](./type-definitions.md) for complete TypeScript interfaces.

## SDK Usage

For JavaScript/TypeScript applications, consider using the Context SDK:

```typescript
import { ContextClient } from '@context/sdk'

const client = new ContextClient({
  baseUrl: 'https://your-domain.vercel.app',
  apiKey: 'your-api-key',
})

// Create a note
const note = await client.notes.create({
  content: 'My new note',
})
```
