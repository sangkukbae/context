-- Context AI Note-Taking Application
-- Initial Database Schema Migration
-- This migration creates all tables, indexes, RLS policies, and extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create custom types
CREATE TYPE user_subscription_plan AS ENUM ('free', 'pro', 'team');
CREATE TYPE user_subscription_status AS ENUM ('active', 'canceled', 'past_due');
CREATE TYPE cluster_status AS ENUM ('suggested', 'accepted', 'dismissed');
CREATE TYPE document_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE job_type AS ENUM ('embedding', 'clustering', 'document_generation');

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar TEXT,
    email_verified TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- User preferences (stored as JSONB)
    preferences JSONB NOT NULL DEFAULT '{
        "theme": "system",
        "autoSave": true,
        "notifications": true,
        "clusterSuggestions": true
    }'::jsonb,
    
    -- Subscription information
    subscription_plan user_subscription_plan NOT NULL DEFAULT 'free',
    subscription_status user_subscription_status,
    subscription_current_period_end TIMESTAMPTZ
);

-- ============================================================================
-- NOTES TABLE
-- ============================================================================
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cluster_id UUID, -- References clusters(id), but we'll add FK later
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata stored as JSONB
    metadata JSONB NOT NULL DEFAULT '{
        "wordCount": 0,
        "characterCount": 0,
        "tags": []
    }'::jsonb,
    
    -- Vector embedding for semantic search (using pgvector)
    embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
    embedding_updated_at TIMESTAMPTZ
);

-- ============================================================================
-- CLUSTERS TABLE
-- ============================================================================
CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Cluster metrics
    confidence FLOAT NOT NULL DEFAULT 0.0,
    note_count INTEGER NOT NULL DEFAULT 0,
    total_words INTEGER NOT NULL DEFAULT 0,
    themes JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Suggestion lifecycle
    suggested_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    status cluster_status NOT NULL DEFAULT 'suggested'
);

-- Add foreign key constraint for notes.cluster_id
ALTER TABLE notes ADD CONSTRAINT fk_notes_cluster_id 
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE SET NULL;

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
    status document_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Document metrics
    word_count INTEGER NOT NULL DEFAULT 0,
    reading_time INTEGER NOT NULL DEFAULT 0, -- in minutes
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Sharing configuration
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    share_id TEXT UNIQUE,
    allow_comments BOOLEAN NOT NULL DEFAULT FALSE,
    share_expires_at TIMESTAMPTZ,
    share_password_hash TEXT -- bcrypt hashed password
);

-- ============================================================================
-- AUTHENTICATION TABLES (NextAuth.js compatible)
-- ============================================================================
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires TIMESTAMPTZ NOT NULL,
    
    PRIMARY KEY (identifier, token)
);

-- ============================================================================
-- SEARCH AND ACTIVITY TABLES
-- ============================================================================
CREATE TABLE search_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL, -- 'note' or 'document'
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    title TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', content), 'B')
    ) STORED
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'note', 'cluster', 'document', 'user'
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- BACKGROUND JOB QUEUE
-- ============================================================================
CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ
);

-- ============================================================================
-- CACHING AND RATE LIMITING TABLES
-- ============================================================================
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE, -- format: "user:action" or "ip:action"
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE embedding_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the text
    embedding vector(1536) NOT NULL,
    model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_plan, subscription_status);

-- Notes indexes
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC);
CREATE INDEX idx_notes_cluster ON notes(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);
CREATE INDEX idx_notes_user_content ON notes(user_id) INCLUDE (content);

-- Vector similarity index for notes (using HNSW for fast similarity search)
CREATE INDEX idx_notes_embedding ON notes USING hnsw (embedding vector_cosine_ops) 
    WHERE embedding IS NOT NULL;

-- Clusters indexes
CREATE INDEX idx_clusters_user_status ON clusters(user_id, status);
CREATE INDEX idx_clusters_user_created ON clusters(user_id, created_at DESC);
CREATE INDEX idx_clusters_suggested_at ON clusters(suggested_at) WHERE suggested_at IS NOT NULL;

