# Notes API Documentation

## Overview

The Notes API provides comprehensive CRUD operations for managing user notes with advanced features including soft delete, recovery, metadata tracking, and pagination. All endpoints require authentication via Bearer token.

## Base URL

```
/api/notes
```

## Authentication

All endpoints require authentication using a Bearer token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Note

Create a new note with content and optional metadata.

**Endpoint:** `POST /api/notes`

**Request Body:**

```typescript
{
  content: string        // Required: Note content (1-50,000 characters)
  metadata?: {
    tags?: string[]      // Optional: Array of tags (max 20 tags, each 1-50 chars)
    source?: string      // Optional: Source of the note (1-100 characters)
  }
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    userId: string,
    clusterId: string | null,
    createdAt: string,
    updatedAt: string,
    metadata: {
      wordCount: number,
      characterCount: number,
      tags: string[],
      source?: string
    }
  },
  message: "Note created successfully",
  timestamp: string
}
```

**Example:**

```bash
curl -X POST /api/notes \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is my first note about AI and machine learning.",
    "metadata": {
      "tags": ["ai", "ml", "learning"]
    }
  }'
```

### 2. List Notes

Retrieve a paginated list of user's notes with filtering and sorting options.

**Endpoint:** `GET /api/notes`

**Query Parameters:**

```typescript
{
  limit?: number         // Default: 20, Max: 100
  cursor?: string        // UUID for cursor-based pagination
  sortBy?: 'created_at' | 'updated_at' | 'word_count'  // Default: 'created_at'
  sortOrder?: 'asc' | 'desc'  // Default: 'desc'
  clusterId?: string     // Filter by cluster ID
  tags?: string[]        // Filter by tags
  search?: string        // Search in content (1-200 chars)
  dateFrom?: string      // ISO datetime filter
  dateTo?: string        // ISO datetime filter
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    data: Note[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
      hasNext: boolean,
      hasPrev: boolean
    }
  },
  timestamp: string
}
```

**Example:**

```bash
# Get first 10 notes sorted by creation date
curl -X GET "/api/notes?limit=10&sortBy=created_at&sortOrder=desc" \
  -H "Authorization: Bearer your-token"

# Filter notes by tags
curl -X GET "/api/notes?tags[]=ai&tags[]=ml" \
  -H "Authorization: Bearer your-token"
```

### 3. Get Single Note

Retrieve a specific note by ID.

**Endpoint:** `GET /api/notes/:id`

**Parameters:**

- `id`: UUID of the note

**Response:**

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    userId: string,
    clusterId: string | null,
    createdAt: string,
    updatedAt: string,
    metadata: {
      wordCount: number,
      characterCount: number,
      tags: string[],
      source?: string
    }
  },
  timestamp: string
}
```

**Example:**

```bash
curl -X GET /api/notes/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer your-token"
```

### 4. Update Note

Update an existing note's content, metadata, or cluster assignment.

**Endpoint:** `PUT /api/notes/:id`

**Parameters:**

- `id`: UUID of the note

**Request Body:**

```typescript
{
  content?: string       // Optional: Updated content
  metadata?: {
    tags?: string[]      // Optional: Updated tags
    source?: string      // Optional: Updated source
  },
  clusterId?: string | null  // Optional: Assign to cluster or remove from cluster
}
```

**Response:**

```typescript
{
  success: true,
  data: Note,  // Updated note object
  message: "Note updated successfully",
  timestamp: string
}
```

**Example:**

```bash
curl -X PUT /api/notes/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content with more details",
    "metadata": {
      "tags": ["ai", "ml", "updated"]
    }
  }'
```

### 5. Delete Note (Soft Delete)

Soft delete a note (can be recovered within 30 days).

**Endpoint:** `DELETE /api/notes/:id`

**Parameters:**

- `id`: UUID of the note

**Response:**

```typescript
{
  success: true,
  message: "Note deleted successfully",
  data: {
    id: string,
    deletedAt: string,
    canRecover: boolean,
    recoveryDeadline: string  // ISO datetime
  },
  timestamp: string
}
```

**Example:**

```bash
curl -X DELETE /api/notes/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer your-token"
```

### 6. Recover Deleted Note

Restore a soft-deleted note within the 30-day recovery window.

**Endpoint:** `POST /api/notes/:id/recover`

**Parameters:**

- `id`: UUID of the deleted note

**Response:**

```typescript
{
  success: true,
  data: Note,  // Recovered note object
  message: "Note recovered successfully",
  timestamp: string
}
```

**Example:**

```bash
curl -X POST /api/notes/123e4567-e89b-12d3-a456-426614174000/recover \
  -H "Authorization: Bearer your-token"
