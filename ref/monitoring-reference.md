# Monitoring Reference

This document provides comprehensive reference for the Context application's monitoring infrastructure.

## Monitoring Stack Overview

The Context application uses a three-tier monitoring approach:

1. **Vercel Analytics** - Web performance and user behavior analytics
2. **Sentry** - Error tracking, performance monitoring, and alerting
3. **Supabase Dashboard** - Database metrics and infrastructure monitoring

## Vercel Analytics

### Configuration

Vercel Analytics is configured in the root layout (`app/layout.tsx`):

```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Features

- **Page View Tracking**: Automatic page view tracking
- **Web Vitals**: Core Web Vitals monitoring (LCP, FID, CLS)
- **User Flow**: User navigation patterns
- **Performance Metrics**: Load times and rendering performance
- **Privacy-First**: No cookies, GDPR/CCPA compliant

### Accessing Data

Visit your [Vercel Dashboard](https://vercel.com/dashboard) → Project → Analytics tab.

## Sentry Error Monitoring

### Configuration Files

The application uses three Sentry configuration files:

#### `sentry.client.config.ts` - Client-side Configuration

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  sendDefaultPii: false, // Privacy-first
  tracesSampleRate: env.NODE_ENV === 'development' ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.feedbackIntegration({
      colorScheme: 'system',
    }),
  ],
})
```

#### `sentry.server.config.ts` - Server-side Configuration

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  sendDefaultPii: true, // Server can send PII
  tracesSampleRate: env.NODE_ENV === 'development' ? 1.0 : 0.1,
  integrations: [Sentry.prismaIntegration(), Sentry.httpIntegration()],
})
```

#### `sentry.edge.config.ts` - Edge Runtime Configuration

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  sendDefaultPii: true,
  tracesSampleRate: 0.1,
})
```

### Environment Variables

Required environment variables:

```bash
# Required
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
NEXT_PUBLIC_SENTRY_ENVIRONMENT="development" # or "production"

# Optional (for source maps)
SENTRY_AUTH_TOKEN="your_sentry_auth_token"
SENTRY_ORG="your-sentry-org-slug"
SENTRY_PROJECT="your-sentry-project-slug"
```

### Features

- **Error Tracking**: Automatic error capture and stack traces
- **Performance Monitoring**: API response times and database queries
- **Session Replay**: Visual reproduction of user sessions (10% sample rate)
- **User Feedback**: In-app feedback widget
- **Release Tracking**: Automatic release detection
- **Source Maps**: Enhanced stack traces with source code

## Health Check System

### Endpoint: `/api/health`

The health check endpoint provides comprehensive system status monitoring.

#### Response Structure

```typescript
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  services: {
    database: ServiceStatus
    supabase: ServiceStatus
    openai?: ServiceStatus
    redis?: ServiceStatus
  }
  features: FeatureFlags
  monitoring: MonitoringStatus
  uptime: number
}
```

#### Service Status Codes

- **`up`**: Service is fully operational
- **`degraded`**: Service has performance issues but is functional
- **`down`**: Service is unavailable

#### HTTP Status Mapping

- **200**: All systems healthy
- **206**: Some systems degraded but functional
- **503**: Critical systems down

### Health Dashboard

A React component provides real-time health monitoring at `/admin/health`:

```typescript
import { HealthDashboard } from '@/components/monitoring/health-dashboard'

// Displays:
// - Overall system status
// - Individual service health
// - Feature flag status
// - Monitoring system status
// - Real-time updates (30s intervals)
```

## Performance Monitoring

### Monitoring Utilities (`/lib/monitoring.ts`)

#### PerformanceMonitor Class

```typescript
import { performanceMonitor } from '@/lib/monitoring'

// Time an operation
performanceMonitor.startTiming('api_call')
// ... do work
const duration = performanceMonitor.endTiming('api_call')

// Report custom metrics
performanceMonitor.reportMetric('user_action', 1, 'count')
```

#### Database Monitor

```typescript
import { dbMonitor } from '@/lib/monitoring'

// Monitor database queries
const result = await dbMonitor.query(
  'fetch_user_notes',
  () => prisma.note.findMany({ where: { userId } }),
  { userId }
)
```

#### API Monitor

