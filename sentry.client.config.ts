import * as Sentry from '@sentry/nextjs'

// Read from public env to avoid importing server-only modules in the browser
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
const SENTRY_ENV = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development'

// If DSN is not provided, skip initializing Sentry on client to avoid noisy errors
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENV,

    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: false,

    integrations: [
      // Capture performance data for browser tracing
      Sentry.browserTracingIntegration({
        // Only instrument router transitions that originate from Next.js
        instrumentNavigation: true,
        instrumentPageLoad: true,
      }),

      // Session replay for debugging
      Sentry.replayIntegration({
        // Capture only 10% of normal sessions
        // Capture 100% of sessions with errors
        maskAllText: true,
        blockAllMedia: true,
      }),

      // User feedback integration
      Sentry.feedbackIntegration({
        colorScheme: 'system',
      }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // We recommend adjusting this value in production
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Enable logs to be sent to Sentry
    _experiments: { enableLogs: true },

    // Filter transactions to reduce noise
    beforeSendTransaction(event) {
      // Filter out health check requests and internal Next.js routes
      if (event.transaction?.includes('/_next/') || event.transaction?.includes('/api/health')) {
        return null
      }
      return event
    },

    // Filter errors to reduce noise
    beforeSend(event) {
      // Filter out network errors and other non-actionable errors
      if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
        return null
      }
      return event
    },
  })
}

// This export will instrument router navigations, and is only relevant if you enable tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
