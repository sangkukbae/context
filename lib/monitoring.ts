import * as Sentry from '@sentry/nextjs'
import { env } from './env'

// Performance monitoring utilities
export class PerformanceMonitor {
  private metrics = new Map<string, number>()

  // Start timing an operation
  startTiming(operation: string): void {
    this.metrics.set(operation, Date.now())
  }

  // End timing and report to Sentry
  endTiming(operation: string, metadata?: Record<string, unknown>): number {
    const start = this.metrics.get(operation)
    if (!start) {
      console.warn(`No start time found for operation: ${operation}`)
      return 0
    }

    const duration = Date.now() - start
    this.metrics.delete(operation)

    // Report timing as breadcrumb for now (metrics API may not be available in this Sentry version)
    Sentry.addBreadcrumb({
      message: `Timing: ${operation}`,
      category: 'performance',
      level: 'info',
      data: {
        duration,
        ...metadata,
        environment: env.NODE_ENV,
      },
    })

    return duration
  }

  // Report custom metrics to Sentry
  reportMetric(
    name: string,
    value: number,
    unit: 'byte' | 'count' | 'duration' | 'information' | 'ratio' | 'none' = 'none',
    tags?: Record<string, string>
  ): void {
    // Report metric as breadcrumb for now (metrics API may not be available in this Sentry version)
    Sentry.addBreadcrumb({
      message: `Metric: ${name}`,
      category: 'metric',
      level: 'info',
      data: {
        name,
        value,
        unit,
        ...tags,
        environment: env.NODE_ENV,
      },
    })
  }
}

// Database operation monitoring
export const dbMonitor = {
  // Monitor database query performance
  async query<T>(
    operation: string,
    queryFn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return await Sentry.startSpan(
      {
        op: 'db.query',
        name: operation,
      },
      async _span => {
        try {
          const start = Date.now()
          const result = await queryFn()
          const duration = Date.now() - start

          // Report database query metrics as breadcrumbs
          Sentry.addBreadcrumb({
            message: `Database query: ${operation}`,
            category: 'database',
            level: 'info',
            data: {
              operation,
              duration,
              status: 'success',
              ...metadata,
            },
          })

          return result
        } catch (error) {
          Sentry.addBreadcrumb({
            message: `Database query error: ${operation}`,
            category: 'database',
            level: 'error',
            data: {
              operation,
              error: error instanceof Error ? error.message : 'Unknown error',
              ...metadata,
            },
          })

          Sentry.captureException(error, {
            tags: {
              operation: 'database.query',
              query_name: operation,
            },
            contexts: {
              database: {
                operation,
                ...metadata,
              },
            },
          })

          throw error
        }
      }
    )
  },

  // Monitor slow queries
  reportSlowQuery(query: string, duration: number, metadata?: Record<string, unknown>): void {
    if (duration > 1000) {
      // Queries longer than 1 second
      Sentry.addBreadcrumb({
        message: 'Slow database query detected',
        category: 'database',
        level: 'warning',
        data: {
          query,
          duration,
          ...metadata,
        },
      })

      Sentry.captureMessage('Slow database query', 'warning')
    }
  },
}

