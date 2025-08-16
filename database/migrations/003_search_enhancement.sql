-- Context AI Note-Taking Application
-- Search Enhancement Migration
-- This migration adds search_content TSVECTOR column, optimizes search indexes, and creates search analytics

-- ============================================================================
-- ENHANCE NOTES TABLE FOR SEARCH
-- ============================================================================

-- Add search_content TSVECTOR generated column for optimized full-text search
ALTER TABLE notes ADD COLUMN IF NOT EXISTS search_content tsvector 
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(metadata->>'title', '')), 'A') ||
    setweight(to_tsvector('english', content), 'B') ||
    setweight(to_tsvector('english', array_to_string(ARRAY(SELECT jsonb_array_elements_text(metadata->'tags')), ' ')), 'C')
) STORED;

-- Create GIN index for fast full-text search (replacing existing search_vector index)
DROP INDEX IF EXISTS idx_search_vector;
CREATE INDEX idx_notes_search_content ON notes USING GIN (search_content) 
WHERE deleted_at IS NULL;

-- Create composite index for user search queries
CREATE INDEX idx_notes_user_search ON notes (user_id, search_content) 
WHERE deleted_at IS NULL;

-- Create index for search ranking optimization
CREATE INDEX idx_notes_search_ranking ON notes (user_id, created_at DESC, updated_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- SEARCH ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    query_type search_query_type NOT NULL DEFAULT 'keyword',
    results_count INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    filters_applied JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Query metadata
    query_length INTEGER GENERATED ALWAYS AS (length(query)) STORED,
    has_filters BOOLEAN GENERATED ALWAYS AS (jsonb_array_length(filters_applied->'tags') > 0 OR filters_applied ? 'dateRange') STORED
);

-- Add search query type enum if not exists
DO $$ 
BEGIN
    CREATE TYPE search_query_type AS ENUM ('keyword', 'semantic', 'hybrid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the search_analytics table to use the enum (recreate if needed)
DROP TABLE IF EXISTS search_analytics;
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    query_type search_query_type NOT NULL DEFAULT 'keyword',
    results_count INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    filters_applied JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Query metadata
    query_length INTEGER GENERATED ALWAYS AS (length(query)) STORED,
    has_filters BOOLEAN GENERATED ALWAYS AS (jsonb_array_length(coalesce(filters_applied->'tags', '[]'::jsonb)) > 0 OR filters_applied ? 'dateRange') STORED
);

-- ============================================================================
-- SEARCH HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    query_type search_query_type NOT NULL DEFAULT 'keyword',
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_count INTEGER NOT NULL DEFAULT 0,
    clicked_note_ids UUID[] DEFAULT '{}',
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    use_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique user-query combinations for proper deduplication
    CONSTRAINT search_history_user_query_unique UNIQUE (user_id, query, query_type)
);

-- ============================================================================
-- SEARCH CACHE TABLE FOR PERFORMANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT NOT NULL UNIQUE, -- hash of query + filters + user_id
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB NOT NULL, -- cached search results
    results_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    
    -- Metadata for cache management
    hit_count INTEGER NOT NULL DEFAULT 0,
    last_hit_at TIMESTAMPTZ
);

-- ============================================================================
-- SEARCH PERFORMANCE INDEXES
-- ============================================================================

-- Search analytics indexes
CREATE INDEX idx_search_analytics_user_created ON search_analytics(user_id, created_at DESC);
CREATE INDEX idx_search_analytics_query_type ON search_analytics(query_type, execution_time_ms);
CREATE INDEX idx_search_analytics_performance ON search_analytics(execution_time_ms, results_count) 
WHERE execution_time_ms > 500; -- Index slow queries

-- Search history indexes
CREATE INDEX idx_search_history_user_recent ON search_history(user_id, last_used_at DESC);
CREATE INDEX idx_search_history_popular ON search_history(use_count DESC, last_used_at DESC);
CREATE INDEX idx_search_history_cleanup ON search_history(created_at) 
WHERE created_at < NOW() - INTERVAL '90 days'; -- For cleanup queries

-- Search cache indexes
CREATE INDEX idx_search_cache_key ON search_cache(cache_key);
CREATE INDEX idx_search_cache_user ON search_cache(user_id, expires_at);
CREATE INDEX idx_search_cache_cleanup ON search_cache(expires_at) 
WHERE expires_at < NOW(); -- For cleanup queries

-- ============================================================================
-- SEARCH FUNCTIONS
-- ============================================================================

