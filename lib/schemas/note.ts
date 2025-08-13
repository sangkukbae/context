/**
 * Comprehensive Zod Validation Schemas for Note Operations
 *
 * This module provides runtime validation schemas using Zod for all note-related
 * operations. Ensures type safety and data integrity across the API surface.
 *
 * Schemas are organized by functional area and include helper functions
 * for common validation tasks and metadata calculation.
 */

import { z } from 'zod'

// ============================================================================
// BASE VALIDATION SCHEMAS
// ============================================================================

/**
 * Note metadata schema with comprehensive validation
 * Matches the NoteMetadata interface from types/note.ts
 */
export const NoteMetadataSchema = z.object({
  wordCount: z.number().int().min(0),
  characterCount: z.number().int().min(0),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  source: z.string().trim().min(1).max(100).optional(),
  version: z.number().int().min(1).optional(),
  editHistory: z
    .array(
      z.object({
        timestamp: z.date(),
        contentLength: z.number().int().min(0),
        tagsChanged: z.boolean(),
        significantEdit: z.boolean(),
        summary: z.string().max(200).optional(),
      })
    )
    .max(100)
    .optional(),
  importance: z.enum(['low', 'medium', 'high']).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  categories: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  linkedNoteIds: z.array(z.string().uuid()).max(50).optional(),
  custom: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Core note schema for database operations
 * Matches the Note interface exactly
 */
export const NoteSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1, 'Content cannot be empty').max(50000, 'Content too long'),
  userId: z.string().uuid(),
  clusterId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  metadata: NoteMetadataSchema,
  embedding: z.array(z.number()).nullable(),
  embeddingUpdatedAt: z.date().nullable(),
})

/**
 * Note DTO schema for API serialization (dates as strings)
 */
export const NoteDTOSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  userId: z.string().uuid(),
  clusterId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  metadata: NoteMetadataSchema,
  embedding: z.array(z.number()).nullable(),
  embeddingUpdatedAt: z.string().datetime().nullable(),
})

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for creating a new note
 * Content is required, metadata is optional and will be calculated/merged
 */
export const CreateNoteRequestSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(50000, 'Content exceeds maximum length'),
  metadata: z
    .object({
      tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
      source: z.string().trim().min(1).max(100).optional(),
      importance: z.enum(['low', 'medium', 'high']).optional(),
      categories: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
      linkedNoteIds: z.array(z.string().uuid()).max(50).optional(),
      custom: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  clusterId: z.string().uuid().nullable().optional(),
  source: z.string().trim().min(1).max(100).optional(),
})

/**
 * Schema for updating an existing note
 * All fields are optional, but at least one must be provided
 */
export const UpdateNoteRequestSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, 'Content cannot be empty')
      .max(50000, 'Content exceeds maximum length')
      .optional(),
    metadata: z
      .object({
        tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
        source: z.string().trim().min(1).max(100).optional(),
        importance: z.enum(['low', 'medium', 'high']).optional(),
        sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
        categories: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
        linkedNoteIds: z.array(z.string().uuid()).max(50).optional(),
        custom: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
    clusterId: z.string().uuid().nullable().optional(),
  })
  .refine(data => data.content || data.metadata || data.clusterId !== undefined, {
    message: 'At least one field must be updated',
  })

// ============================================================================
// QUERY VALIDATION SCHEMAS
// ============================================================================

/**
 * Date range schema for filtering operations
 */
export const DateRangeSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine(data => data.from <= data.to, {
    message: 'Start date must be before or equal to end date',
  })

/**
 * Word count range schema for content filtering
 */
export const WordCountRangeSchema = z
  .object({
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
  })
  .refine(data => !data.min || !data.max || data.min <= data.max, {
    message: 'Minimum word count must be less than or equal to maximum',
  })

/**
 * Comprehensive note filter schema
 */
export const NoteFilterSchema = z.object({
  userId: z.string().uuid().describe('Required for security'),
  clusterId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).max(10).optional(),
  search: z.string().trim().min(1).max(500).optional(),
  dateRange: DateRangeSchema.optional(),
  hasEmbedding: z.boolean().optional(),
  importance: z.enum(['low', 'medium', 'high']).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  categories: z.array(z.string().trim().min(1)).max(10).optional(),
  includeDeleted: z.boolean().default(false),
  wordCountRange: WordCountRangeSchema.optional(),
})

/**
 * Note sorting options schema
 */