// API monitoring utilities
export const apiMonitor = {
  // Monitor API route performance
  async route<T>(
    routeName: string,
    method: string,
    handler: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return await Sentry.startSpan(
      {
        op: 'http.server',
        name: `${method} ${routeName}`,
      },
      async _span => {
        try {
          const start = Date.now()
          const result = await handler()
          const duration = Date.now() - start

          // Report API metrics as breadcrumbs
          Sentry.addBreadcrumb({
            message: `API request: ${method} ${routeName}`,
            category: 'api',
            level: 'info',
            data: {
              route: routeName,
              method,
              duration,
              status: 'success',
              ...metadata,
            },
          })

          return result
        } catch (error) {
          Sentry.addBreadcrumb({
            message: `API request error: ${method} ${routeName}`,
            category: 'api',
            level: 'error',
            data: {
              route: routeName,
              method,
              error: error instanceof Error ? error.message : 'Unknown error',
              ...metadata,
            },
          })

          Sentry.captureException(error, {
            tags: {
              operation: 'api.request',
              route: routeName,
              method,
            },
            contexts: {
              api: {
                route: routeName,
                method,
                ...metadata,
              },
            },
          })

          throw error
        }
      }
    )
  },

  // Monitor external API calls
  async external<T>(
    serviceName: string,
    endpoint: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return await Sentry.startSpan(
      {
        op: 'http.client',
        name: `${serviceName} ${endpoint}`,
      },
      async _span => {
        try {
          const start = Date.now()
          const result = await operation()
          const duration = Date.now() - start

          // Report external API metrics as breadcrumbs
          Sentry.addBreadcrumb({
            message: `External API call: ${serviceName} ${endpoint}`,
            category: 'http',
            level: 'info',
            data: {
              service: serviceName,
              endpoint,
              duration,
              status: 'success',
              ...metadata,
            },
          })

          return result
        } catch (error) {
          Sentry.addBreadcrumb({
            message: `External API error: ${serviceName} ${endpoint}`,
            category: 'http',
            level: 'error',
            data: {
              service: serviceName,
              endpoint,
              error: error instanceof Error ? error.message : 'Unknown error',
              ...metadata,
            },
          })

          Sentry.captureException(error, {
            tags: {
              operation: 'external.api',
              service: serviceName,
              endpoint,
            },
          })

          throw error
        }
      }
    )
  },
}

// AI operation monitoring
export const aiMonitor = {
  // Monitor OpenAI API calls
  async openaiCall<T>(
    operation: string,
    model: string,
    handler: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return apiMonitor.external('openai', operation, handler, {
      model,
      ...metadata,
    })
  },

  // Monitor embedding operations
  async embedding<T>(
    text: string,
    handler: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return await Sentry.startSpan(
      {
        op: 'ai.embedding',
        name: 'Generate embedding',
      },
      async _span => {
        try {
          const result = await handler()

          Sentry.addBreadcrumb({
            message: 'AI embedding generated',
            category: 'ai',
            level: 'info',
            data: {
              text_length: text.length,
              status: 'success',
              ...metadata,
            },
          })

          return result
        } catch (error) {
          Sentry.addBreadcrumb({
            message: 'AI embedding failed',
            category: 'ai',
            level: 'error',
            data: {
              text_length: text.length,
              error: error instanceof Error ? error.message : 'Unknown error',
              ...metadata,
            },
          })

          throw error
        }
      }
    )
  },
}

// User action monitoring
export const userMonitor = {
  // Track user actions
  trackAction(action: string, userId?: string, metadata?: Record<string, unknown>): void {
    Sentry.addBreadcrumb({
      message: `User action: ${action}`,
      category: 'user',
      level: 'info',
      data: {
        action,
        userId,
        ...metadata,
      },
    })
  },

  // Set user context
  setUser(userId: string, email?: string, metadata?: Record<string, unknown>): void {
    Sentry.setUser({
      id: userId,
      email,
      ...metadata,
    })
  },

  // Clear user context
  clearUser(): void {
    Sentry.setUser(null)
  },
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Error reporting utilities
export const errorReporter = {
  // Report application errors
  reportError(error: Error, context?: string, metadata?: Record<string, unknown>): void {
    Sentry.captureException(error, {
      tags: {
        context,
      },
      extra: {
        ...metadata,
      },
    })
  },

  // Report custom messages
  reportMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
    metadata?: Record<string, unknown>
  ): void {
    Sentry.captureMessage(message, level)

    if (metadata) {
      Sentry.withScope(scope => {
        scope.setExtras(metadata)
        Sentry.captureMessage(message, level)
      })
    }
  },
}