-- Documents indexes
CREATE INDEX idx_documents_user_status ON documents(user_id, status);
CREATE INDEX idx_documents_cluster ON documents(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_documents_share_id ON documents(share_id) WHERE share_id IS NOT NULL;
CREATE INDEX idx_documents_public ON documents(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_documents_user_created ON documents(user_id, created_at DESC);

-- Authentication indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires ON sessions(expires);

-- Search indexes
CREATE INDEX idx_search_user_type ON search_index(user_id, entity_type);
CREATE INDEX idx_search_entity ON search_index(entity_id, entity_type);
CREATE INDEX idx_search_vector ON search_index USING GIN (search_vector);

-- Activity logs indexes
CREATE INDEX idx_activity_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);

-- Job queue indexes
CREATE INDEX idx_jobs_status_scheduled ON job_queue(status, scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_jobs_type_status ON job_queue(type, status);
CREATE INDEX idx_jobs_created ON job_queue(created_at);

-- Rate limiting indexes
CREATE INDEX idx_rate_limits_key ON rate_limits(key);
CREATE INDEX idx_rate_limits_expires ON rate_limits(expires_at);

-- Embedding cache indexes
CREATE INDEX idx_embedding_cache_hash ON embedding_cache(text_hash);
CREATE INDEX idx_embedding_cache_expires ON embedding_cache(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clusters_updated_at BEFORE UPDATE ON clusters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update note count in clusters
CREATE OR REPLACE FUNCTION update_cluster_note_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' AND NEW.cluster_id IS NOT NULL THEN
        UPDATE clusters 
        SET note_count = note_count + 1,
            total_words = total_words + COALESCE((NEW.metadata->>'wordCount')::integer, 0)
        WHERE id = NEW.cluster_id;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Remove from old cluster
        IF OLD.cluster_id IS NOT NULL AND (NEW.cluster_id IS NULL OR OLD.cluster_id != NEW.cluster_id) THEN
            UPDATE clusters 
            SET note_count = GREATEST(note_count - 1, 0),
                total_words = GREATEST(total_words - COALESCE((OLD.metadata->>'wordCount')::integer, 0), 0)
            WHERE id = OLD.cluster_id;
        END IF;
        
        -- Add to new cluster
        IF NEW.cluster_id IS NOT NULL AND (OLD.cluster_id IS NULL OR OLD.cluster_id != NEW.cluster_id) THEN
            UPDATE clusters 
            SET note_count = note_count + 1,
                total_words = total_words + COALESCE((NEW.metadata->>'wordCount')::integer, 0)
            WHERE id = NEW.cluster_id;
        END IF;
        
        -- Update word count for same cluster
        IF OLD.cluster_id IS NOT NULL AND OLD.cluster_id = NEW.cluster_id THEN
            UPDATE clusters 
            SET total_words = total_words - COALESCE((OLD.metadata->>'wordCount')::integer, 0) + COALESCE((NEW.metadata->>'wordCount')::integer, 0)
            WHERE id = NEW.cluster_id;
        END IF;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' AND OLD.cluster_id IS NOT NULL THEN
        UPDATE clusters 
        SET note_count = GREATEST(note_count - 1, 0),
            total_words = GREATEST(total_words - COALESCE((OLD.metadata->>'wordCount')::integer, 0), 0)
        WHERE id = OLD.cluster_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cluster_note_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_cluster_note_count();

-- Function to generate search index entries
CREATE OR REPLACE FUNCTION sync_search_index()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle notes
    IF TG_TABLE_NAME = 'notes' THEN
        IF TG_OP = 'DELETE' THEN
            DELETE FROM search_index WHERE entity_id = OLD.id AND entity_type = 'note';
            RETURN OLD;
        ELSE
            INSERT INTO search_index (entity_id, entity_type, user_id, content, title, tags)
            VALUES (NEW.id, 'note', NEW.user_id, NEW.content, NULL, NEW.metadata->'tags')
            ON CONFLICT (entity_id, entity_type) DO UPDATE SET
                content = EXCLUDED.content,
                tags = EXCLUDED.tags,
                updated_at = NOW();
            RETURN NEW;
        END IF;
    END IF;
    
    -- Handle documents
    IF TG_TABLE_NAME = 'documents' THEN
        IF TG_OP = 'DELETE' THEN
            DELETE FROM search_index WHERE entity_id = OLD.id AND entity_type = 'document';
            RETURN OLD;
        ELSE
            INSERT INTO search_index (entity_id, entity_type, user_id, content, title, tags)
            VALUES (NEW.id, 'document', NEW.user_id, NEW.content, NEW.title, NEW.tags)
            ON CONFLICT (entity_id, entity_type) DO UPDATE SET
                content = EXCLUDED.content,
                title = EXCLUDED.title,
                tags = EXCLUDED.tags,
                updated_at = NOW();
            RETURN NEW;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Make entity_id and entity_type a composite unique constraint for upserts
ALTER TABLE search_index ADD CONSTRAINT search_index_entity_unique UNIQUE (entity_id, entity_type);

CREATE TRIGGER sync_notes_search_index
    AFTER INSERT OR UPDATE OR DELETE ON notes
    FOR EACH ROW EXECUTE FUNCTION sync_search_index();

CREATE TRIGGER sync_documents_search_index
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW EXECUTE FUNCTION sync_search_index();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY users_own_data ON users
    FOR ALL USING (auth.uid() = id);

-- Notes table policies
CREATE POLICY notes_own_data ON notes
    FOR ALL USING (auth.uid() = user_id);

-- Clusters table policies  
CREATE POLICY clusters_own_data ON clusters
    FOR ALL USING (auth.uid() = user_id);

-- Documents table policies
CREATE POLICY documents_own_data ON documents
    FOR ALL USING (auth.uid() = user_id);

-- Public document access policy
CREATE POLICY documents_public_read ON documents
    FOR SELECT USING (is_public = true);

-- Shared document access policy (by share_id)
CREATE POLICY documents_shared_read ON documents
    FOR SELECT USING (
        share_id IS NOT NULL 
        AND (share_expires_at IS NULL OR share_expires_at > NOW())
    );

-- Search index policies
CREATE POLICY search_index_own_data ON search_index
    FOR ALL USING (auth.uid() = user_id);

-- Activity logs policies
CREATE POLICY activity_logs_own_data ON activity_logs
    FOR ALL USING (auth.uid() = user_id);

-- Accounts and sessions policies
CREATE POLICY accounts_own_data ON accounts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY sessions_own_data ON sessions
    FOR ALL USING (auth.uid() = user_id);

-- Rate limits policy (users can only see their own rate limits)
CREATE POLICY rate_limits_own_data ON rate_limits
    FOR ALL USING (
        key LIKE 'user:' || auth.uid()::text || ':%'
    );

-- ============================================================================
-- INITIAL DATA AND CONFIGURATIONS
-- ============================================================================

-- Create indexes for JSON operations
CREATE INDEX idx_notes_metadata_gin ON notes USING GIN (metadata);
CREATE INDEX idx_documents_tags_gin ON documents USING GIN (tags);
CREATE INDEX idx_clusters_themes_gin ON clusters USING GIN (themes);
CREATE INDEX idx_users_preferences_gin ON users USING GIN (preferences);

-- Comment on tables and columns for documentation
COMMENT ON TABLE users IS 'User accounts and preferences';
COMMENT ON TABLE notes IS 'Individual notes with content and metadata';
COMMENT ON TABLE clusters IS 'AI-generated or manual note clusters';
COMMENT ON TABLE documents IS 'Generated documents from note clusters';
COMMENT ON TABLE search_index IS 'Full-text search index for notes and documents';
COMMENT ON TABLE activity_logs IS 'User activity tracking for analytics';
COMMENT ON TABLE job_queue IS 'Background job processing queue';
COMMENT ON TABLE embedding_cache IS 'Cache for OpenAI embeddings to reduce API costs';

COMMENT ON COLUMN notes.embedding IS 'Vector embedding from OpenAI text-embedding-3-small (1536 dimensions)';
COMMENT ON COLUMN clusters.confidence IS 'AI confidence score for cluster quality (0.0-1.0)';
COMMENT ON COLUMN documents.reading_time IS 'Estimated reading time in minutes';
COMMENT ON COLUMN search_index.search_vector IS 'PostgreSQL full-text search vector';

-- Grant necessary permissions for application
-- Note: In production, create specific roles with minimal permissions
-- GRANT USAGE ON SCHEMA public TO authenticated, anon;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Migration complete
SELECT 'Initial schema migration completed successfully' AS status;