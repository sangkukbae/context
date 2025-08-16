'use client'

/**
 * SearchInput Component
 *
 * Provides a search input with debouncing, suggestions, and keyboard shortcuts.
 * Uses shadcn/ui Command component for autocomplete functionality.
 * Integrates with the search API and follows existing component patterns.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Clock, TrendingUp } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SearchSuggestion } from '@/lib/schemas/search'

interface SearchInputProps {
  onSearch: (query: string, filters?: Record<string, unknown>) => void
  placeholder?: string
  className?: string
  initialValue?: string
  showSuggestions?: boolean
  debounceMs?: number
  disabled?: boolean
  loading?: boolean
}

interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[]
  total: number
}

export function SearchInput({
  onSearch,
  placeholder = 'Search notes...',
  className,
  initialValue = '',
  showSuggestions = true,
  debounceMs = 300,
  disabled = false,
  loading = false,
}: SearchInputProps) {
  const [query, setQuery] = useState(initialValue)
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search handler
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        if (searchQuery.trim()) {
          onSearch(searchQuery.trim())
        }
      }, debounceMs)
    },
    [onSearch, debounceMs]
  )

  // Fetch search suggestions
  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      if (!showSuggestions || searchQuery.length < 2) {
        setSuggestions([])
        return
      }

      setLoadingSuggestions(true)
      try {
        const token = localStorage.getItem('supabase.auth.token')
        if (!token) return

        const response = await fetch(
          `/api/search/suggestions?query=${encodeURIComponent(searchQuery)}&limit=8`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.ok) {
          const data: { success: boolean; data: SearchSuggestionsResponse } = await response.json()
          if (data.success) {
            setSuggestions(data.data.suggestions)
          }
        }
      } catch (error) {
        console.error('Failed to fetch search suggestions:', error)
      } finally {
        setLoadingSuggestions(false)
      }
    },
    [showSuggestions]
  )

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value)
    setSelectedIndex(-1)

    // Fetch suggestions for autocomplete
    if (showSuggestions) {
      fetchSuggestions(value)
    }

    // Only trigger search if query is meaningful
    if (value.trim().length >= 2) {
      debouncedSearch(value)
    }
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.query)
    setIsOpen(false)
    onSearch(suggestion.query)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      // Handle search on Enter when suggestions aren't open
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault()
        onSearch(query.trim())
        setIsOpen(false)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionSelect(suggestions[selectedIndex])
        } else if (query.trim()) {
          onSearch(query.trim())
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle clear search
  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Set up global keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  return (
    <div className={cn('relative', className)}>
      <Popover open={isOpen && suggestions.length > 0} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (showSuggestions && suggestions.length > 0) {
                  setIsOpen(true)
                }
              }}
              placeholder={placeholder}
              disabled={disabled || loading}
              className={cn(
                'w-full rounded-md border border-input bg-background px-10 py-2 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                loading && 'cursor-wait',
                className
              )}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              {query && !loading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={handleClear}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <div className="hidden sm:flex">
                <Badge variant="outline" className="text-xs">
                  ⌘K
                </Badge>
              </div>
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command className="rounded-lg border-none shadow-md">
            <CommandList>
              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : suggestions.length === 0 ? (
                <CommandEmpty>No search suggestions found.</CommandEmpty>
              ) : (
                <CommandGroup heading="Recent & Popular">
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={`${suggestion.query}-${suggestion.type}`}
                      value={suggestion.query}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer',
                        selectedIndex === index && 'bg-accent'
                      )}
                    >
                      {suggestion.type === 'history' ? (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex-1 truncate">
                        <span className="text-sm">{suggestion.query}</span>
                      </div>
                      {suggestion.useCount && suggestion.useCount > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.useCount}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Search shortcut hint */}
      <div className="mt-1 hidden text-xs text-muted-foreground sm:block">
        Press{' '}
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground opacity-100">
          ⌘K
        </kbd>{' '}
        to search
      </div>
    </div>
  )
}
