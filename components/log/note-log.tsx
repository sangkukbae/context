'use client'

import { useState, useEffect, useCallback } from 'react'
import { NoteInput } from './note-input'
import { NoteFeed, type Note } from './note-feed'
// import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { apiClient, ApiError } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/hooks'

interface NoteLogProps {
  className?: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function NoteLog({ className }: NoteLogProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [editContent, setEditContent] = useState('')

  // Authentication state
  const auth = useAuth()
  const isAuthenticated = auth.status === 'authenticated'

  // Fetch notes from API
  const fetchNotes = useCallback(
    async (page = 1, append = false) => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        const response = await apiClient.get<{ data: Note[]; pagination: PaginationMeta }>(
          `/api/notes?page=${page}&limit=20`
        )

        if (append) {
          setNotes(prev => [...prev, ...response.data])
        } else {
          setNotes(response.data)
        }

        setHasMore(response.pagination.hasNext)
        setCurrentPage(page)
      } catch (error) {
        console.error('Error fetching notes:', error)

        if (error instanceof ApiError) {
          if (error.status === 401) {
            toast.error('Your session has expired. Please sign in again.')
            // The apiClient should handle redirecting to sign-in
            return
          }
          toast.error(error.message || 'Failed to load notes. Please try again.')
        } else {
          toast.error('Failed to load notes. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    },
    [isAuthenticated]
  )

  // Load initial notes
  useEffect(() => {
    fetchNotes(1)
  }, [fetchNotes])

  // Create new note
  const handleCreateNote = useCallback(
    async (content: string) => {
      if (!isAuthenticated) {
        toast.error('You must be signed in to create notes.')
        return
      }

      setSubmitting(true)

      try {
        const newNote = await apiClient.post<Note>('/api/notes', { content })

        // Add to the beginning of the notes array (optimistic update)
        setNotes(prev => [newNote, ...prev])

        toast.success('Your note has been saved successfully.')
      } catch (error) {
        console.error('Error creating note:', error)

        if (error instanceof ApiError) {
          if (error.status === 401) {
            toast.error('Your session has expired. Please sign in again.')
            return
          }
          toast.error(error.message || 'Failed to create note. Please try again.')
        } else {
          toast.error('Failed to create note. Please try again.')
        }
        throw error // Re-throw to prevent clearing the input
      } finally {
        setSubmitting(false)
      }
    },
    [isAuthenticated]
  )

  // Load more notes (pagination)
  const handleLoadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchNotes(currentPage + 1, true)
    }
  }, [hasMore, loading, currentPage, fetchNotes])

  // Edit note
  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note)
    setEditContent(note.content)
  }, [])

  // Save edited note
  const handleSaveEdit = useCallback(async () => {
    if (!editingNote || !editContent.trim() || !isAuthenticated) return

    try {
      const updatedNote = await apiClient.put<Note>(`/api/notes/${editingNote.id}`, {
        content: editContent.trim(),
      })

      // Update the note in the local state
      setNotes(prev => prev.map(note => (note.id === updatedNote.id ? updatedNote : note)))

      setEditingNote(null)
      setEditContent('')

      toast.success('Your changes have been saved.')
    } catch (error) {
      console.error('Error updating note:', error)

      if (error instanceof ApiError) {
        if (error.status === 401) {
          toast.error('Your session has expired. Please sign in again.')
          return
        }
        toast.error(error.message || 'Failed to update note. Please try again.')
      } else {
        toast.error('Failed to update note. Please try again.')
      }
    }
  }, [editingNote, editContent, isAuthenticated])

  // Delete note
  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      if (!isAuthenticated) {
        toast.error('You must be signed in to delete notes.')
        return
      }

      try {
        await apiClient.delete(`/api/notes/${noteId}`)

        // Remove note from local state (optimistic update)
        setNotes(prev => prev.filter(note => note.id !== noteId))

        toast.success('Your note has been moved to trash and can be recovered for 30 days.')
      } catch (error) {
        console.error('Error deleting note:', error)

        if (error instanceof ApiError) {
          if (error.status === 401) {
            toast.error('Your session has expired. Please sign in again.')
            return
          }
          toast.error(error.message || 'Failed to delete note. Please try again.')
        } else {
          toast.error('Failed to delete note. Please try again.')
        }
      }
    },
    [isAuthenticated]
  )

  // Show loading while authentication is checking
  if (auth.status === 'loading') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Show message if not authenticated
  if (auth.status === 'unauthenticated') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center p-8">
          <p className="text-gray-600 mb-4">You must be signed in to view and create notes.</p>
          <Button asChild>
            <a href="/auth/sign-in">Sign In</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Note Input */}
      <NoteInput
        onSubmit={data => handleCreateNote(data.content)}
        disabled={submitting || !isAuthenticated}
        placeholder="What's on your mind? Start typing to capture your thoughts..."
      />

      <Separator />

      {/* Note Feed */}
      <NoteFeed
        notes={notes}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onEditNote={handleEditNote}
        onDeleteNote={handleDeleteNote}
      />

      {/* Edit Note Dialog */}
      <Dialog
        open={!!editingNote}
        onOpenChange={open => {
          if (!open) {
            setEditingNote(null)
            setEditContent('')
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="Edit your note..."
              className="min-h-[200px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingNote(null)
                  setEditContent('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editContent.trim() || editContent === editingNote?.content}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
