-- SIMPLE QUIZ FIX V2 - Handles existing constraints
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing constraints (safe even if they don't exist)
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_survey_question_id_fkey;
ALTER TABLE survey_questions DROP CONSTRAINT IF EXISTS survey_questions_question_id_key;

-- Step 2: Change column types
ALTER TABLE survey_questions ALTER COLUMN question_id TYPE TEXT;
ALTER TABLE quiz_questions ALTER COLUMN survey_question_id TYPE TEXT;

-- Step 3: Fix duplicate question_ids
UPDATE survey_questions
SET question_id = CONCAT('question_', EXTRACT(epoch FROM NOW())::text, '_', id::text)
WHERE question_id IS NOT NULL;

-- Step 4: Add UNIQUE constraint
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_id_key UNIQUE (question_id);

-- Step 5: Create foreign key constraint
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_survey_question_id_fkey
    FOREIGN KEY (survey_question_id) REFERENCES survey_questions(question_id) ON DELETE CASCADE;

-- Step 6: Verify it worked
SELECT '✅ Quiz database fix completed successfully!' as status;
