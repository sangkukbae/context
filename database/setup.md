# Database Setup Guide

This guide walks you through setting up the Context AI Note-Taking Application database with Supabase.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Node.js 18+**: Required for running the setup scripts
3. **pnpm**: Package manager (already installed in the project)

## Quick Setup (Recommended)

### Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `context-ai-notes`
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your users
   - **Pricing Plan**: Free tier is sufficient for development

### Step 2: Configure Environment Variables

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. In your Supabase project dashboard, go to **Settings > API**:
   - Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

3. Go to **Settings > Database**:
   - Copy the **Connection string** → `DATABASE_URL`
   - Update the password in the connection string

4. Update your `.env.local` file:

   ```env
   # Database Configuration - Supabase PostgreSQL
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:6543/postgres"
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:6543/postgres"

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
   SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
   ```

### Step 3: Run Database Migration

1. Install Supabase CLI (if not already installed):

   ```bash
   npm install -g supabase
   ```

2. Apply the database schema:

   ```bash
   # Option A: Using Supabase SQL Editor (Recommended)
   # Copy the contents of database/migrations/001_initial_schema.sql
   # Paste into Supabase Dashboard > SQL Editor and run

   # Option B: Using psql (if you have it installed)
   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres" -f database/migrations/001_initial_schema.sql
   ```

3. Generate Prisma client:

   ```bash
   pnpm prisma generate
   ```

4. Verify setup:
   ```bash
   pnpm run db:check
   ```

## Database Schema Overview

The Context AI database includes these main tables:

### Core Tables

- **users** - User accounts and preferences
- **notes** - Individual notes with content and metadata
- **clusters** - AI-generated or manual note groupings
- **documents** - Generated documents from note clusters

### Supporting Tables

- **search_index** - Full-text search optimization
- **activity_logs** - User activity tracking
- **job_queue** - Background AI processing jobs
- **embedding_cache** - OpenAI embedding cache

### Security

- **Row Level Security (RLS)** enabled on all user data
- **Policies** ensure users can only access their own data
- **Public document sharing** with optional password protection

## Features Enabled

### 🔍 Advanced Search

- **Full-text search** using PostgreSQL's built-in capabilities
- **Vector similarity search** using pgvector extension
- **Hybrid search** combining text and semantic similarity

### 🤖 AI Integration

- **Vector embeddings** stored using pgvector (1536 dimensions)
- **Background job processing** for AI operations
- **Embedding cache** to reduce OpenAI API costs

### ⚡ Performance

- **Optimized indexes** for common query patterns
- **HNSW indexes** for fast vector similarity search
- **Automatic triggers** for maintaining data consistency

### 🔄 Real-time Updates

- **Supabase Realtime** for live data synchronization
- **Automatic search index updates** via database triggers
- **WebSocket subscriptions** for notes, clusters, and documents

## Database Functions and Triggers

### Automatic Updates

- **updated_at timestamps** - Automatically maintained
- **Cluster note counts** - Updated when notes are added/removed
- **Search index sync** - Automatic full-text search updates

### Vector Similarity Function

```sql
-- Find similar notes using vector embeddings
SELECT * FROM similarity_search(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_threshold := 0.7,
  match_count := 10,
  user_id := 'user-uuid'
);
```

## Testing the Setup

### 1. Check Database Connection

```bash
pnpm run db:check
```

### 2. Verify Extensions

```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp', 'pgcrypto');
```

### 3. Check RLS Policies

```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 4. Test Vector Search

```sql
-- Run in Supabase SQL Editor (after adding some notes with embeddings)
SELECT content, embedding <-> '[0.1,0.2,0.3,...]'::vector as distance
FROM notes
WHERE user_id = 'your-user-id'
AND embedding IS NOT NULL
ORDER BY distance
LIMIT 5;
```

## Optional: Advanced Caching

If you need advanced caching beyond Supabase's built-in capabilities:

1. Create an Upstash Redis account
2. Add Redis configuration to `.env.local`:
   ```env
   UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your_redis_token"
   ```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check your database password in the connection string
   - Verify the project reference in the URL
   - Ensure your IP is not being blocked

2. **Permission Denied**
   - Verify service role key is correct
   - Check RLS policies are properly configured
   - Ensure user has proper authentication

3. **Vector Extension Not Found**
   - pgvector should be automatically enabled in Supabase
   - If missing, contact Supabase support

4. **Prisma Connection Issues**
   - Ensure DATABASE_URL includes the password
   - Try regenerating Prisma client: `pnpm prisma generate`
   - Check that connection pooling is not interfering

### Getting Help

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Visit [Supabase Discord](https://discord.supabase.com)
3. Review the [Prisma Documentation](https://www.prisma.io/docs)

## Next Steps

After completing the database setup:

1. **Authentication Setup** - Configure OAuth providers in Supabase Auth
2. **AI Integration** - Set up OpenAI API keys for embeddings and clustering
3. **Development** - Start building features using the database utilities

The database is now ready for development! The schema includes all necessary tables, indexes, and security policies to support the full Context AI feature set.
