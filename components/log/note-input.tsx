'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreateNoteRequestSchema } from '@/lib/schemas/note'
import type { CreateNoteRequest } from '@/lib/types/note'

// Form schema for real-time validation
const NoteInputSchema = CreateNoteRequestSchema.pick({ content: true })
type NoteInputForm = z.infer<typeof NoteInputSchema>

interface NoteInputProps {
  onSubmit?: (data: CreateNoteRequest) => Promise<void>
  disabled?: boolean
  placeholder?: string
  className?: string
  autoSave?: boolean
  autoSaveDelay?: number
}

export function NoteInput({
  onSubmit,
  disabled = false,
  placeholder = "What's on your mind? Start typing to capture your thoughts...",
  className,
  autoSave = false,
  autoSaveDelay = 2000,
}: NoteInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Form with validation
  const form = useForm<NoteInputForm>({
    resolver: zodResolver(NoteInputSchema),
    defaultValues: {
      content: '',
    },
  })

  const content = form.watch('content')

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus()
    }
  }, [disabled])

  // Auto-resize textarea with performance optimization
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Use requestAnimationFrame for smooth resizing
    const resizeTextarea = () => {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 400
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }

    requestAnimationFrame(resizeTextarea)
  }, [content])

  // Auto-save functionality
  const handleAutoSave = useCallback(
    async (content: string) => {
      if (!autoSave || !onSubmit || !content.trim() || content.trim().length < 3) return

      setAutoSaveStatus('saving')
      try {
        await onSubmit({ content: content.trim() })
        setAutoSaveStatus('saved')
        setLastSaved(new Date())
        form.reset({ content: '' })
      } catch (error) {
        setAutoSaveStatus('error')
        console.error('Auto-save failed:', error)
      }
    },
    [autoSave, onSubmit, form]
  )

  // Debounced auto-save
  useEffect(() => {
    if (!autoSave || !content?.trim()) return

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleAutoSave(content)
    }, autoSaveDelay)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [content, handleAutoSave, autoSaveDelay, autoSave])

  const handleSubmit = form.handleSubmit(async data => {
    if (isSubmitting || !onSubmit) return

    setIsSubmitting(true)
    setAutoSaveStatus('idle')

    try {
      await onSubmit(data)
      form.reset({ content: '' })
      setLastSaved(new Date())

      // Refocus after successful submission
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    } catch (error) {
      console.error('Failed to submit note:', error)
      // Keep content on error so user doesn't lose their work
    } finally {
      setIsSubmitting(false)
    }
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit with Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Calculate metrics
  const wordCount = content
    ? content
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0).length
    : 0
  const characterCount = content?.length || 0
  const canSubmit =
    form.formState.isValid && !isSubmitting && !disabled && content?.trim().length > 0
  const maxLength = 50000 // From schema
  const isNearLimit = characterCount > maxLength * 0.9
  const isOverLimit = characterCount > maxLength

  return (
    <Card className={cn('p-4', className)}>
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Textarea
                      {...field}
                      ref={textareaRef}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      disabled={disabled || isSubmitting}
                      data-note-input="true"
                      data-testid="note-input-textarea"
                      className={cn(
                        'min-h-[120px] max-h-[400px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground transition-colors duration-200',
                        isOverLimit && 'border-destructive focus-visible:ring-destructive',
                        isNearLimit &&
                          !isOverLimit &&
                          'border-orange-300 focus-visible:ring-orange-300'
                      )}
                    />

                    {/* Character and word count with status indicators */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs">
                      {autoSave && autoSaveStatus !== 'idle' && (
                        <div className="flex items-center gap-1">
                          {autoSaveStatus === 'saving' && (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-muted-foreground">Saving...</span>
                            </>
                          )}
                          {autoSaveStatus === 'saved' && (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              <span className="text-green-600">Saved</span>
                            </>
                          )}
                          {autoSaveStatus === 'error' && (
                            <>
                              <AlertCircle className="w-3 h-3 text-destructive" />
                              <span className="text-destructive">Error</span>
                            </>
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          'text-muted-foreground',
                          isOverLimit && 'text-destructive font-medium',
                          isNearLimit && !isOverLimit && 'text-orange-600 font-medium'
                        )}
                      >
                        {characterCount.toLocaleString()}/{maxLength.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {/* Keyboard shortcut hint */}
              <div className="flex items-center">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  {typeof navigator !== 'undefined' && navigator?.platform?.includes('Mac')
                    ? '⌘'
                    : 'Ctrl'}
                </kbd>
                <span className="mx-1">+</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  ↵
                </kbd>
                <span className="ml-2">to submit</span>
              </div>

              {/* Word count badge */}
              {wordCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {wordCount} words
                </Badge>
              )}

              {/* Last saved indicator */}
              {lastSaved && (
                <div className="text-xs text-muted-foreground">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || isOverLimit}
              size="sm"
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  )
}
