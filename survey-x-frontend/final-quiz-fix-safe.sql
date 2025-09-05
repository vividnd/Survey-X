-- FINAL QUIZ FIX - Safe version that handles existing constraints
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing constraints if they exist (safe to run multiple times)
DROP CONSTRAINT IF EXISTS quiz_questions_survey_question_id_fkey;
DROP CONSTRAINT IF EXISTS survey_questions_question_id_key;

-- Step 2: Change column types (safe to run multiple times)
ALTER TABLE survey_questions ALTER COLUMN question_id TYPE TEXT;
ALTER TABLE quiz_questions ALTER COLUMN survey_question_id TYPE TEXT;

-- Step 3: Fix duplicate question_ids (this will only affect rows that need it)
UPDATE survey_questions
SET question_id = CONCAT('question_', EXTRACT(epoch FROM NOW())::text, '_', id::text)
WHERE question_id IS NOT NULL
  AND question_id !~ '^question_'; -- Only update non-question prefixed IDs

-- Step 4: Add UNIQUE constraint (safe - won't create if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'survey_questions_question_id_key'
        AND conrelid = 'survey_questions'::regclass
    ) THEN
        ALTER TABLE survey_questions
        ADD CONSTRAINT survey_questions_question_id_key UNIQUE (question_id);
    END IF;
END $$;

-- Step 5: Create foreign key constraint (safe - won't create if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'quiz_questions_survey_question_id_fkey'
        AND conrelid = 'quiz_questions'::regclass
    ) THEN
        ALTER TABLE quiz_questions
        ADD CONSTRAINT quiz_questions_survey_question_id_fkey
        FOREIGN KEY (survey_question_id) REFERENCES survey_questions(question_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 6: Verify everything worked
SELECT
    'Constraints status:' as status,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'survey_questions_question_id_key'
        AND conrelid = 'survey_questions'::regclass
    ) THEN '✅ UNIQUE constraint exists' ELSE '❌ UNIQUE constraint missing' END as unique_constraint,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'quiz_questions_survey_question_id_fkey'
        AND conrelid = 'quiz_questions'::regclass
    ) THEN '✅ Foreign key exists' ELSE '❌ Foreign key missing' END as foreign_key;
