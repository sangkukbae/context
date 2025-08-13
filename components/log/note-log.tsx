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

interface NotesResponse {
  data: Note[]
  pagination: PaginationMeta
}

export function NoteLog({ className }: NoteLogProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [editContent, setEditContent] = useState('')

  // Fetch notes from API
  const fetchNotes = useCallback(async (page = 1, append = false) => {
    try {
      const response = await fetch(`/api/notes?page=${page}&limit=20`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch notes')
      }

      const result = await response.json()

      if (result.success) {
        const notesData = result.data as NotesResponse

        if (append) {
          setNotes(prev => [...prev, ...notesData.data])
        } else {
          setNotes(notesData.data)
        }

        setHasMore(notesData.pagination.hasNext)
        setCurrentPage(page)
      } else {
        throw new Error(result.message || 'Failed to fetch notes')
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
      toast.error('Failed to load notes. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load initial notes
  useEffect(() => {
    fetchNotes(1)
  }, [fetchNotes])

  // Create new note
  const handleCreateNote = useCallback(async (content: string) => {
    setSubmitting(true)

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to create note')
      }

      const result = await response.json()

      if (result.success) {
        const newNote = result.data as Note

        // Add to the beginning of the notes array (optimistic update)
        setNotes(prev => [newNote, ...prev])

        toast.success('Your note has been saved successfully.')
      } else {
        throw new Error(result.message || 'Failed to create note')
      }
    } catch (error) {
      console.error('Error creating note:', error)
      toast.error('Failed to create note. Please try again.')
      throw error // Re-throw to prevent clearing the input
    } finally {
      setSubmitting(false)
    }
  }, [])

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
    if (!editingNote || !editContent.trim()) return

    try {
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to update note')
      }

      const result = await response.json()

      if (result.success) {
        const updatedNote = result.data as Note

        // Update the note in the local state
        setNotes(prev => prev.map(note => (note.id === updatedNote.id ? updatedNote : note)))

        setEditingNote(null)
        setEditContent('')

        toast.success('Your changes have been saved.')
      } else {
        throw new Error(result.message || 'Failed to update note')
      }
    } catch (error) {
      console.error('Error updating note:', error)
      toast.error('Failed to update note. Please try again.')
    }
  }, [editingNote, editContent])

  // Delete note
  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      const result = await response.json()

      if (result.success) {
        // Remove note from local state (optimistic update)
        setNotes(prev => prev.filter(note => note.id !== noteId))

        toast.success('Your note has been moved to trash and can be recovered for 30 days.')
      } else {
        throw new Error(result.message || 'Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error('Failed to delete note. Please try again.')
    }
  }, [])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Note Input */}
      <NoteInput
        onSubmit={data => handleCreateNote(data.content)}
        disabled={submitting}
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
