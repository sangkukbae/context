import * as Sentry from '@sentry/nextjs'

// Alert severity levels
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

// Alert configuration
export interface AlertConfig {
  name: string
  severity: AlertSeverity
  threshold: number
  window: number // in milliseconds
  description: string
}

// Pre-configured alert rules
export const alertRules: Record<string, AlertConfig> = {
  highErrorRate: {
    name: 'High Error Rate',
    severity: 'high',
    threshold: 0.01, // 1% error rate
    window: 300000, // 5 minutes
    description: 'Error rate is above acceptable threshold',
  },
  slowApiResponse: {
    name: 'Slow API Response',
    severity: 'medium',
    threshold: 2000, // 2 seconds
    window: 300000, // 5 minutes
    description: 'API response times are slower than expected',
  },
  databaseConnectionLimit: {
    name: 'Database Connection Limit',
    severity: 'high',
    threshold: 0.8, // 80% of connection limit
    window: 60000, // 1 minute
    description: 'Database connection usage is approaching limits',
  },
  memoryUsage: {
    name: 'High Memory Usage',
    severity: 'medium',
    threshold: 0.85, // 85% memory usage
    window: 300000, // 5 minutes
    description: 'Memory usage is higher than recommended',
  },
  diskSpace: {
    name: 'Low Disk Space',
    severity: 'high',
    threshold: 0.9, // 90% disk usage
    window: 300000, // 5 minutes
    description: 'Disk space is running low',
  },
  aiServiceFailure: {
    name: 'AI Service Failure',
    severity: 'critical',
    threshold: 5, // 5 consecutive failures
    window: 600000, // 10 minutes
    description: 'AI service is experiencing repeated failures',
  },
}

// Alert state management
class AlertManager {
  private alertCounts = new Map<string, { count: number; lastAlert: number }>()
  private alertStates = new Map<string, boolean>()

  // Check if an alert should be triggered
  shouldTrigger(ruleKey: string, currentValue: number): boolean {
    const rule = alertRules[ruleKey]
    if (!rule) return false

    const now = Date.now()
    const alertData = this.alertCounts.get(ruleKey) || { count: 0, lastAlert: 0 }

    // Check if we're within the time window
    if (now - alertData.lastAlert > rule.window) {
      // Reset count if outside window
      alertData.count = 0
    }

    // Check if threshold is exceeded
    const thresholdExceeded = currentValue >= rule.threshold

    if (thresholdExceeded) {
      alertData.count++
      alertData.lastAlert = now
      this.alertCounts.set(ruleKey, alertData)

      // Trigger alert if we haven't already alerted for this condition
      if (!this.alertStates.get(ruleKey)) {
        this.alertStates.set(ruleKey, true)
        return true
      }
    } else {
      // Reset alert state when condition is resolved
      if (this.alertStates.get(ruleKey)) {
        this.alertStates.set(ruleKey, false)
        this.sendResolutionAlert(ruleKey, rule)
      }
    }

    return false
  }

  // Send an alert
  sendAlert(ruleKey: string, currentValue: number, metadata?: Record<string, unknown>): void {
    const rule = alertRules[ruleKey]
    if (!rule) return

    const alertLevel = this.getSentryLevel(rule.severity)

    Sentry.captureMessage(`ALERT: ${rule.name}`, alertLevel)

    Sentry.withScope(scope => {
      scope.setTag('alert_rule', ruleKey)
      scope.setTag('severity', rule.severity)
      scope.setLevel(alertLevel)

      scope.setContext('alert', {
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
        threshold: rule.threshold,
        currentValue,
        timestamp: new Date().toISOString(),
        ...metadata,
      })

      Sentry.captureMessage(`Alert triggered: ${rule.name}`, alertLevel)
    })

    // Metrics API not available in this SDK version; rely on Sentry events/tags above

    console.error(`[ALERT] ${rule.name}: ${rule.description}`, {
      rule: ruleKey,
      severity: rule.severity,
      threshold: rule.threshold,
      currentValue,
      ...metadata,
    })
  }

  // Send resolution alert
  private sendResolutionAlert(ruleKey: string, rule: AlertConfig): void {
    Sentry.captureMessage(`RESOLVED: ${rule.name}`, 'info')

    Sentry.withScope(scope => {
      scope.setTag('alert_rule', ruleKey)
      scope.setTag('severity', rule.severity)
      scope.setTag('status', 'resolved')

      scope.setContext('alert_resolution', {
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
        resolvedAt: new Date().toISOString(),
      })

      Sentry.captureMessage(`Alert resolved: ${rule.name}`, 'info')
    })

    console.info(`[RESOLVED] ${rule.name}: Alert condition resolved`)
  }

