-- FIX SURVEY_RESPONSES TABLE STRUCTURE
-- Ensure all necessary columns exist

-- Add created_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'survey_responses'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE survey_responses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'survey_responses'
ORDER BY ordinal_position;
