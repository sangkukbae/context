# Database Reference

This document provides comprehensive reference for the Context application's database schema and Supabase integration.

## Database Overview

The Context application uses **PostgreSQL** via **Supabase** with the following key features:

- **ORM**: Prisma for type-safe database operations
- **Extensions**: pgvector for embeddings, uuid-ossp for UUID generation
- **Features**: Full-text search, vector similarity search, JSONB storage
- **Authentication**: Integrated with Supabase Auth

## Database Schema

### Core Models

#### User Model

Stores user account information and preferences.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  avatar VARCHAR,
  email_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Preferences as JSONB
  preferences JSONB DEFAULT '{"theme": "system", "autoSave": true, "notifications": true, "clusterSuggestions": true}',

  -- Subscription information
  subscription_plan user_subscription_plan DEFAULT 'free',
  subscription_status user_subscription_status,
  subscription_current_period_end TIMESTAMPTZ
);
```

**Prisma Model:**

```typescript
model User {
  id            String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  email         String    @unique
  name          String?
  avatar        String?
  emailVerified DateTime? @map("email_verified") @db.Timestamptz
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  preferences Json @default("{ \"theme\": \"system\", \"autoSave\": true, \"notifications\": true, \"clusterSuggestions\": true }")

  subscriptionPlan             UserSubscriptionPlan    @default(free) @map("subscription_plan")
  subscriptionStatus           UserSubscriptionStatus? @map("subscription_status")
  subscriptionCurrentPeriodEnd DateTime?               @map("subscription_current_period_end") @db.Timestamptz

  // Relations
  notes        Note[]
  clusters     Cluster[]
  documents    Document[]
  accounts     Account[]
  sessions     Session[]
  activityLogs ActivityLog[]
  searchIndex  SearchIndex[]

  @@map("users")
}
```

#### Note Model

Core note storage with vector embeddings for semantic search.

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata as JSONB
  metadata JSONB DEFAULT '{"wordCount": 0, "characterCount": 0, "tags": []}',

  -- Vector embedding for semantic search
  embedding VECTOR(1536),
  embedding_updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC);
CREATE INDEX idx_notes_cluster ON notes(cluster_id);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);
```

**Key Features:**

- **Vector Embeddings**: 1536-dimension vectors for OpenAI embeddings
- **JSONB Metadata**: Flexible metadata storage (word count, tags, etc.)
- **Soft Clustering**: Optional cluster assignment

#### Cluster Model

AI-generated note groupings with confidence scoring.

```sql
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cluster metrics
  confidence DECIMAL DEFAULT 0.0,
  note_count INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0,
  themes JSONB DEFAULT '[]',

  -- Suggestion lifecycle
  suggested_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  status cluster_status DEFAULT 'suggested'
);
```

**Cluster Lifecycle:**

1. **Suggested**: AI-generated cluster awaiting user action
2. **Accepted**: User approved cluster
3. **Dismissed**: User rejected cluster

#### Document Model

Generated documents from note clusters.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
  status document_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Document metrics
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  version INTEGER DEFAULT 1,

  -- Sharing configuration
  is_public BOOLEAN DEFAULT FALSE,
  share_id VARCHAR UNIQUE,
  allow_comments BOOLEAN DEFAULT FALSE,
  share_expires_at TIMESTAMPTZ,
  share_password_hash VARCHAR
);
```

### Authentication Models

#### Account Model (OAuth Providers)

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,
  provider_account_id VARCHAR NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR,
  scope VARCHAR,
  id_token TEXT,
  session_state VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider, provider_account_id)
);
```

#### Session Model

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token VARCHAR UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Search and Activity Models

#### Search Index Model

Optimized search index for full-text and semantic search.

```sql
CREATE TABLE search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type VARCHAR NOT NULL, -- 'note' or 'document'
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title VARCHAR,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Full-text search vector (generated column)
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || content)
  ) STORED,

  UNIQUE(entity_id, entity_type)
);

-- Full-text search index
CREATE INDEX idx_search_vector ON search_index USING GIN(search_vector);
```

#### Activity Log Model

User action tracking for analytics and debugging.

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL, -- 'note', 'cluster', 'document', 'user'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Background Jobs and Caching

#### Job Queue Model

Asynchronous job processing for AI operations.

```sql
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type job_type NOT NULL,
  status job_status DEFAULT 'pending',
  payload JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ
);
```

**Job Types:**

- `embedding` - Generate text embeddings
- `clustering` - Perform note clustering
- `document_generation` - Generate documents from clusters

#### Embedding Cache Model

Cache for expensive embedding operations.

```sql
CREATE TABLE embedding_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_hash VARCHAR UNIQUE NOT NULL, -- SHA-256 hash
  embedding VECTOR(1536) NOT NULL,
  model VARCHAR DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

#### Rate Limiting Model

API rate limiting storage.

```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR UNIQUE NOT NULL, -- format: "user:action" or "ip:action"
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
```

## Database Configuration

### Environment Variables

```bash
# Database connection
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres?schema=public"

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon_key]"
SUPABASE_SERVICE_ROLE_KEY="[service_role_key]"
```

### Prisma Configuration

```typescript
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "fullTextSearchPostgres"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [uuidOssp(map: "uuid-ossp"), pgcrypto, vector]
}
```

### Required PostgreSQL Extensions

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

## Supabase Integration

### Client Configuration

#### Browser Client (`/lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
```

#### Server Client (`/lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Handle server component context
        }
      },
    },
  })
}
```

### Row Level Security (RLS)

Supabase RLS policies for data security:

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Similar policies for clusters, documents, etc.
```

