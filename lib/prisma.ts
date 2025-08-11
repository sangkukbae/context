import { PrismaClient } from '@prisma/client'
import { env } from './env'

// PrismaClient configuration for Edge Runtime compatibility
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Edge Runtime compatible Prisma configuration
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: env.DATABASE_URL,
  })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper function for database health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Helper function for graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}

// Vector similarity search helper functions
// Note: These use raw SQL since Prisma doesn't support pgvector natively yet

export async function findSimilarNotes(
  embedding: number[],
  userId: string,
  limit: number = 10,
  threshold: number = 0.7
) {
  return prisma.$queryRaw`
    SELECT 
      id,
      content,
      created_at,
      updated_at,
      metadata,
      (1 - (embedding <=> ${embedding}::vector)) as similarity
    FROM notes 
    WHERE user_id = ${userId}::uuid 
      AND embedding IS NOT NULL
      AND (1 - (embedding <=> ${embedding}::vector)) > ${threshold}
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT ${limit}
  `
}

export async function createEmbeddingIndex(tableName: string, columnName: string) {
  const indexName = `idx_${tableName}_${columnName}_hnsw`

  try {
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY ${indexName} 
      ON ${tableName} 
      USING hnsw (${columnName} vector_cosine_ops)
      WHERE ${columnName} IS NOT NULL
    `
    console.log(`Created HNSW index: ${indexName}`)
  } catch (error) {
    console.error(`Failed to create index ${indexName}:`, error)
  }
}

// Full-text search helpers
export async function searchNotes(query: string, userId: string, limit: number = 20) {
  return prisma.$queryRaw`
    SELECT 
      si.entity_id as id,
      si.content,
      si.title,
      si.tags,
      si.created_at,
      si.updated_at,
      ts_rank_cd(si.search_vector, plainto_tsquery('english', ${query})) as rank
    FROM search_index si
    WHERE si.user_id = ${userId}::uuid
      AND si.entity_type = 'note'
      AND si.search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `
}

export async function searchDocuments(query: string, userId: string, limit: number = 20) {
  return prisma.$queryRaw`
    SELECT 
      si.entity_id as id,
      si.content,
      si.title,
      si.tags,
      si.created_at,
      si.updated_at,
      ts_rank_cd(si.search_vector, plainto_tsquery('english', ${query})) as rank
    FROM search_index si
    WHERE si.user_id = ${userId}::uuid
      AND si.entity_type = 'document'
      AND si.search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `
}

// Hybrid search (combining full-text and vector similarity)
export async function hybridSearch(
  query: string,
  embedding: number[],
  userId: string,
  limit: number = 20
) {
  return prisma.$queryRaw`
    WITH text_search AS (
      SELECT 
        si.entity_id,
        si.entity_type,
        si.content,
        si.title,
        si.tags,
        si.created_at,
        si.updated_at,
        ts_rank_cd(si.search_vector, plainto_tsquery('english', ${query})) as text_rank
      FROM search_index si
      WHERE si.user_id = ${userId}::uuid
        AND si.search_vector @@ plainto_tsquery('english', ${query})
    ),
    vector_search AS (
      SELECT 
        n.id as entity_id,
        'note' as entity_type,
        n.content,
        NULL as title,
        n.metadata->'tags' as tags,
        n.created_at,
        n.updated_at,
        (1 - (n.embedding <=> ${embedding}::vector)) as vector_rank
      FROM notes n
      WHERE n.user_id = ${userId}::uuid
        AND n.embedding IS NOT NULL
        AND (1 - (n.embedding <=> ${embedding}::vector)) > 0.3
    )
    SELECT 
      COALESCE(ts.entity_id, vs.entity_id) as id,
      COALESCE(ts.entity_type, vs.entity_type) as type,
      COALESCE(ts.content, vs.content) as content,
      COALESCE(ts.title, vs.title) as title,
      COALESCE(ts.tags, vs.tags) as tags,
      COALESCE(ts.created_at, vs.created_at) as created_at,
      COALESCE(ts.updated_at, vs.updated_at) as updated_at,
      COALESCE(ts.text_rank, 0) * 0.4 + COALESCE(vs.vector_rank, 0) * 0.6 as combined_rank
    FROM text_search ts
    FULL OUTER JOIN vector_search vs ON ts.entity_id = vs.entity_id
    ORDER BY combined_rank DESC
    LIMIT ${limit}
  `
}

// Database analytics helpers
export async function getUserStats(userId: string) {
  const [userStats] = await Promise.all([
    prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT n.id) as total_notes,
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(DISTINCT c.id) as total_clusters,
        COUNT(DISTINCT CASE WHEN c.status = 'accepted' THEN c.id END) as accepted_clusters,
        COALESCE(SUM((n.metadata->>'wordCount')::int), 0) as total_words,
        CASE 
          WHEN COUNT(n.id) > 0 
          THEN COALESCE(SUM((n.metadata->>'wordCount')::int), 0) / COUNT(n.id)
          ELSE 0 
        END as average_words_per_note,
        EXTRACT(DAYS FROM NOW() - u.created_at) as joined_days_ago
      FROM users u
      LEFT JOIN notes n ON n.user_id = u.id
      LEFT JOIN documents d ON d.user_id = u.id
      LEFT JOIN clusters c ON c.user_id = u.id
      WHERE u.id = ${userId}::uuid
      GROUP BY u.id, u.created_at
    `,
  ])

  return userStats
}

// Connection pool management for serverless
export function createDatabasePool() {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: env.DATABASE_URL,
  })
}

// Type definitions for raw query results
export type SimilarNote = {
  id: string
  content: string
  created_at: Date
  updated_at: Date
  metadata: Record<string, unknown>
  similarity: number
}

export type SearchResult = {
  id: string
  content: string
  title: string | null
  tags: Record<string, unknown>
  created_at: Date
  updated_at: Date
  rank: number
}

export type HybridSearchResult = {
  id: string
  type: string
  content: string
  title: string | null
  tags: Record<string, unknown>
  created_at: Date
  updated_at: Date
  combined_rank: number
}

export type UserStatsResult = {
  total_notes: bigint
  total_documents: bigint
  total_clusters: bigint
  accepted_clusters: bigint
  total_words: number
  average_words_per_note: number
  joined_days_ago: number
}

export default prisma