-- Function to track search queries
CREATE OR REPLACE FUNCTION track_search_query(
    p_user_id UUID,
    p_query TEXT,
    p_query_type search_query_type,
    p_results_count INTEGER,
    p_execution_time_ms INTEGER,
    p_filters JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    -- Insert search analytics
    INSERT INTO search_analytics (
        user_id, query, query_type, results_count, 
        execution_time_ms, filters_applied
    ) VALUES (
        p_user_id, p_query, p_query_type, p_results_count,
        p_execution_time_ms, p_filters
    );
    
    -- Update or insert search history
    INSERT INTO search_history (
        user_id, query, query_type, filters, result_count, last_used_at, use_count
    ) VALUES (
        p_user_id, p_query, p_query_type, p_filters, p_results_count, NOW(), 1
    ) ON CONFLICT (user_id, query, query_type) DO UPDATE SET
        result_count = EXCLUDED.result_count,
        last_used_at = NOW(),
        use_count = search_history.use_count + 1,
        filters = EXCLUDED.filters;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
    p_user_id UUID,
    p_query_prefix TEXT DEFAULT '',
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    query TEXT,
    use_count INTEGER,
    last_used_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT sh.query, sh.use_count, sh.last_used_at
    FROM search_history sh
    WHERE sh.user_id = p_user_id
      AND (p_query_prefix = '' OR sh.query ILIKE p_query_prefix || '%')
      AND sh.last_used_at > NOW() - INTERVAL '30 days' -- Only recent queries
    ORDER BY sh.use_count DESC, sh.last_used_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old search data
CREATE OR REPLACE FUNCTION cleanup_search_data() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up old search analytics (keep 6 months)
    DELETE FROM search_analytics 
    WHERE created_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old search history (keep 3 months, but preserve popular queries)
    DELETE FROM search_history 
    WHERE created_at < NOW() - INTERVAL '3 months'
      AND use_count < 3;
    
    -- Clean up expired search cache
    DELETE FROM search_cache 
    WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ENHANCED SEARCH FUNCTION
-- ============================================================================

-- Function for keyword search with ranking and highlighting
CREATE OR REPLACE FUNCTION search_notes_keyword(
    p_user_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_filters JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
    id UUID,
    content TEXT,
    highlighted_content TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    rank REAL,
    snippet TEXT
) AS $$
DECLARE
    query_tsquery tsquery;
    date_filter_from TIMESTAMPTZ;
    date_filter_to TIMESTAMPTZ;
    tag_filters TEXT[];
BEGIN
    -- Parse the query into tsquery format
    query_tsquery := plainto_tsquery('english', p_query);
    
    -- Extract filters
    IF p_filters ? 'dateRange' THEN
        date_filter_from := (p_filters->'dateRange'->>'from')::TIMESTAMPTZ;
        date_filter_to := (p_filters->'dateRange'->>'to')::TIMESTAMPTZ;
    END IF;
    
    IF p_filters ? 'tags' THEN
        SELECT array_agg(value::TEXT) INTO tag_filters
        FROM jsonb_array_elements_text(p_filters->'tags');
    END IF;
    
    RETURN QUERY
    SELECT 
        n.id,
        n.content,
        ts_headline('english', n.content, query_tsquery, 
            'StartSel=<mark>,StopSel=</mark>,MaxWords=50,MinWords=20,ShortWord=3,HighlightAll=false,MaxFragments=3,FragmentDelimiter=...'
        ) as highlighted_content,
        n.metadata,
        n.created_at,
        n.updated_at,
        ts_rank_cd(n.search_content, query_tsquery) as rank,
        ts_headline('english', n.content, query_tsquery,
            'StartSel=,StopSel=,MaxWords=30,MinWords=15,ShortWord=3'
        ) as snippet
    FROM notes n
    WHERE n.user_id = p_user_id
      AND n.deleted_at IS NULL
      AND n.search_content @@ query_tsquery
      AND (date_filter_from IS NULL OR n.created_at >= date_filter_from)
      AND (date_filter_to IS NULL OR n.created_at <= date_filter_to)
      AND (tag_filters IS NULL OR n.metadata->'tags' ?| tag_filters)
    ORDER BY rank DESC, n.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new search tables
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for search analytics
CREATE POLICY search_analytics_own_data ON search_analytics
    FOR ALL USING (auth.uid() = user_id);

-- RLS policies for search history  
CREATE POLICY search_history_own_data ON search_history
    FOR ALL USING (auth.uid() = user_id);

-- RLS policies for search cache
CREATE POLICY search_cache_own_data ON search_cache
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_search_history_updated_at BEFORE UPDATE ON search_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE search_analytics IS 'Analytics data for search queries and performance monitoring';
COMMENT ON TABLE search_history IS 'User search history for suggestions and personalization';
COMMENT ON TABLE search_cache IS 'Cache for expensive search queries to improve performance';

COMMENT ON COLUMN notes.search_content IS 'Generated TSVECTOR for full-text search including content, title, and tags';
COMMENT ON COLUMN search_analytics.execution_time_ms IS 'Query execution time in milliseconds for performance monitoring';
COMMENT ON COLUMN search_cache.cache_key IS 'SHA-256 hash of query + filters + user_id for deduplication';

-- Migration complete
SELECT 'Search enhancement migration completed successfully' AS status;