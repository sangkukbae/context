# API Reference

This document provides comprehensive reference for all API endpoints in the Context application.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.vercel.app`

## Authentication

The Context API uses Supabase authentication with JWT tokens. Include the authorization header:

```
Authorization: Bearer <jwt_token>
```

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

#### GET `/api/notes`

Retrieve paginated list of user's notes.

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `sortBy` (string, optional): Sort field - 'createdAt' | 'updatedAt' | 'content'
- `sortOrder` (string, optional): 'asc' | 'desc' (default: 'desc')

**Response:**

```typescript
{
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
```

#### POST `/api/notes`

Create a new note.

**Request Body:**

```typescript
{
  content: string
  metadata?: {
    tags?: string[]
    source?: string
  }
}
```

**Response:**

```typescript
{
  success: boolean
  data: Note
  message: string
}
```

#### GET `/api/notes/[id]`

Retrieve a specific note by ID.

**Response:**

```typescript
{
  success: boolean
  data: Note
}
```

#### PUT `/api/notes/[id]`

Update a note.

**Request Body:**

```typescript
{
  content?: string
  metadata?: Partial<NoteMetadata>
}
```

#### DELETE `/api/notes/[id]`

Delete a note (soft delete).

**Response:**

```typescript
{
  success: boolean
  message: string
}
```

### Search API

#### GET `/api/search`

Search notes and documents using hybrid keyword + semantic search.

**Query Parameters:**

- `q` (string, required): Search query
- `type` (string, optional): 'notes' | 'documents' | 'all' (default: 'all')
- `limit` (number, optional): Max results (default: 10, max: 50)
- `semantic` (boolean, optional): Enable semantic search (default: true)

**Response:**

```typescript
{
  results: SearchResult[]
  total: number
  query: string
  took: number // milliseconds
}
```

### Clusters API

#### GET `/api/clusters`

Get user's clusters with optional filters.

**Query Parameters:**

- `status` (string, optional): 'suggested' | 'accepted' | 'dismissed'
- `limit` (number, optional): Max results (default: 20)

#### POST `/api/clusters/[id]/accept`

Accept a cluster suggestion.

#### POST `/api/clusters/[id]/dismiss`

Dismiss a cluster suggestion.

### Documents API

#### GET `/api/documents`

Get user's documents.

#### POST `/api/documents`

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
