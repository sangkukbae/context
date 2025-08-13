'use client'

import { useState, useEffect } from 'react'
import type { NoteStats } from '@/lib/types/note'

interface UseNoteStatsReturn {
  stats: NoteStats | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Custom hook for fetching and managing note statistics
 * Provides real-time stats for the dashboard
 */
export function useNoteStats(): UseNoteStatsReturn {
  const [stats, setStats] = useState<NoteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notes/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        setStats(result.data)
      } else {
        throw new Error(result.message || 'Invalid response format')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching note stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const refresh = async (): Promise<void> => {
    await fetchStats()
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refresh,
  }
}

/**
 * Helper function to format large numbers for display
 */
export function formatStatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

/**
 * Helper function to get growth indicator
 */
export function getGrowthIndicator(
  current: number,
  previous: number
): {
  percentage: number
  isPositive: boolean
  display: string
} {
  if (previous === 0) {
    return { percentage: 0, isPositive: true, display: 'New' }
  }

  const percentage = ((current - previous) / previous) * 100
  const isPositive = percentage >= 0
  const display = `${isPositive ? '+' : ''}${percentage.toFixed(1)}%`

  return { percentage: Math.abs(percentage), isPositive, display }
}
