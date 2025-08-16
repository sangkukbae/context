'use client'

/**
 * SearchFilters Component
 *
 * Provides advanced search filtering options including date range, tags,
 * importance, word count, and other metadata filters.
 * Uses shadcn/ui Dialog and Form components for consistent UX.
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Calendar,
  Hash,
  Filter,
  X,
  CalendarIcon,
  Tag,
  TrendingUp,
  Folder,
  FileText,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { SearchFilters, DateRangeFilter } from '@/lib/schemas/search'

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onClearFilters: () => void
  availableTags?: string[]
  availableCategories?: string[]
  className?: string
}

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  availableTags?: string[]
  placeholder?: string
}

function TagInput({
  tags,
  onTagsChange,
  availableTags = [],
  placeholder = 'Enter tags...',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = availableTags.filter(
        tag => tag.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(tag)
      )
      setSuggestions(filtered.slice(0, 5))
    } else {
      setSuggestions([])
    }
  }, [inputValue, availableTags, tags])

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag])
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="gap-1">
            <Hash className="h-3 w-3" />
            {tag}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      <div className="relative">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-8"
        />
        <Tag className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {suggestions.length > 0 && (
        <div className="rounded-md border bg-popover p-2 shadow-md">
          <div className="text-xs text-muted-foreground mb-1">Suggestions:</div>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => addTag(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DateRangePicker({
  dateRange,
  onDateRangeChange,
}: {
  dateRange?: DateRangeFilter
  onDateRangeChange: (range?: DateRangeFilter) => void
}) {
  const [fromDate, setFromDate] = useState<Date | undefined>(dateRange?.from)
  const [toDate, setToDate] = useState<Date | undefined>(dateRange?.to)

  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date)
    if (date && toDate) {
      onDateRangeChange({ from: date, to: toDate })
    } else if (date && !toDate) {
      onDateRangeChange({ from: date, to: new Date() })
    }
  }

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date)
    if (fromDate && date) {
      onDateRangeChange({ from: fromDate, to: date })
    }
  }

  const clearDateRange = () => {
    setFromDate(undefined)
    setToDate(undefined)
    onDateRangeChange(undefined)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !fromDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={fromDate}
                onSelect={handleFromDateChange}
                disabled={date => date > new Date() || !!(toDate && date > toDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !toDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={toDate}
                onSelect={handleToDateChange}
                disabled={date => date > new Date() || !!(fromDate && date < fromDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {(fromDate || toDate) && (
        <Button variant="ghost" size="sm" onClick={clearDateRange} className="w-full text-xs">
          <X className="mr-2 h-3 w-3" />
          Clear date range
        </Button>
      )}
    </div>
  )
}

export function SearchFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  availableTags = [],
  availableCategories = [],
  className,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return value !== null && Object.keys(value).length > 0
    return value !== undefined && value !== null
  }).length

  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const quickFilters = [
    {
      label: 'Today',
      action: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        updateFilters({
          dateRange: { from: today, to: new Date() },
        })
      },
    },
    {
      label: 'This Week',
      action: () => {
        const today = new Date()
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        updateFilters({
          dateRange: { from: weekAgo, to: today },
        })
      },
    },
    {
      label: 'This Month',
      action: () => {
        const today = new Date()
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        updateFilters({
          dateRange: { from: monthAgo, to: today },
        })
      },
    },
    {
      label: 'Has Embeddings',
      action: () => updateFilters({ hasEmbedding: true }),
    },
    {
      label: 'High Importance',
      action: () => updateFilters({ importance: 'high' }),
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search Filters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Filters</Label>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={filter.action}
                  className="text-xs"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Label>
            <DateRangePicker
              dateRange={filters.dateRange}
              onDateRangeChange={range => updateFilters({ dateRange: range })}
            />
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Tags
            </Label>
            <TagInput
              tags={filters.tags || []}
              onTagsChange={tags => updateFilters({ tags })}
              availableTags={availableTags}
              placeholder="Add tags to filter by..."
            />
          </div>

          <Separator />

          {/* Categories */}
          {availableCategories.length > 0 && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Categories
                </Label>
                <TagInput
                  tags={filters.categories || []}
                  onTagsChange={categories => updateFilters({ categories })}
                  availableTags={availableCategories}
                  placeholder="Add categories to filter by..."
                />
              </div>
              <Separator />
            </>
          )}

          {/* Importance & Sentiment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Importance
              </Label>
              <Select
                value={filters.importance || 'any'}
                onValueChange={value =>
                  updateFilters({
                    importance: value === 'any' ? undefined : (value as 'low' | 'medium' | 'high'),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any importance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any importance</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Sentiment</Label>
              <Select
                value={filters.sentiment || 'any'}
                onValueChange={value =>
                  updateFilters({
                    sentiment:
                      value === 'any' ? undefined : (value as 'positive' | 'neutral' | 'negative'),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any sentiment</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Word Count Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Word Count
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Minimum</Label>
                <Input
                  type="number"
                  min="0"
                  value={filters.wordCountMin || ''}
                  onChange={e =>
                    updateFilters({
                      wordCountMin: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Maximum</Label>
                <Input
                  type="number"
                  min="0"
                  value={filters.wordCountMax || ''}
                  onChange={e =>
                    updateFilters({
                      wordCountMax: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="No limit"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Additional Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasEmbedding"
                  checked={filters.hasEmbedding || false}
                  onCheckedChange={checked =>
                    updateFilters({ hasEmbedding: !!checked || undefined })
                  }
                />
                <Label htmlFor="hasEmbedding" className="text-sm">
                  Only notes with AI embeddings
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clustered"
                  checked={!!filters.clusterId}
                  onCheckedChange={checked =>
                    updateFilters({ clusterId: !!checked ? 'any' : undefined })
                  }
                />
                <Label htmlFor="clustered" className="text-sm">
                  Only clustered notes
                </Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onClearFilters}>
              Clear All Filters
            </Button>
            <Button onClick={() => setIsOpen(false)}>Apply Filters</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
