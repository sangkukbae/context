// Notes API routes for Hono.js
// Implements CRUD operations for notes with authentication, validation, and metadata tracking

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Context } from 'hono'
import type { ApiResponse, PaginatedResponse } from '@/lib/types'
import type { Database } from '@/lib/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import {
  CreateNoteSchema,
  UpdateNoteSchema,
  NoteQuerySchema,
  NoteParamsSchema,
  DeletedNotesQuerySchema,
  calculateNoteMetadata,
  sanitizeNoteContent,
  validateNoteComplexity,
  parseNoteCursor,
  type CreateNoteRequest,
  type UpdateNoteRequest,
  type NoteQuery,
} from '@/lib/validation/notes'
import {
  createNote,
  getNotesByUserId,
  updateNote,
  softDeleteNote,
  recoverNote,
  getNoteById,
  getRecoverableNotes,
  logActivity,
} from '@/lib/supabase/database'

// Type for Hono context with Supabase client
type HonoContext = Context

// ============================================================================
// HELPER FUNCTIONS FOR AUTHENTICATION
// ============================================================================

async function createAuthenticatedClient(accessToken: string): Promise<SupabaseClient<Database>> {
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  )

  return supabase
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

async function authMiddleware(c: Context, next: () => Promise<void>) {
  try {
    const authHeader = c.req.header('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        401
      )
    }

    const token = authHeader.substring(7)

    // Create an authenticated client with the user's token for RLS to work properly
    const userSupabase = await createAuthenticatedClient(token)

    // Verify the token and get user info
    const {
      data: { user },
      error,
    } = await userSupabase.auth.getUser()

    if (error || !user) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        401
      )
    }

    // Store user info and authenticated client in context
    c.set('supabase', userSupabase)
    c.set('userId', user.id)
    c.set('user', { id: user.id, email: user.email || '' })

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      500
    )
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getClientInfo(c: Context) {
  return {
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
    userAgent: c.req.header('user-agent') || '',
  }
}

