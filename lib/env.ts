import 'server-only'
import { z } from 'zod'

// Environment variable schema with validation
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database - Supabase PostgreSQL
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Supabase Database Connection (for Prisma)
  SUPABASE_DB_PASSWORD: z.string().optional(),

  // Redis (Upstash) - Optional for advanced caching
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Vector Database - Using Supabase pgvector (replaces Pinecone)
  // Keeping Pinecone for migration compatibility
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().optional(),
  PINECONE_INDEX_NAME: z.string().default('context-vectors'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // Authentication - Using Supabase Auth (NextAuth.js kept for compatibility)
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string(),

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
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().default('development'),
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

// Parse and validate environment variables
function parseEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed!')
      console.error('Issues found:')
      error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
      })

      console.error('\nPlease check your .env files and update them accordingly.')
      console.error('See .env.example for reference.\n')

      process.exit(1)
    }
    throw error
  }
}

// Exported environment configuration
export const env = parseEnv()

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

// Service availability checks
export const services = {
  hasSupabase: !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasSupabaseServiceRole: !!env.SUPABASE_SERVICE_ROLE_KEY,
  hasOpenAI: !!env.OPENAI_API_KEY,
  hasPinecone: !!(env.PINECONE_API_KEY && env.PINECONE_ENVIRONMENT),
  hasRedis: !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  hasGoogle: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  hasGitHub: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  hasAWS: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY),
  hasSentry: !!env.SENTRY_DSN,
  hasPostHog: !!env.POSTHOG_API_KEY,
  hasResend: !!env.RESEND_API_KEY,
} as const

// Configuration objects for different services
export const database = {
  url: env.DATABASE_URL,
  directUrl: env.DIRECT_URL,
} as const

export const supabase = services.hasSupabase
  ? {
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    }
  : null

export const auth = {
  url: env.NEXTAUTH_URL,
  secret: env.NEXTAUTH_SECRET,
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
} as const

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

  // Check database
  if (!services.hasSupabase) {
    errors.push('Supabase configuration is missing - required for database and auth')
  }

  if (!services.hasSupabaseServiceRole) {
    warnings.push('Supabase service role key is missing - some admin features will be limited')
  }

  // Check AI features
  if (features.aiClustering && !services.hasOpenAI) {
    errors.push('AI clustering is enabled but OpenAI API key is missing')
  }

  if (features.semanticSearch && !services.hasSupabase) {
    errors.push('Semantic search is enabled but requires Supabase pgvector extension')
  }

  if (features.semanticSearch && services.hasPinecone) {
    warnings.push('Both Supabase pgvector and Pinecone are configured - using Supabase pgvector')
  }

  if (features.documentGeneration && !services.hasOpenAI) {
    errors.push('Document generation is enabled but OpenAI API key is missing')
  }

  // Check caching
  if (!services.hasRedis) {
    warnings.push('Redis is not configured - using Supabase built-in caching and sessions')
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
    throw new Error('Invalid service configuration')
  }

  if (warnings.length === 0 && errors.length === 0) {
    console.log('✅ Environment configuration validated successfully')
  }
}