```

### 7. List Deleted Notes

Get a list of soft-deleted notes that can be recovered.

**Endpoint:** `GET /api/notes/deleted`

**Query Parameters:**

```typescript
{
  limit?: number         // Default: 20, Max: 50
  cursor?: string        // UUID for pagination
  olderThan?: string     // ISO datetime - only show notes deleted before this date
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    data: Array<{
      id: string,
      content: string,
      userId: string,
      clusterId: string | null,
      createdAt: string,
      updatedAt: string,
      deletedAt: string,
      canRecover: boolean,
      daysDeleted: number,
      recoveryDeadline: string,
      metadata: NoteMetadata
    }>,
    pagination: {
      limit: number,
      total: number,
      hasNext: boolean,
      nextCursor?: string
    }
  },
  timestamp: string
}
```

**Example:**

```bash
curl -X GET /api/notes/deleted \
  -H "Authorization: Bearer your-token"
```

## Error Responses

All endpoints return consistent error responses:

```typescript
{
  success: false,
  error: string,           // Error type (e.g., "Validation Error", "Not Found")
  message: string,         // Human-readable error message
  timestamp: string,
  validation?: object      // Present for validation errors
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created (for POST requests)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (note doesn't exist or access denied)
- `500` - Internal Server Error

## Data Models

### Note

```typescript
interface Note {
  id: string // UUID
  content: string // Note content
  userId: string // Owner's UUID
  clusterId: string | null // Associated cluster UUID
  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
  metadata: NoteMetadata
}
```

### NoteMetadata

```typescript
interface NoteMetadata {
  wordCount: number // Automatically calculated
  characterCount: number // Automatically calculated
  tags: string[] // User-defined tags
  source?: string // Optional source identifier
}
```

## Features

### Automatic Metadata Calculation

- **Word Count**: Automatically calculated using whitespace splitting
- **Character Count**: Total characters in content
- **Validation**: Content sanitized for XSS protection

### Soft Delete & Recovery

- **30-Day Window**: Deleted notes can be recovered for 30 days
- **Automatic Cleanup**: Notes deleted longer than 30 days are permanently removed
- **Recovery Status**: API indicates if a note can still be recovered

### Security Features

- **Row Level Security**: Users can only access their own notes
- **Content Sanitization**: XSS protection on all content
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Activity Logging**: All operations are logged for audit purposes

### Performance Features

- **Cursor-Based Pagination**: Efficient pagination for large datasets
- **Indexes**: Optimized database indexes for fast queries
- **Caching**: Response caching where appropriate

## Implementation Notes

### Authentication

The API uses Supabase JWT tokens for authentication. The middleware validates tokens and extracts user information for authorization.

### Database

- **Soft Deletes**: Implemented with `deleted_at` timestamp column
- **Views**: `active_notes` and `recoverable_notes` views for easy querying
- **Functions**: Database functions for atomic soft delete and recovery operations

### Validation

All requests are validated using Zod schemas with comprehensive error reporting.

### Activity Tracking

All operations are logged to the `activity_logs` table for analytics and debugging.

## Example Workflows

### Basic Note Management

1. **Create a note:**

```bash
POST /api/notes
{"content": "Meeting notes from today", "metadata": {"tags": ["meeting"]}}
```

2. **List your notes:**

```bash
GET /api/notes?limit=10
```

3. **Update the note:**

```bash
PUT /api/notes/{id}
{"content": "Updated meeting notes with action items"}
```

### Recovery Workflow

1. **Delete a note:**

```bash
DELETE /api/notes/{id}
```

2. **View deleted notes:**

```bash
GET /api/notes/deleted
```

3. **Recover the note:**

```bash
POST /api/notes/{id}/recover
```

### Advanced Filtering

1. **Search by content:**

```bash
GET /api/notes?search=machine%20learning
```

2. **Filter by tags:**

```bash
GET /api/notes?tags[]=ai&tags[]=research
```

3. **Date range filtering:**

```bash
GET /api/notes?dateFrom=2024-01-01T00:00:00Z&dateTo=2024-02-01T00:00:00Z
```

This API provides a solid foundation for the Context note-taking application with enterprise-grade features for reliability, security, and performance.