async function trackNoteActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: 'created' | 'updated' | 'deleted' | 'recovered',
  noteId: string,
  metadata: Record<string, unknown> = {},
  clientInfo: { ip: string; userAgent: string }
) {
  try {
    await logActivity(supabase, {
      user_id: userId,
      action: `note:${action}`,
      entity_type: 'note',
      entity_id: noteId,
      metadata: metadata as Record<string, unknown>,
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
    // Don't throw - activity logging shouldn't break the main operation
  }
}

function transformNoteForResponse(note: Record<string, unknown>) {
  return {
    id: note.id,
    content: note.content,
    userId: note.user_id,
    clusterId: note.cluster_id,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    metadata: note.metadata || { wordCount: 0, characterCount: 0, tags: [] },
  }
}

// ============================================================================
// CREATE NOTES ROUTER
// ============================================================================

const app = new Hono()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

// ============================================================================
// CREATE NOTE
// ============================================================================

app.post(
  '/',
  zValidator('json', CreateNoteSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid request data',
          validation: result.error.issues,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const body = (await c.req.json()) as CreateNoteRequest
      const { content, metadata: providedMetadata } = body
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>
      const clientInfo = getClientInfo(c)

      // Sanitize and validate content
      const sanitizedContent = sanitizeNoteContent(content)
      const contentValidation = validateNoteComplexity(sanitizedContent)

      if (!contentValidation.valid) {
        return c.json(
          {
            success: false,
            error: 'Validation Error',
            message: 'Invalid note content',
            issues: contentValidation.issues,
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          400
        )
      }

      // Calculate metadata
      const calculatedMetadata = calculateNoteMetadata(sanitizedContent, providedMetadata?.tags)
      const finalMetadata = {
        ...calculatedMetadata,
        ...providedMetadata,
        wordCount: calculatedMetadata.wordCount, // Always use calculated values
        characterCount: calculatedMetadata.characterCount,
      }

      // Create note
      const newNote = await createNote(supabase, {
        content: sanitizedContent,
        user_id: userId,
        metadata: finalMetadata as Record<string, unknown>, // Type cast to avoid Json compatibility issues
      })

      // Track activity
      await trackNoteActivity(
        supabase,
        userId,
        'created',
        newNote.id,
        {
          wordCount: finalMetadata.wordCount,
          characterCount: finalMetadata.characterCount,
          tags: finalMetadata.tags,
        },
        clientInfo
      )

      return c.json(
        {
          success: true,
          data: transformNoteForResponse(newNote),
          message: 'Note created successfully',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        201
      )
    } catch (error) {
      console.error('Create note error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to create note',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// LIST NOTES (with pagination)
// ============================================================================

app.get(
  '/',
  zValidator('query', NoteQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid query parameters',
          validation: result.error.issues,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const query = c.req.query() as unknown as NoteQuery
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>

      // Parse cursor if provided
      const cursor = query.cursor ? parseNoteCursor(query.cursor) : null

      // Build query options
      const queryOptions = {
        limit: query.limit + 1, // Get one extra to check if there's a next page
        offset: 0, // We'll handle cursor-based pagination differently
        orderBy: ((query.sort?.sortBy || 'createdAt') === 'createdAt'
          ? 'created_at'
          : 'updated_at') as 'created_at' | 'updated_at',
        order: (query.sort?.sortOrder || 'desc') as 'asc' | 'desc',
      }

      // Get notes (this is a simplified version - in production you'd implement cursor-based pagination)
      let notes = await getNotesByUserId(supabase, userId, queryOptions)

      // Apply cursor filtering if provided
      if (cursor) {
        const cursorIndex = notes.findIndex(note => note.id === cursor)
        if (cursorIndex >= 0) {
          notes = notes.slice(cursorIndex + 1)
        }
      }

      // Check if there are more results
      const hasNext = notes.length > query.limit
      if (hasNext) {
        notes = notes.slice(0, query.limit) // Remove the extra item
      }

      // Apply additional filtering
      if (query.filter?.clusterId) {
        notes = notes.filter(note => note.cluster_id === query.filter?.clusterId)
      }

      if (query.filter?.tags && query.filter.tags.length > 0) {
        notes = notes.filter(note => {
          const noteTags = note.metadata?.tags || []
          return query.filter?.tags?.some(tag => noteTags.includes(tag))
        })
      }

      // Apply date filtering
      if (query.filter?.dateRange) {
        notes = notes.filter(note => {
          const noteDate = new Date(note.created_at)
          if (query.filter?.dateRange?.from && noteDate < query.filter.dateRange.from) return false
          if (query.filter?.dateRange?.to && noteDate > query.filter.dateRange.to) return false
          return true
        })
      }

      // Get total count for pagination info
      const totalResult = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const transformedNotes = notes.map(transformNoteForResponse)

      const response: PaginatedResponse<(typeof transformedNotes)[0]> = {
        data: transformedNotes,
        pagination: {
          page: 1, // Cursor-based pagination doesn't use page numbers
          limit: query.limit,
          total: totalResult.count || 0,
          totalPages: Math.ceil((totalResult.count || 0) / query.limit),
          hasNext,
          hasPrev: !!cursor,
        },
      }

      return c.json(
        {
          success: true,
          data: response, // Return the full response with nested data and pagination
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      console.error('List notes error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve notes',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// GET SINGLE NOTE
// ============================================================================

app.get(
  '/:id',
  zValidator('param', NoteParamsSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid note ID',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const id = c.req.param('id')
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>

      // Get note by ID (exclude soft-deleted notes)
      const note = await getNoteById(supabase, id, userId, false)

      if (!note) {
        return c.json(
          {
            success: false,
            error: 'Not Found',
            message: 'Note not found or access denied',
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          404
        )
      }

      return c.json(
        {
          success: true,
          data: transformNoteForResponse(note),
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      console.error('Get note error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve note',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// UPDATE NOTE
// ============================================================================

app.put(
  '/:id',
  zValidator('param', NoteParamsSchema),
  zValidator('json', UpdateNoteSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid update data',
          validation: result.error.issues,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const id = c.req.param('id')
      const updateData = (await c.req.json()) as UpdateNoteRequest
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>
      const clientInfo = getClientInfo(c)

      // Check if note exists and belongs to user (exclude soft-deleted)
      const existingNote = await getNoteById(supabase, id, userId, false)

      if (!existingNote) {
        return c.json(
          {
            success: false,
            error: 'Not Found',
            message: 'Note not found or access denied',
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          404
        )
      }

      // Prepare update object
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      // Handle content update
      if (updateData.content !== undefined) {
        const sanitizedContent = sanitizeNoteContent(updateData.content)
        const contentValidation = validateNoteComplexity(sanitizedContent)

        if (!contentValidation.valid) {
          return c.json(
            {
              success: false,
              error: 'Validation Error',
              message: 'Invalid note content',
              issues: contentValidation.issues,
              timestamp: new Date().toISOString(),
            } as ApiResponse,
            400
          )
        }

        updates.content = sanitizedContent

        // Recalculate metadata if content changed
        const newMetadata = calculateNoteMetadata(
          sanitizedContent,
          updateData.metadata?.tags || existingNote.metadata?.tags || []
        )

        updates.metadata = {
          ...existingNote.metadata,
          ...updateData.metadata,
          ...newMetadata, // Always use calculated values for word/character count
        }
      } else if (updateData.metadata) {
        // Update metadata only
        updates.metadata = {
          ...existingNote.metadata,
          ...updateData.metadata,
        }
      }

      // Handle cluster assignment
      if (updateData.clusterId !== undefined) {
        updates.cluster_id = updateData.clusterId
      }

      // Update note
      const updatedNote = await updateNote(supabase, id, updates)

      // Track activity
      await trackNoteActivity(
        supabase,
        userId,
        'updated',
        id,
        {
          changes: Object.keys(updates),
          contentChanged: updateData.content !== undefined,
          clusterChanged: updateData.clusterId !== undefined,
        },
        clientInfo
      )

      return c.json(
        {
          success: true,
          data: transformNoteForResponse(updatedNote),
          message: 'Note updated successfully',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      console.error('Update note error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to update note',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

// ============================================================================
// DELETE NOTE (soft delete)
// ============================================================================

app.delete('/:id', zValidator('param', NoteParamsSchema), async (c: HonoContext) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId') as string
    const supabase = c.get('supabase') as SupabaseClient<Database>
    const clientInfo = getClientInfo(c)

    // Soft delete the note using database function
    const result = await softDeleteNote(supabase, id, userId)

    if (!result?.success) {
      return c.json(
        {
          success: false,
          error: 'Not Found',
          message: result?.message || 'Note not found or already deleted',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        404
      )
    }

    // Track activity
    await trackNoteActivity(
      supabase,
      userId,
      'deleted',
      id,
      {
        softDelete: true,
        deletedAt: result.note_data?.deleted_at,
      },
      clientInfo
    )

    return c.json(
      {
        success: true,
        message: 'Note deleted successfully',
        data: {
          id,
          deletedAt: result.note_data?.deleted_at,
          canRecover: result.note_data?.can_recover,
          recoveryDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      200
    )
  } catch (error) {
    console.error('Delete note error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete note',
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      500
    )
  }
})

// ============================================================================
// RECOVER DELETED NOTE
// ============================================================================

app.post('/:id/recover', zValidator('param', NoteParamsSchema), async (c: HonoContext) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId') as string
    const supabase = c.get('supabase') as SupabaseClient<Database>
    const clientInfo = getClientInfo(c)

    // Attempt to recover the note using database function
    const result = await recoverNote(supabase, id, userId)

    if (!result?.success) {
      return c.json(
        {
          success: false,
          error: 'Bad Request',
          message: result?.message || 'Cannot recover note',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }

    // Get the recovered note data
    const recoveredNote = await getNoteById(supabase, id, userId, false)

    // Track activity
    await trackNoteActivity(
      supabase,
      userId,
      'recovered',
      id,
      {
        recoveredAt: result.note_data?.recovered_at,
        wasDeletedForDays: result.note_data?.was_deleted_for_days,
      },
      clientInfo
    )

    return c.json(
      {
        success: true,
        data: recoveredNote ? transformNoteForResponse(recoveredNote) : null,
        message: 'Note recovered successfully',
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      200
    )
  } catch (error) {
    console.error('Recover note error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to recover note',
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      500
    )
  }
})

// ============================================================================
// GET DELETED NOTES (for recovery)
// ============================================================================

app.get(
  '/deleted',
  zValidator('query', DeletedNotesQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'Invalid query parameters',
          validation: result.error.issues,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        400
      )
    }
  }),
  async (c: HonoContext) => {
    try {
      const query = c.req.query()
      const userId = c.get('userId') as string
      const supabase = c.get('supabase') as SupabaseClient<Database>

      // Parse query parameters
      const limit = parseInt(query.limit || '20', 10)

      // Get recoverable notes
      const deletedNotes = await getRecoverableNotes(supabase, userId, {
        limit: limit,
        offset: 0, // For cursor-based pagination in the future
      })

      // Transform notes for response
      const transformedNotes = deletedNotes.map(note => ({
        ...transformNoteForResponse(note),
        deletedAt: note.deleted_at,
        canRecover: note.can_recover,
        daysDeleted: note.days_deleted,
        recoveryDeadline: new Date(
          new Date(note.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }))

      return c.json(
        {
          success: true,
          data: {
            data: transformedNotes,
            pagination: {
              limit: limit,
              total: deletedNotes.length,
              hasNext: deletedNotes.length === limit,
              nextCursor: undefined, // Could be implemented with cursor-based pagination
            },
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        200
      )
    } catch (error) {
      console.error('Get deleted notes error:', error)
      return c.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve deleted notes',
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        500
      )
    }
  }
)

export { app as notesRouter }
