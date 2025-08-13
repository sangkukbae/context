-- Add Soft Delete Support to Notes Table
-- This migration adds proper soft delete functionality with a dedicated deleted_at column
-- and updates RLS policies to handle soft-deleted notes correctly

-- Add deleted_at column to notes table
ALTER TABLE notes ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Add index for soft delete queries (performance optimization)
CREATE INDEX idx_notes_deleted_at ON notes(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add index for active notes (not deleted)
CREATE INDEX idx_notes_active ON notes(user_id, created_at DESC) WHERE deleted_at IS NULL;

-- Update the existing notes index to exclude deleted notes
DROP INDEX IF EXISTS idx_notes_user_created;
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC) WHERE deleted_at IS NULL;

-- Create a view for active (non-deleted) notes
CREATE VIEW active_notes AS 
SELECT * FROM notes WHERE deleted_at IS NULL;

-- Create a view for deleted notes that can be recovered (within 30 days)
CREATE VIEW recoverable_notes AS 
SELECT *, 
       (NOW() - deleted_at) < INTERVAL '30 days' AS can_recover,
       EXTRACT(DAYS FROM (NOW() - deleted_at)) AS days_deleted
FROM notes 
WHERE deleted_at IS NOT NULL;

-- Update RLS policies to exclude soft-deleted notes from normal queries
DROP POLICY IF EXISTS notes_own_data ON notes;

-- Policy for active (non-deleted) notes
CREATE POLICY notes_active_own_data ON notes
    FOR ALL USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Policy for accessing deleted notes (for recovery)
CREATE POLICY notes_deleted_own_data ON notes
    FOR SELECT USING (
        auth.uid() = user_id 
        AND deleted_at IS NOT NULL
        AND (NOW() - deleted_at) < INTERVAL '30 days'
    );

-- Update search index trigger to exclude soft-deleted notes
CREATE OR REPLACE FUNCTION sync_search_index()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle notes
    IF TG_TABLE_NAME = 'notes' THEN
        IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL) THEN
            -- Remove from search index when note is deleted or soft-deleted
            DELETE FROM search_index WHERE entity_id = COALESCE(OLD.id, NEW.id) AND entity_type = 'note';
            RETURN COALESCE(OLD, NEW);
        ELSIF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL) THEN
            -- Add to search index when note is created or recovered
            INSERT INTO search_index (entity_id, entity_type, user_id, content, title, tags)
            VALUES (NEW.id, 'note', NEW.user_id, NEW.content, NULL, NEW.metadata->'tags')
            ON CONFLICT (entity_id, entity_type) DO UPDATE SET
                content = EXCLUDED.content,
                tags = EXCLUDED.tags,
                updated_at = NOW();
            RETURN NEW;
        ELSIF TG_OP = 'UPDATE' AND NEW.deleted_at IS NULL THEN
            -- Update search index for active notes
            INSERT INTO search_index (entity_id, entity_type, user_id, content, title, tags)
            VALUES (NEW.id, 'note', NEW.user_id, NEW.content, NULL, NEW.metadata->'tags')
            ON CONFLICT (entity_id, entity_type) DO UPDATE SET
                content = EXCLUDED.content,
                tags = EXCLUDED.tags,
                updated_at = NOW();
            RETURN NEW;
        END IF;
    END IF;
    
    -- Handle documents (no changes needed, kept for completeness)
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

-- Function to permanently delete notes older than 30 days
CREATE OR REPLACE FUNCTION cleanup_deleted_notes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Permanently delete notes that have been soft-deleted for more than 30 days
    WITH deleted_rows AS (
        DELETE FROM notes 
        WHERE deleted_at IS NOT NULL 
        AND (NOW() - deleted_at) > INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_rows;
    
    -- Log the cleanup activity
    INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at)
    SELECT 
        '00000000-0000-0000-0000-000000000000'::uuid, -- System user ID
        'cleanup',
        'note',
        jsonb_build_object('deleted_count', deleted_count, 'cleanup_date', NOW()),
        NOW()
    WHERE deleted_count > 0;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to soft delete a note
CREATE OR REPLACE FUNCTION soft_delete_note(note_id UUID, user_id_param UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    note_data JSONB
) AS $$
DECLARE
    note_record RECORD;
    current_time TIMESTAMPTZ := NOW();
BEGIN
    -- Check if note exists and belongs to user
    SELECT * INTO note_record 
    FROM notes 
    WHERE id = note_id 
    AND user_id = user_id_param 
    AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Note not found or already deleted', NULL::JSONB;
        RETURN;
    END IF;
    
    -- Soft delete the note
    UPDATE notes 
    SET deleted_at = current_time,
        updated_at = current_time
    WHERE id = note_id;
    
    -- Return success with note data
    RETURN QUERY SELECT 
        TRUE,
        'Note soft deleted successfully',
        jsonb_build_object(
            'id', note_record.id,
            'deleted_at', current_time,
            'can_recover', TRUE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to recover a soft-deleted note
CREATE OR REPLACE FUNCTION recover_note(note_id UUID, user_id_param UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    note_data JSONB
) AS $$
DECLARE
    note_record RECORD;
    current_time TIMESTAMPTZ := NOW();
BEGIN
    -- Check if note exists, is deleted, and can be recovered
    SELECT * INTO note_record 
    FROM notes 
    WHERE id = note_id 
    AND user_id = user_id_param 
    AND deleted_at IS NOT NULL
    AND (current_time - deleted_at) < INTERVAL '30 days';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Note not found, not deleted, or recovery period expired', NULL::JSONB;
        RETURN;
    END IF;
    
    -- Recover the note
    UPDATE notes 
    SET deleted_at = NULL,
        updated_at = current_time
    WHERE id = note_id;
    
    -- Return success with note data
    RETURN QUERY SELECT 
        TRUE,
        'Note recovered successfully',
        jsonb_build_object(
            'id', note_record.id,
            'recovered_at', current_time,
            'was_deleted_for_days', EXTRACT(DAYS FROM (current_time - note_record.deleted_at))
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION soft_delete_note(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recover_note(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_deleted_notes() TO postgres, service_role;

-- Add comments for documentation
COMMENT ON COLUMN notes.deleted_at IS 'Timestamp when note was soft deleted. NULL means note is active.';
COMMENT ON FUNCTION soft_delete_note(UUID, UUID) IS 'Safely soft delete a note with proper validation and logging';
COMMENT ON FUNCTION recover_note(UUID, UUID) IS 'Recover a soft-deleted note within the 30-day recovery window';
COMMENT ON FUNCTION cleanup_deleted_notes() IS 'Permanently delete notes that have been soft-deleted for more than 30 days';
COMMENT ON VIEW active_notes IS 'View of all active (non-deleted) notes';
COMMENT ON VIEW recoverable_notes IS 'View of all recoverable soft-deleted notes with recovery status';

-- Migration complete
SELECT 'Soft delete support added successfully' AS status;