  // Convert alert severity to Sentry level
  private getSentryLevel(severity: AlertSeverity): Sentry.SeverityLevel {
    switch (severity) {
      case 'critical':
        return 'fatal'
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'info'
    }
  }

  // Get current alert state
  getAlertState(ruleKey: string): boolean {
    return this.alertStates.get(ruleKey) || false
  }

  // Get all active alerts
  getActiveAlerts(): string[] {
    return Array.from(this.alertStates.entries())
      .filter(([_, active]) => active)
      .map(([ruleKey]) => ruleKey)
  }
}

// Global alert manager instance
export const alertManager = new AlertManager()

// Utility functions for common alerting scenarios

export const alertUtils = {
  // Monitor error rates
  checkErrorRate(errorCount: number, totalCount: number, metadata?: Record<string, unknown>): void {
    if (totalCount === 0) return

    const errorRate = errorCount / totalCount

    if (alertManager.shouldTrigger('highErrorRate', errorRate)) {
      alertManager.sendAlert('highErrorRate', errorRate, {
        errorCount,
        totalCount,
        errorRate: (errorRate * 100).toFixed(2) + '%',
        ...metadata,
      })
    }
  },

  // Monitor API response times
  checkResponseTime(
    responseTime: number,
    endpoint?: string,
    metadata?: Record<string, unknown>
  ): void {
    if (alertManager.shouldTrigger('slowApiResponse', responseTime)) {
      alertManager.sendAlert('slowApiResponse', responseTime, {
        endpoint,
        responseTimeMs: responseTime,
        ...metadata,
      })
    }
  },

  // Monitor database connections
  checkDatabaseConnections(
    currentConnections: number,
    maxConnections: number,
    metadata?: Record<string, unknown>
  ): void {
    const utilization = currentConnections / maxConnections

    if (alertManager.shouldTrigger('databaseConnectionLimit', utilization)) {
      alertManager.sendAlert('databaseConnectionLimit', utilization, {
        currentConnections,
        maxConnections,
        utilization: (utilization * 100).toFixed(1) + '%',
        ...metadata,
      })
    }
  },

  // Monitor memory usage
  checkMemoryUsage(
    usedMemory: number,
    totalMemory: number,
    metadata?: Record<string, unknown>
  ): void {
    const utilization = usedMemory / totalMemory

    if (alertManager.shouldTrigger('memoryUsage', utilization)) {
      alertManager.sendAlert('memoryUsage', utilization, {
        usedMemoryMB: Math.round(usedMemory / 1024 / 1024),
        totalMemoryMB: Math.round(totalMemory / 1024 / 1024),
        utilization: (utilization * 100).toFixed(1) + '%',
        ...metadata,
      })
    }
  },

  // Monitor disk space
  checkDiskSpace(usedSpace: number, totalSpace: number, metadata?: Record<string, unknown>): void {
    const utilization = usedSpace / totalSpace

    if (alertManager.shouldTrigger('diskSpace', utilization)) {
      alertManager.sendAlert('diskSpace', utilization, {
        usedSpaceGB: (usedSpace / 1024 / 1024 / 1024).toFixed(2),
        totalSpaceGB: (totalSpace / 1024 / 1024 / 1024).toFixed(2),
        utilization: (utilization * 100).toFixed(1) + '%',
        ...metadata,
      })
    }
  },

  // Monitor AI service failures
  checkAIServiceHealth(
    failureCount: number,
    service: string,
    metadata?: Record<string, unknown>
  ): void {
    if (alertManager.shouldTrigger('aiServiceFailure', failureCount)) {
      alertManager.sendAlert('aiServiceFailure', failureCount, {
        service,
        consecutiveFailures: failureCount,
        ...metadata,
      })
    }
  },

  // Custom alert
  triggerCustomAlert(
    name: string,
    description: string,
    severity: AlertSeverity,
    metadata?: Record<string, unknown>
  ): void {
    const alertLevel =
      severity === 'critical'
        ? 'fatal'
        : severity === 'high'
          ? 'error'
          : severity === 'medium'
            ? 'warning'
            : 'info'

    Sentry.captureMessage(`CUSTOM ALERT: ${name}`, alertLevel)

    Sentry.withScope(scope => {
      scope.setTag('alert_type', 'custom')
      scope.setTag('severity', severity)

      scope.setContext('custom_alert', {
        name,
        description,
        severity,
        timestamp: new Date().toISOString(),
        ...metadata,
      })

      Sentry.captureMessage(`Custom alert: ${name}`, alertLevel)
    })

    console.error(`[CUSTOM ALERT] ${name}: ${description}`, {
      severity,
      ...metadata,
    })
  },
}