export const NoteSortOptionsSchema = z.object({
  sortBy: z.enum(['createdAt', 'updatedAt', 'wordCount', 'relevance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Complete note query schema with pagination
 */
export const NoteQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  cursor: z.string().uuid().optional().describe('Cursor for pagination'),
  filter: NoteFilterSchema.optional(),
  sort: NoteSortOptionsSchema.optional(),
})

/**
 * Note search query schema for semantic and text search
 */
export const NoteSearchQuerySchema = z.object({
  query: z.string().trim().min(1, 'Search query is required').max(500, 'Search query too long'),
  userId: z.string().uuid().describe('Required for security'),
  limit: z.coerce.number().int().min(1).max(50).default(10).describe('Max results to return'),
  includeMetadata: z.boolean().default(false),
  semanticSearch: z.boolean().default(false).describe('Use vector search'),
  filters: NoteFilterSchema.omit({ search: true, userId: true })
    .optional()
    .describe('Additional filters'),
})

// ============================================================================
// BULK OPERATIONS SCHEMAS
// ============================================================================

/**
 * Bulk note operation schema
 */
export const BulkNoteOperationSchema = z.object({
  noteIds: z
    .array(z.string().uuid())
    .min(1, 'At least one note ID required')
    .max(50, 'Cannot operate on more than 50 notes at once'),
  operation: z.enum(['delete', 'tag', 'cluster', 'recover', 'uncluster']),
  params: z
    .object({
      tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
      clusterId: z.string().uuid().optional(),
      permanent: z.boolean().default(false),
    })
    .optional(),
})

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Note pagination response schema
 */
export const NotePaginationSchema = z.object({
  limit: z.number().int().positive(),
  total: z.number().int().min(0),
  hasNext: z.boolean(),
  nextCursor: z.string().uuid().optional(),
})

/**
 * Note list response schema
 */
export const NoteListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    notes: z.array(NoteDTOSchema),
    pagination: NotePaginationSchema,
  }),
  timestamp: z.string().datetime(),
})

/**
 * Single note response schema
 */
export const NoteResponseSchema = z.object({
  success: z.literal(true),
  data: NoteDTOSchema,
  timestamp: z.string().datetime(),
})

/**
 * Bulk operation result schema
 */
export const BulkNoteOperationResultSchema = z.object({
  successful: z.number().int().min(0),
  failed: z.number().int().min(0),
  successfulIds: z.array(z.string().uuid()),
  failures: z.array(
    z.object({
      noteId: z.string().uuid(),
      error: z.string(),
    })
  ),
})

// ============================================================================
// ANALYTICS AND STATISTICS SCHEMAS
// ============================================================================

/**
 * Note statistics schema
 */
export const NoteStatsSchema = z.object({
  totalNotes: z.number().int().min(0),
  totalWords: z.number().int().min(0),
  totalCharacters: z.number().int().min(0),
  averageWordsPerNote: z.number().min(0),
  notesThisMonth: z.number().int().min(0),
  notesThisWeek: z.number().int().min(0),
  notesToday: z.number().int().min(0),
  topTags: z.array(
    z.object({
      tag: z.string(),
      count: z.number().int().positive(),
    })
  ),
  clusteredNotes: z.number().int().min(0),
  unclusteredNotes: z.number().int().min(0),
  embeddedNotes: z.number().int().min(0),
  deletedNotes: z.number().int().min(0),
})

/**
 * Note analytics query schema
 */
export const NoteAnalyticsQuerySchema = z
  .object({
    period: z.enum(['day', 'week', 'month', 'year']).default('week'),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  })
  .refine(data => !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo, {
    message: 'Start date must be before or equal to end date',
  })

// ============================================================================
// ACTIVITY AND AUDIT SCHEMAS
// ============================================================================

/**
 * Note activity schema for audit logging
 */
export const NoteActivitySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.enum([
    'created',
    'updated',
    'deleted',
    'recovered',
    'clustered',
    'unclustered',
    'tagged',
    'embedded',
  ]),
  noteId: z.string().uuid(),
  metadata: z
    .object({
      changes: z.record(z.string(), z.unknown()).optional(),
      previousValues: z.record(z.string(), z.unknown()).optional(),
      source: z.string().optional(),
      bulkOperationId: z.string().uuid().optional(),
    })
    .optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().max(1000).optional(),
  createdAt: z.date(),
})

// ============================================================================
// PARAMETER VALIDATION SCHEMAS
// ============================================================================

/**
 * Note ID parameter schema
 */
export const NoteParamsSchema = z.object({
  id: z.string().uuid('Invalid note ID format'),
})

/**
 * User ID parameter schema
 */
export const UserParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Request types
export type CreateNoteRequest = z.infer<typeof CreateNoteRequestSchema>
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>
export type NoteQuery = z.infer<typeof NoteQuerySchema>
export type NoteSearchQuery = z.infer<typeof NoteSearchQuerySchema>
export type BulkNoteOperation = z.infer<typeof BulkNoteOperationSchema>
export type NoteAnalyticsQuery = z.infer<typeof NoteAnalyticsQuerySchema>

