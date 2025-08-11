# Monitoring Setup Guide

## Overview

The Context application is configured with comprehensive monitoring using three primary systems:

1. **Vercel Analytics** - Web analytics and performance monitoring
2. **Sentry** - Error tracking and performance monitoring
3. **Supabase Dashboard** - Database and infrastructure monitoring

## 1. Vercel Analytics

### Setup Instructions

1. **Automatic Setup**: If your project is deployed on Vercel, analytics are automatically enabled.

2. **Manual Configuration**: The `@vercel/analytics` package is already installed and configured in the root layout.

3. **Environment Variables**: No additional environment variables needed for basic analytics.

### Features

- Page view tracking
- Web Vitals monitoring
- User engagement metrics
- Privacy-compliant tracking (no cookies required)

### Accessing Data

- Visit your [Vercel Dashboard](https://vercel.com/dashboard)
- Navigate to your project
- Click on the "Analytics" tab

## 2. Sentry Error Monitoring

### Setup Instructions

1. **Create Sentry Account**:
   - Go to [sentry.io](https://sentry.io)
   - Create an account or sign in
   - Create a new project for Next.js

2. **Configure Environment Variables**:

   ```bash
   # Required
   SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
   NEXT_PUBLIC_SENTRY_ENVIRONMENT="development" # or "production"

   # Optional (for source maps)
   SENTRY_AUTH_TOKEN="your_sentry_auth_token"
   SENTRY_ORG="your-sentry-org-slug"
   SENTRY_PROJECT="your-sentry-project-slug"
   ```

3. **Generate Auth Token** (for source maps):
   - Go to Sentry Settings > Account > API > Auth Tokens
   - Create a new token with `project:releases` and `org:read` scopes

### Features Enabled

- **Error Tracking**: Automatic capture of unhandled errors
- **Performance Monitoring**: Transaction tracing with 10% sample rate in production
- **Session Replay**: 10% of sessions, 100% of error sessions
- **User Feedback**: Built-in feedback widget
- **Source Maps**: Prettier stack traces (when auth token configured)

### Configuration Files

- `sentry.client.config.ts` - Client-side configuration
- `sentry.server.config.ts` - Server-side configuration
- `sentry.edge.config.ts` - Edge runtime configuration
- `instrumentation.ts` - Sentry instrumentation hook

### Monitoring Integration

The application includes custom monitoring utilities in `/lib/monitoring.ts`:

- `dbMonitor` - Database operation monitoring
- `apiMonitor` - API route performance monitoring
- `aiMonitor` - AI operation monitoring
- `userMonitor` - User action tracking
- `performanceMonitor` - Custom performance metrics

## 3. Supabase Dashboard Monitoring

### Setup Instructions

Supabase Dashboard monitoring is automatically available with your Supabase project.

### Accessing Monitoring

1. **Database Metrics**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Navigate to "Reports" > "Database"

2. **Available Metrics**:
   - CPU usage
   - Memory usage
   - Disk IOPS
   - Database connections
   - Query performance

### Advanced Monitoring

For advanced monitoring, you can set up the Supabase Grafana dashboard:

1. **Access Metrics Endpoint**:

   ```
   https://<project-ref>.supabase.co/customer/v1/privileged/metrics
   ```

2. **Authentication**:
   - Username: `service_role`
   - Password: Your service role key

3. **Deploy Grafana**:
   ```bash
   git clone https://github.com/supabase/supabase-grafana
   cd supabase-grafana
   docker-compose up -d
   ```

## 4. Health Check Endpoint

The application includes a comprehensive health check endpoint at `/api/health`.

### Features

- **Service Status**: Checks database, Supabase, OpenAI, and Redis
- **Performance Metrics**: Response times for each service
- **Feature Flags**: Current status of application features
- **Monitoring Status**: Active monitoring systems
- **Uptime Tracking**: Application uptime since last restart

### Usage

```bash
curl https://your-app.vercel.app/api/health
```

### Health Dashboard Component

A React component is available for displaying health status:

```tsx
import { HealthDashboard } from '@/components/monitoring/health-dashboard'

export default function AdminPage() {
  return (
    <div>
      <h1>System Status</h1>
      <HealthDashboard />
    </div>
  )
}
```

## 5. Production Monitoring Best Practices

### Error Handling

1. **Set up Alerts**:
   - Configure Sentry alerts for error spikes
   - Set up Supabase database alerts
   - Monitor API response times

2. **Error Filtering**:
   - Filter out noise (network errors, chunk load errors)
   - Focus on actionable errors
   - Set up error grouping rules

### Performance Monitoring

1. **Key Metrics to Monitor**:
   - Database query performance
   - API endpoint response times
   - Memory and CPU usage
   - Error rates

2. **Alerting Thresholds**:
   - Response time > 2 seconds
   - Error rate > 1%
   - Database connections > 80% of limit
   - Memory usage > 85%

### Privacy Considerations

1. **Vercel Analytics**:
   - No cookies or personal data collection
   - GDPR/CCPA compliant by default

2. **Sentry Configuration**:
   - `sendDefaultPii: false` on client-side
   - Sensitive data scrubbing enabled
   - IP address collection disabled

## 6. Monitoring Integrations

### Database Operations

```typescript
import { dbMonitor } from '@/lib/monitoring'

// Monitor database queries
const result = await dbMonitor.query(
  'fetch_user_notes',
  () => prisma.note.findMany({ where: { userId } }),
  { userId }
)
```

### API Routes

```typescript
import { apiMonitor } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  return apiMonitor.route('/api/notes', 'GET', async () => {
    // Your API logic here
    return NextResponse.json(data)
  })
}
```

### AI Operations

```typescript
import { aiMonitor } from '@/lib/monitoring'

const embedding = await aiMonitor.embedding(text, () =>
  openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
)
```

## 7. Troubleshooting

### Common Issues

1. **Sentry not receiving events**:
   - Check DSN configuration
   - Verify environment variables
   - Check browser console for errors

2. **High error rates**:
   - Review error patterns in Sentry
   - Check database connection limits
   - Monitor API response times

3. **Performance issues**:
   - Check Supabase dashboard for database metrics
   - Review slow queries in Sentry performance
   - Monitor memory usage

### Debug Mode

Enable debug logging:

```bash
DEBUG_MODE="true"
LOG_LEVEL="debug"
```

## 8. Deployment Checklist

Before deploying to production:

- [ ] Set up Sentry project and configure DSN
- [ ] Set `NEXT_PUBLIC_SENTRY_ENVIRONMENT="production"`
- [ ] Configure Sentry auth token for source maps
- [ ] Enable Supabase dashboard alerts
- [ ] Test health check endpoint
- [ ] Verify all monitoring integrations
- [ ] Set up alerting rules
- [ ] Document incident response procedures

## 9. Alerting and Incident Response

### Recommended Alerts

1. **Application Errors**:
   - Error rate > 1% over 5 minutes
   - New error type detected
   - Performance regression > 50% increase

2. **Infrastructure**:
   - Database connections > 80%
   - CPU usage > 85% for 5 minutes
   - Memory usage > 90%

3. **API Performance**:
   - Response time > 2 seconds
   - Availability < 99.5%

### Incident Response

1. **Check Health Dashboard**: `/api/health`
2. **Review Sentry Issues**: Recent errors and performance issues
3. **Check Supabase Metrics**: Database performance and resource usage
4. **Review Application Logs**: Vercel function logs
5. **Escalate if Needed**: Contact support channels

---

For additional help, refer to the official documentation:

- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Supabase Observability](https://supabase.com/docs/guides/platform/metrics)
