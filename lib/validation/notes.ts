/**
 * Zod validation schemas for Note API operations
 *
 * This module re-exports and extends the comprehensive schemas from lib/schemas/note.ts
 * for backward compatibility and provides additional API-specific validations.
 */

// Re-export all schemas from the main note schemas module
export * from '../schemas/note'

// Create a simple schema for deleted notes query (for backward compatibility)
import { z } from 'zod'

export const DeletedNotesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().uuid().optional(),
    olderThan: z.string().datetime().optional(),
  })
  .strict()

export const RecoverNoteSchema = z
  .object({
    noteId: z.string().uuid('Invalid note ID'),
  })
  .strict()

export const SoftDeletedNoteSchema = z
  .object({
    id: z.string().uuid(),
    content: z.string(),
    userId: z.string().uuid(),
    clusterId: z.string().uuid().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime(),
    canRecover: z.boolean().default(true),
  })
  .strict()

// Legacy compatibility exports with updated schema names
export {
  CreateNoteRequestSchema as CreateNoteSchema,
  UpdateNoteRequestSchema as UpdateNoteSchema,
  NoteQuerySchema,
  NoteParamsSchema,
  NoteResponseSchema,
  NoteListResponseSchema as NoteListApiResponseSchema,
  BulkNoteOperationSchema as BulkUpdateNotesSchema,
  BulkNoteOperationSchema as BulkDeleteNotesSchema,
  NoteActivitySchema,
  NoteSearchQuerySchema as NoteSearchSchema,
  NoteAnalyticsQuerySchema as NoteAnalyticsSchema,
  NoteDTOSchema as NoteSchema,
} from '../schemas/note'

// Additional legacy type exports
export type DeletedNotesQuery = z.infer<typeof DeletedNotesQuerySchema>
export type RecoverNoteRequest = z.infer<typeof RecoverNoteSchema>
export type SoftDeletedNote = z.infer<typeof SoftDeletedNoteSchema>

// Legacy type exports for backward compatibility
export type {
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteQuery,
  NoteParams,
  NoteResponse,
  NoteListResponse as NoteListApiResponse,
  BulkNoteOperation as BulkUpdateNotesRequest,
  BulkNoteOperation as BulkDeleteNotesRequest,
  NoteActivity,
  NoteSearchQuery as NoteSearchRequest,
  NoteAnalyticsQuery as NoteAnalyticsRequest,
} from '../schemas/note'

// ============================================================================
// HELPER FUNCTIONS FOR VALIDATION
// ============================================================================

/**
 * Calculate note metadata from content
 */
export function calculateNoteMetadata(content: string, existingTags: string[] = []) {
  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length
  const characterCount = content.length

  return {
    wordCount,
    characterCount,
    tags: existingTags,
  }
}

/**
 * Validate and sanitize note content
 */
export function sanitizeNoteContent(content: string): string {
  // Remove any potential XSS attempts while preserving formatting
  return content
    .trim()
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
}

/**
 * Check if a note can be recovered (within recovery window)
 */
export function canRecoverNote(deletedAt: Date, recoveryWindowDays: number = 30): boolean {
  const now = new Date()
  const recoveryDeadline = new Date(deletedAt.getTime() + recoveryWindowDays * 24 * 60 * 60 * 1000)
  return now < recoveryDeadline
}

/**
 * Generate cursor for pagination
 */
export function generateNoteCursor(note: { id: string; createdAt: string | Date }): string {
  return note.id
}

/**
 * Parse pagination cursor
 */
export function parseNoteCursor(cursor: string): string | null {
  try {
    // Simple validation - just check if it's a valid UUID
    z.string().uuid().parse(cursor)
    return cursor
  } catch {
    return null
  }
}

// ============================================================================
// VALIDATION MIDDLEWARE HELPERS
// ============================================================================

/**
 * Validate note ownership for authorization
 */
export function validateNoteOwnership(noteUserId: string, requestUserId: string): boolean {
  return noteUserId === requestUserId
}

/**
 * Check note content length and complexity
 */
export function validateNoteComplexity(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (content.length > 50000) {
    issues.push('Content exceeds maximum length of 50,000 characters')
  }

  if (content.trim().length === 0) {
    issues.push('Content cannot be empty')
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /on\w+\s*=/i, // Event handlers like onclick=
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      issues.push('Content contains potentially unsafe HTML')
      break
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Generate activity log entry for note operations
 */
export function createNoteActivity(
  action: 'created' | 'updated' | 'deleted' | 'recovered' | 'clustered' | 'unclustered',
  noteId: string,
  metadata?: Record<string, unknown>,
  request?: { ip?: string; userAgent?: string }
) {
  return {
    action,
    noteId,
    metadata,
    ipAddress: request?.ip,
    userAgent: request?.userAgent,
  }
}