// Response types
export type NoteResponse = z.infer<typeof NoteResponseSchema>
export type NoteListResponse = z.infer<typeof NoteListResponseSchema>
export type BulkNoteOperationResult = z.infer<typeof BulkNoteOperationResultSchema>
export type NoteStats = z.infer<typeof NoteStatsSchema>

// Parameter types
export type NoteParams = z.infer<typeof NoteParamsSchema>
export type UserParams = z.infer<typeof UserParamsSchema>

// Entity types
export type NoteDTO = z.infer<typeof NoteDTOSchema>
export type NoteMetadata = z.infer<typeof NoteMetadataSchema>
export type NoteActivity = z.infer<typeof NoteActivitySchema>

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate metadata from note content
 */
export function calculateNoteMetadata(
  content: string,
  existingMetadata?: Partial<NoteMetadata>
): Pick<NoteMetadata, 'wordCount' | 'characterCount'> {
  const words = content
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)

  return {
    wordCount: words.length,
    characterCount: content.length,
    ...existingMetadata,
  }
}

/**
 * Sanitize note content to prevent XSS
 */
export function sanitizeNoteContent(content: string): string {
  return content
    .trim()
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
}

/**
 * Check if note content has suspicious patterns
 */
export function validateNoteContentSafety(content: string): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for potentially dangerous HTML
  const dangerousPatterns = [
    { pattern: /<script\b/i, message: 'Script tags not allowed' },
    { pattern: /<iframe\b/i, message: 'IFrame tags not allowed' },
    { pattern: /<embed\b/i, message: 'Embed tags not allowed' },
    { pattern: /<object\b/i, message: 'Object tags not allowed' },
    { pattern: /on\w+\s*=/i, message: 'Event handlers not allowed' },
    { pattern: /javascript:/i, message: 'JavaScript URLs not allowed' },
  ]

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(content)) {
      issues.push(message)
    }
  }

  return {
    safe: issues.length === 0,
    issues,
  }
}

/**
 * Generate note preview snippet
 */
export function generateNoteSnippet(content: string, maxLength = 150): string {
  if (content.length <= maxLength) {
    return content
  }

  // Try to break at word boundary
  const truncated = content.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}

/**
 * Check if a note can be recovered based on deletion time
 */
export function canRecoverNote(deletedAt: Date, recoveryWindowDays = 30): boolean {
  const now = new Date()
  const recoveryDeadline = new Date(deletedAt.getTime() + recoveryWindowDays * 24 * 60 * 60 * 1000)
  return now < recoveryDeadline
}

/**
 * Validate tag format and constraints
 */
export function validateTags(tags: string[]): {
  valid: boolean
  issues: string[]
  sanitizedTags: string[]
} {
  const issues: string[] = []
  const sanitizedTags: string[] = []

  if (tags.length > 20) {
    issues.push('Maximum 20 tags allowed')
    return { valid: false, issues, sanitizedTags: [] }
  }

  for (const tag of tags) {
    const sanitized = tag.trim().toLowerCase()

    if (sanitized.length === 0) {
      issues.push('Empty tags not allowed')
      continue
    }

    if (sanitized.length > 50) {
      issues.push(`Tag "${sanitized}" exceeds 50 characters`)
      continue
    }

    if (!/^[a-z0-9-_\s]+$/i.test(sanitized)) {
      issues.push(`Tag "${sanitized}" contains invalid characters`)
      continue
    }

    if (!sanitizedTags.includes(sanitized)) {
      sanitizedTags.push(sanitized)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    sanitizedTags,
  }
}

/**
 * Create activity log entry for note operations
 */
export function createNoteActivity(
  action: z.infer<typeof NoteActivitySchema>['action'],
  noteId: string,
  userId: string,
  metadata?: {
    changes?: Record<string, unknown>
    previousValues?: Record<string, unknown>
    source?: string
    bulkOperationId?: string
  },
  request?: {
    ip?: string
    userAgent?: string
  }
): Omit<NoteActivity, 'id' | 'createdAt'> {
  return {
    userId,
    action,
    noteId,
    metadata,
    ipAddress: request?.ip,
    userAgent: request?.userAgent?.substring(0, 1000), // Truncate to max length
  }
}

/**
 * Generate cursor for pagination
 */
export function generateNoteCursor(note: { id: string }): string {
  return note.id
}

/**
 * Parse pagination cursor safely
 */
export function parseNoteCursor(cursor: string): string | null {
  try {
    z.string().uuid().parse(cursor)
    return cursor
  } catch {
    return null
  }
}

/**
 * Validate note ownership for authorization
 */
export function validateNoteOwnership(noteUserId: string, requestUserId: string): boolean {
  return noteUserId === requestUserId
}
