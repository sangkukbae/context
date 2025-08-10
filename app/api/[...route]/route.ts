import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import type { ApiResponse } from '@/lib/types'
import { env, isProduction, validateRequiredServices } from '@/lib/env'

// Validate required services on startup - run in all environments
try {
  validateRequiredServices()
} catch (error) {
  console.error('Environment validation failed:', error)
  // In production, log the error but don't crash the app
  if (isProduction) {
    console.error('⚠️  Running with degraded functionality due to missing services')
  }
}

// Create the main Hono app
const app = new Hono().basePath('/api')

// Security headers middleware
app.use('*', async (c, next) => {
  // Set security headers
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')

  // CORS configuration
  c.header(
    'Access-Control-Allow-Origin',
    isProduction ? env.APP_URL || 'https://your-domain.com' : '*'
  )
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  c.header('Access-Control-Max-Age', '86400')

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  await next()
})

// Health check endpoint
app.get('/health', c => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'context-api',
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || '0.1.0',
    features: {
      aiClustering: env.ENABLE_AI_CLUSTERING,
      semanticSearch: env.ENABLE_SEMANTIC_SEARCH,
      documentGeneration: env.ENABLE_DOCUMENT_GENERATION,
      realTimeSync: env.ENABLE_REAL_TIME_SYNC,
    },
  })
})

// Example API endpoint for testing
app.get('/test', c => {
  const response: ApiResponse<{ message: string; method: string; path: string }> = {
    success: true,
    data: {
      message: 'Context API is working!',
      method: c.req.method,
      path: c.req.path,
    },
    timestamp: new Date().toISOString(),
  }

  return c.json(response)
})

// Error handling middleware
app.onError((err, c) => {
  console.error('API Error:', err)

  const errorResponse: ApiResponse = {
    success: false,
    error: 'Internal Server Error',
    message: isProduction ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString(),
  }

  return c.json(errorResponse, 500)
})

// Handle 404s
app.notFound(c => {
  const notFoundResponse: ApiResponse = {
    success: false,
    error: 'Not Found',
    message: `Route ${c.req.path} not found`,
    timestamp: new Date().toISOString(),
  }

  return c.json(notFoundResponse, 404)
})

// Export handlers for Next.js App Router
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