### Real-time Subscriptions

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Subscribe to note changes
const subscription = supabase
  .channel('notes-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notes',
      filter: `user_id=eq.${userId}`,
    },
    payload => {
      console.log('Note updated:', payload)
    }
  )
  .subscribe()

// Cleanup
subscription.unsubscribe()
```

## Database Operations

### Prisma Client Usage

#### Basic CRUD Operations

```typescript
import { prisma } from '@/lib/prisma'

// Create note
const note = await prisma.note.create({
  data: {
    content: 'My new note',
    userId: user.id,
    metadata: {
      wordCount: 3,
      characterCount: 11,
      tags: [],
    },
  },
})

// Find notes with pagination
const notes = await prisma.note.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: (page - 1) * 20,
  include: {
    cluster: true,
  },
})

// Update note
const updatedNote = await prisma.note.update({
  where: { id: noteId },
  data: {
    content: 'Updated content',
    metadata: {
      wordCount: 2,
      characterCount: 15,
      tags: ['updated'],
    },
  },
})

// Delete note (soft delete)
const deletedNote = await prisma.note.update({
  where: { id: noteId },
  data: {
    // Move to archived status or add deletedAt field
  },
})
```

#### Vector Operations

```typescript
// Raw SQL for vector operations
const similarNotes = await prisma.$queryRaw`
  SELECT id, content, 1 - (embedding <=> ${embedding}::vector) as similarity
  FROM notes
  WHERE user_id = ${userId}::uuid
    AND embedding IS NOT NULL
  ORDER BY embedding <=> ${embedding}::vector
  LIMIT 10
`

// Update embedding
await prisma.$executeRaw`
  UPDATE notes 
  SET embedding = ${embedding}::vector,
      embedding_updated_at = NOW()
  WHERE id = ${noteId}::uuid
`
```

#### Full-text Search

```typescript
// Search using PostgreSQL full-text search
const searchResults = await prisma.$queryRaw`
  SELECT 
    si.entity_id,
    si.entity_type,
    si.title,
    si.content,
    ts_rank(si.search_vector, plainto_tsquery('english', ${query})) as rank
  FROM search_index si
  WHERE si.user_id = ${userId}::uuid
    AND si.search_vector @@ plainto_tsquery('english', ${query})
  ORDER BY rank DESC
  LIMIT ${limit}
`
```

### Performance Optimization

#### Indexes

```sql
-- Core performance indexes
CREATE INDEX CONCURRENTLY idx_notes_user_created ON notes(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_notes_embedding ON notes USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX CONCURRENTLY idx_search_vector ON search_index USING GIN(search_vector);
CREATE INDEX CONCURRENTLY idx_clusters_user_status ON clusters(user_id, status);

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY idx_notes_with_embeddings
  ON notes(user_id, created_at DESC)
  WHERE embedding IS NOT NULL;
```

#### Connection Pooling

Supabase provides automatic connection pooling, but you can optimize with:

```typescript
// Use connection pooling for heavy operations
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL, // Use direct connection for migrations
    },
  },
})
```

### Migration Strategy

#### Prisma Migrations

```bash
# Generate migration
pnpm prisma migrate dev --name add_vector_support

# Deploy to production
pnpm prisma migrate deploy

# Reset development database
pnpm prisma db push --force-reset
```

#### Custom Migrations

For pgvector and complex operations:

```sql
-- migrations/001_add_vector_support.sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE notes ADD COLUMN embedding vector(1536);
ALTER TABLE notes ADD COLUMN embedding_updated_at TIMESTAMPTZ;

CREATE INDEX CONCURRENTLY idx_notes_embedding
  ON notes USING ivfflat(embedding vector_cosine_ops)
  WITH (lists = 100);
```

## Monitoring and Analytics

### Database Health Monitoring

```typescript
// Check database connection
const healthCheck = await prisma.$queryRaw`SELECT 1 as health`

// Monitor connection count
const connections = await prisma.$queryRaw`
  SELECT count(*) as active_connections
  FROM pg_stat_activity
  WHERE state = 'active'
`

// Check table sizes
const tableSizes = await prisma.$queryRaw`
  SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
`
```

### Query Performance

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Backup and Recovery

### Supabase Backups

- **Automated backups**: Daily automated backups (7-day retention)
- **Manual backups**: On-demand backup creation
- **Point-in-time recovery**: Available for Pro plans

### Manual Backup

```bash
# Export database
pg_dump -h db.[project].supabase.co -U postgres -d postgres > backup.sql

# Import database
psql -h db.[project].supabase.co -U postgres -d postgres < backup.sql
```

## Security Best Practices

### Data Protection

1. **Row Level Security**: Enable RLS on all tables
2. **API Keys**: Use anon key for client, service role for server
3. **Connection Security**: Always use SSL connections
4. **Data Encryption**: Sensitive data encrypted at rest

### Access Control

```sql
-- Create application-specific roles
CREATE ROLE app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON clusters TO app_user;

-- Restrict sensitive operations
REVOKE ALL ON accounts FROM app_user;
REVOKE ALL ON sessions FROM app_user;
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**:
   - Use connection pooling
   - Monitor active connections
   - Optimize query performance

2. **Vector Operations**:
   - Ensure pgvector extension is installed
   - Use proper vector indexes (ivfflat)
   - Monitor embedding generation costs

3. **Full-text Search**:
   - Keep search_index table updated
   - Monitor tsvector generation
   - Use appropriate text search configurations

### Debug Queries

```sql
-- Check active queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Monitor vector similarity performance
EXPLAIN ANALYZE
SELECT id, content, embedding <=> $1::vector as distance
FROM notes
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

## Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [pgvector Extension](https://github.com/pgvector/pgvector)
- [PostgreSQL Full-text Search](https://www.postgresql.org/docs/current/textsearch.html)
