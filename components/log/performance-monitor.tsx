'use client'

import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  inputLag: number
  renderTime: number
  apiResponseTime: number
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
  enabled?: boolean
  threshold?: number // ms
}

/**
 * Performance monitoring component for tracking user interaction metrics
 * Specifically monitors the <200ms input lag requirement
 */
export function PerformanceMonitor({
  onMetricsUpdate,
  enabled = process.env.NODE_ENV === 'development',
  threshold = 200,
}: PerformanceMonitorProps) {
  const metricsRef = useRef<PerformanceMetrics>({
    inputLag: 0,
    renderTime: 0,
    apiResponseTime: 0,
  })

  useEffect(() => {
    if (!enabled) return

    let performanceObserver: PerformanceObserver | undefined

    if ('PerformanceObserver' in window) {
      performanceObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navigationEntry = entry as PerformanceNavigationTiming
            console.log('Page load metrics:', {
              domContentLoaded:
                navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart,
              loadComplete: navigationEntry.loadEventEnd - navigationEntry.fetchStart,
            })
          }

          if (entry.entryType === 'measure') {
            if (entry.name.startsWith('input-lag')) {
              metricsRef.current.inputLag = entry.duration
              if (entry.duration > threshold) {
                console.warn(`Input lag exceeded threshold: ${entry.duration}ms > ${threshold}ms`)
              }
            }

            if (entry.name.startsWith('render-time')) {
              metricsRef.current.renderTime = entry.duration
            }

            if (entry.name.startsWith('api-response')) {
              metricsRef.current.apiResponseTime = entry.duration
            }

            onMetricsUpdate?.(metricsRef.current)
          }
        }
      })

      try {
        performanceObserver.observe({ entryTypes: ['navigation', 'measure'] })
      } catch (error) {
        console.warn('Performance monitoring not supported:', error)
      }
    }

    return () => {
      performanceObserver?.disconnect()
    }
  }, [enabled, threshold, onMetricsUpdate])

  // Monitor input events for lag measurement
  useEffect(() => {
    if (!enabled) return

    const handleInputStart = (e: Event) => {
      const timestamp = performance.now()
      const target = e.target as HTMLElement
      target.dataset.inputStart = timestamp.toString()
    }

    const handleInputEnd = (e: Event) => {
      const target = e.target as HTMLElement
      const startTime = target.dataset.inputStart

      if (startTime) {
        performance.mark('input-start')
        performance.mark('input-end')
        performance.measure(`input-lag-${Date.now()}`, 'input-start', 'input-end')

        delete target.dataset.inputStart
      }
    }

    // Monitor textarea inputs specifically for note input performance
    const textareas = document.querySelectorAll('textarea[data-note-input]')
    textareas.forEach(textarea => {
      textarea.addEventListener('input', handleInputStart)
      textarea.addEventListener('blur', handleInputEnd)
    })

    return () => {
      textareas.forEach(textarea => {
        textarea.removeEventListener('input', handleInputStart)
        textarea.removeEventListener('blur', handleInputEnd)
      })
    }
  }, [enabled])

  return null // This is a monitoring component with no UI
}

/**
 * Performance utility functions
 */
export const performanceUtils = {
  /**
   * Measure API response time
   */
  measureApiCall: async function <T>(name: string, apiCall: () => Promise<T>): Promise<T> {
    const startMark = `api-start-${name}`
    const endMark = `api-end-${name}`
    const measureName = `api-response-${name}`

    window.performance?.mark(startMark)

    try {
      const result = await apiCall()
      window.performance?.mark(endMark)
      window.performance?.measure(measureName, startMark, endMark)
      return result
    } catch (error) {
      window.performance?.mark(endMark)
      window.performance?.measure(`${measureName}-error`, startMark, endMark)
      throw error
    }
  },

  /**
   * Measure render time for components
   */
  measureRender(name: string, renderFn: () => void): void {
    const startMark = `render-start-${name}`
    const endMark = `render-end-${name}`
    const measureName = `render-time-${name}`

    window.performance?.mark(startMark)
    renderFn()
    window.performance?.mark(endMark)
    window.performance?.measure(measureName, startMark, endMark)
  },

  /**
   * Get performance metrics for the current session
   */
  getMetrics(): PerformanceEntry[] {
    return window.performance?.getEntriesByType?.('measure') || []
  },

  /**
   * Clear all performance measurements
   */
  clearMetrics(): void {
    window.performance?.clearMeasures?.()
    window.performance?.clearMarks?.()
  },
}

export default PerformanceMonitor
