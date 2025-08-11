import { NextRequest, NextResponse } from 'next/server'
import { env, services } from '@/lib/env'
import { performanceMonitor, dbMonitor } from '@/lib/monitoring'

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  services: {
    database: {
      status: 'up' | 'down' | 'degraded'
      responseTime?: number
      error?: string
    }
    supabase: {
      status: 'up' | 'down' | 'degraded'
      responseTime?: number
      error?: string
    }
    openai?: {
      status: 'up' | 'down' | 'degraded'
      responseTime?: number
      error?: string
    }
    redis?: {
      status: 'up' | 'down' | 'degraded'
      responseTime?: number
      error?: string
    }
  }
  features: {
    aiClustering: boolean
    documentGeneration: boolean
    semanticSearch: boolean
    realTimeSync: boolean
  }
  monitoring: {
    sentry: boolean
    vercelAnalytics: boolean
    supabaseDashboard: boolean
  }
  uptime: number
}

// Store startup time for uptime calculation
const startTime = Date.now()

async function checkDatabase(): Promise<{
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  error?: string
}> {
  if (!services.hasSupabase) {
    return { status: 'down', error: 'Supabase not configured' }
  }

  try {
    return await dbMonitor.query('health_check', async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

      const start = Date.now()
      const { error } = await supabase.from('_health').select('1').limit(1)
      const responseTime = Date.now() - start

      if (error && !error.message.includes('does not exist')) {
        return { status: 'down' as const, responseTime, error: error.message }
      }

      return { status: 'up' as const, responseTime }
    })
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}

async function checkSupabase(): Promise<{
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  error?: string
}> {
  if (!services.hasSupabase) {
    return { status: 'down', error: 'Supabase not configured' }
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    const start = Date.now()
    const { error } = await supabase.auth.getSession()
    const responseTime = Date.now() - start

    if (error) {
      return { status: 'degraded', responseTime, error: error.message }
    }

    return { status: 'up', responseTime }
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown Supabase error',
    }
  }
}

async function checkOpenAI(): Promise<
  { status: 'up' | 'down' | 'degraded'; responseTime?: number; error?: string } | undefined
> {
  if (!services.hasOpenAI) {
    return undefined
  }

  try {
    const start = Date.now()

    // Simple check to OpenAI API
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'GET',
    })

    const responseTime = Date.now() - start

    if (!response.ok) {
      return {
        status: response.status >= 500 ? 'down' : 'degraded',
        responseTime,
        error: `HTTP ${response.status}`,
      }
    }

    return { status: 'up', responseTime }
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown OpenAI error',
    }
  }
}

async function checkRedis(): Promise<
  { status: 'up' | 'down' | 'degraded'; responseTime?: number; error?: string } | undefined
> {
  if (!services.hasRedis) {
    return undefined
  }

  try {
    const start = Date.now()

    // Simple ping to Redis
    const response = await fetch(env.UPSTASH_REDIS_REST_URL + '/ping', {
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      },
      method: 'GET',
    })

    const responseTime = Date.now() - start

    if (!response.ok) {
      return {
        status: response.status >= 500 ? 'down' : 'degraded',
        responseTime,
        error: `HTTP ${response.status}`,
      }
    }

    return { status: 'up', responseTime }
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    }
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
  performanceMonitor.startTiming('health_check')

  try {
    // Check all services in parallel
    const [databaseHealth, supabaseHealth, openaiHealth, redisHealth] = await Promise.all([
      checkDatabase(),
      checkSupabase(),
      checkOpenAI(),
      checkRedis(),
    ])

    // Determine overall status
    const allServices = [databaseHealth, supabaseHealth, openaiHealth, redisHealth].filter(Boolean)
    const hasDown = allServices.some(service => service?.status === 'down')
    const hasDegraded = allServices.some(service => service?.status === 'degraded')

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (hasDown) {
      overallStatus = 'unhealthy'
    } else if (hasDegraded) {
      overallStatus = 'degraded'
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: env.NODE_ENV,
      services: {
        database: databaseHealth,
        supabase: supabaseHealth,
        ...(openaiHealth && { openai: openaiHealth }),
        ...(redisHealth && { redis: redisHealth }),
      },
      features: {
        aiClustering: env.ENABLE_AI_CLUSTERING,
        documentGeneration: env.ENABLE_DOCUMENT_GENERATION,
        semanticSearch: env.ENABLE_SEMANTIC_SEARCH,
        realTimeSync: env.ENABLE_REAL_TIME_SYNC,
      },
      monitoring: {
        sentry: !!env.SENTRY_DSN,
        vercelAnalytics: true, // Always enabled when @vercel/analytics is installed
        supabaseDashboard: services.hasSupabase,
      },
      uptime: Date.now() - startTime,
    }

    const duration = performanceMonitor.endTiming('health_check')

    // Log health check metrics
    performanceMonitor.reportMetric('health_check.duration', duration, 'duration')
    performanceMonitor.reportMetric(
      'health_check.services.up',
      allServices.filter(s => s?.status === 'up').length,
      'count'
    )
    performanceMonitor.reportMetric(
      'health_check.services.down',
      allServices.filter(s => s?.status === 'down').length,
      'count'
    )

    return NextResponse.json(response, {
      status: overallStatus === 'unhealthy' ? 503 : overallStatus === 'degraded' ? 206 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    performanceMonitor.endTiming('health_check')

    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        environment: env.NODE_ENV,
        services: {
          database: { status: 'down', error: 'Health check failed' },
          supabase: { status: 'down', error: 'Health check failed' },
        },
        features: {
          aiClustering: false,
          documentGeneration: false,
          semanticSearch: false,
          realTimeSync: false,
        },
        monitoring: {
          sentry: false,
          vercelAnalytics: false,
          supabaseDashboard: false,
        },
        uptime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as HealthCheckResponse & { error: string },
      { status: 503 }
    )
  }
}