```typescript
import { apiMonitor } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  return apiMonitor.route('/api/notes', 'GET', async () => {
    // Your API logic here
    return NextResponse.json(data)
  })
}
```

#### AI Monitor

```typescript
import { aiMonitor } from '@/lib/monitoring'

const embedding = await aiMonitor.embedding(text, () =>
  openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
)
```

## Alert System

### Alert Manager (`/lib/alerts.ts`)

#### Pre-configured Alert Rules

```typescript
export const alertRules = {
  highErrorRate: {
    name: 'High Error Rate',
    severity: 'high',
    threshold: 0.01, // 1% error rate
    window: 300000, // 5 minutes
  },
  slowApiResponse: {
    name: 'Slow API Response',
    severity: 'medium',
    threshold: 2000, // 2 seconds
    window: 600000, // 10 minutes
  },
  databaseConnectionLimit: {
    name: 'Database Connection Limit',
    severity: 'critical',
    threshold: 0.8, // 80% of connections used
    window: 300000, // 5 minutes
  },
}
```

#### Alert Utilities

```typescript
import { alertUtils } from '@/lib/alerts'

// Check error rates
alertUtils.checkErrorRate(errorCount, totalCount, { endpoint: '/api/notes' })

// Check response times
alertUtils.checkResponseTime(responseTime, '/api/search')

// Check database connections
alertUtils.checkDatabaseConnections(currentConnections, maxConnections)

// Trigger custom alert
alertUtils.triggerCustomAlert('Custom Issue', 'Description of the issue', 'high', {
  additionalData: 'value',
})
```

## Supabase Dashboard Monitoring

### Available Metrics

- **Database Performance**: Query execution times, connection pool usage
- **API Usage**: Request rates, response times, error rates
- **Storage**: File uploads, storage usage, bandwidth
- **Auth**: User sessions, login rates, authentication errors
- **Real-time**: WebSocket connections, message throughput

### Accessing Metrics

1. Visit [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to Reports → Performance or Logs

### Custom Metrics via API

```typescript
// Access Supabase metrics programmatically
const response = await fetch(`https://${projectRef}.supabase.co/customer/v1/privileged/metrics`, {
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
  },
})
```

## Performance Thresholds

### Response Time Expectations

| Service    | Acceptable | Slow      | Critical  |
| ---------- | ---------- | --------- | --------- |
| Health API | < 500ms    | < 1000ms  | > 1000ms  |
| Database   | < 200ms    | < 1000ms  | > 1000ms  |
| Supabase   | < 300ms    | < 2000ms  | > 2000ms  |
| OpenAI     | < 2000ms   | < 10000ms | > 10000ms |
| Redis      | < 50ms     | < 200ms   | > 200ms   |

### Error Rate Thresholds

- **Normal**: < 0.1% error rate
- **Warning**: 0.1% - 1% error rate
- **Critical**: > 1% error rate

## Troubleshooting

### Common Issues

1. **Sentry Not Receiving Events**:
   - Verify DSN configuration
   - Check network connectivity
   - Validate environment variables

2. **Health Check Failures**:
   - Check service connectivity
   - Verify environment variables
   - Review service logs

3. **Performance Issues**:
   - Check database query performance
   - Monitor memory usage
   - Review API response times

### Debug Commands

```bash
# Check health endpoint
curl https://your-app.vercel.app/api/health

# Test Sentry integration
pnpm sentry-cli info

# Validate environment
pnpm db:check
```

## Best Practices

### Privacy and Security

1. **Client-side Sentry**: `sendDefaultPii: false` to protect user data
2. **Session Replay**: Mask sensitive content with `maskAllText: true`
3. **Error Filtering**: Filter out non-actionable errors
4. **Data Scrubbing**: Remove sensitive data from error reports

### Performance

1. **Sample Rates**: Use appropriate sample rates for production
2. **Alert Thresholds**: Set realistic thresholds based on normal operation
3. **Monitoring Overhead**: Keep monitoring lightweight
4. **Cache Usage**: Implement caching to reduce monitoring impact

### Alerting

1. **Alert Fatigue**: Avoid too many low-priority alerts
2. **Escalation**: Define clear escalation procedures
3. **Resolution**: Implement automatic resolution detection
4. **Context**: Include relevant metadata in alerts

## External Links

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Supabase Observability](https://supabase.com/docs/guides/platform/metrics)
