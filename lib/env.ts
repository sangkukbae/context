import { z } from 'zod'

// Environment variable schema with validation
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Pinecone Vector Database
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().optional(),
  PINECONE_INDEX_NAME: z.string().default('context-vectors'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // NextAuth.js
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Apple Sign-In
  APPLE_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),

  // Application URLs
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_BASE_URL: z.string().url().default('http://localhost:3000/api'),

  // Security
  ENCRYPTION_KEY: z.string().length(32).optional(),
  JWT_SECRET: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // AWS (for file uploads)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  VERCEL_ANALYTICS_ID: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default('https://app.posthog.com'),

  // Email
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().default('noreply@context.app'),

  // Feature Flags
  ENABLE_AI_CLUSTERING: z.coerce.boolean().default(false),
  ENABLE_DOCUMENT_GENERATION: z.coerce.boolean().default(false),
  ENABLE_SEMANTIC_SEARCH: z.coerce.boolean().default(false),
  ENABLE_REAL_TIME_SYNC: z.coerce.boolean().default(true),

  // Background Jobs
  QUEUE_REDIS_URL: z.string().optional(),
  JOB_CONCURRENCY: z.coerce.number().default(5),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  DEBUG_MODE: z.coerce.boolean().default(false),
})

// Safe environment parsing that won't crash the app
function parseEnvSafely() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errorMessage = '❌ Environment validation failed!'

    console.error(errorMessage)
    console.error('Issues found:')
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    })

    console.error('\nPlease check your .env files and update them accordingly.')
    console.error('See .env.example for reference.\n')

    // Return partial config with defaults for missing critical values
    const defaultEnv = {
      NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
      DATABASE_URL: process.env.DATABASE_URL || undefined,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || undefined,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || undefined,
      ...envSchema.parse({}), // Get all defaults from schema
      ...process.env, // Override with actual env vars where available
    }

    console.warn('⚠️  Running with partial configuration - some features may be disabled')
    return defaultEnv
  }

  return result.data
}

// Exported environment configuration
export const env = parseEnvSafely()

// Type-safe environment access
export type Env = z.infer<typeof envSchema>

// Helper functions for common checks
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

// Feature flag helpers
export const features = {
  aiClustering: env.ENABLE_AI_CLUSTERING,
  documentGeneration: env.ENABLE_DOCUMENT_GENERATION,
  semanticSearch: env.ENABLE_SEMANTIC_SEARCH,
  realTimeSync: env.ENABLE_REAL_TIME_SYNC,
} as const

// Service availability checks enhanced
export const services = {
  hasOpenAI: !!env.OPENAI_API_KEY,
  hasPinecone: !!(env.PINECONE_API_KEY && env.PINECONE_ENVIRONMENT),
  hasRedis: !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  hasGoogle: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  hasGitHub: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  hasAWS: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY),
  hasSentry: !!env.SENTRY_DSN,
  hasPostHog: !!env.POSTHOG_API_KEY,
  hasResend: !!env.RESEND_API_KEY,
  hasDatabase: !!env.DATABASE_URL,
  hasAuth: !!(env.NEXTAUTH_URL && env.NEXTAUTH_SECRET),
} as const

// Configuration objects for different services
export const database = services.hasDatabase
  ? {
      url: env.DATABASE_URL!,
      directUrl: env.DIRECT_URL,
    }
  : null

export const auth = services.hasAuth
  ? {
      url: env.NEXTAUTH_URL!,
      secret: env.NEXTAUTH_SECRET!,
      providers: {
        google: services.hasGoogle
          ? {
              clientId: env.GOOGLE_CLIENT_ID!,
              clientSecret: env.GOOGLE_CLIENT_SECRET!,
            }
          : null,
        github: services.hasGitHub
          ? {
              clientId: env.GITHUB_CLIENT_ID!,
              clientSecret: env.GITHUB_CLIENT_SECRET!,
            }
          : null,
      },
    }
  : null

export const ai = {
  openai: services.hasOpenAI
    ? {
        apiKey: env.OPENAI_API_KEY!,
        model: env.OPENAI_MODEL,
        embeddingModel: env.OPENAI_EMBEDDING_MODEL,
      }
    : null,
  pinecone: services.hasPinecone
    ? {
        apiKey: env.PINECONE_API_KEY!,
        environment: env.PINECONE_ENVIRONMENT!,
        indexName: env.PINECONE_INDEX_NAME,
      }
    : null,
} as const

export const redis = services.hasRedis
  ? {
      restUrl: env.UPSTASH_REDIS_REST_URL!,
      restToken: env.UPSTASH_REDIS_REST_TOKEN!,
    }
  : null

export const rateLimit = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
} as const

// Runtime environment validation for critical features
export function validateRequiredServices() {
  const warnings: string[] = []
  const errors: string[] = []

  // Check critical infrastructure
  if (!services.hasDatabase) {
    if (isProduction) {
      errors.push('Database configuration is missing - required for production')
    } else {
      warnings.push('Database is not configured - some features will be disabled')
    }
  }

  if (!services.hasAuth) {
    if (isProduction) {
      errors.push('Authentication configuration is missing - required for production')
    } else {
      warnings.push('Authentication is not configured - auth features will be disabled')
    }
  }

  // Check AI features
  if (features.aiClustering && !services.hasOpenAI) {
    errors.push('AI clustering is enabled but OpenAI API key is missing')
  }

  if (features.semanticSearch && !services.hasPinecone) {
    errors.push('Semantic search is enabled but Pinecone configuration is missing')
  }

  if (features.documentGeneration && !services.hasOpenAI) {
    errors.push('Document generation is enabled but OpenAI API key is missing')
  }

  // Check caching
  if (!services.hasRedis) {
    warnings.push('Redis is not configured - sessions and caching will use in-memory storage')
  }

  // Check monitoring
  if (isProduction && !services.hasSentry) {
    warnings.push('Sentry is not configured for production error monitoring')
  }

  // Log warnings and errors
  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:')
    warnings.forEach(warning => console.warn(`  - ${warning}`))
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:')
    errors.forEach(error => console.error(`  - ${error}`))

    if (isProduction) {
      throw new Error('Invalid service configuration - cannot run in production')
    } else {
      console.warn('⚠️  Continuing in development mode with degraded functionality')
    }
  }

  if (warnings.length === 0 && errors.length === 0) {
    console.log('✅ Environment configuration validated successfully')
  }
}
