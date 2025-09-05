-- COMPLETE QUIZ FIX - Run this in Supabase SQL Editor
-- This fixes all UUID vs TEXT issues for quiz creation

-- Step 1: Check current table structures
SELECT
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND t.table_name IN ('survey_questions', 'quiz_questions')
AND c.column_name IN ('id', 'question_id', 'survey_question_id')
ORDER BY t.table_name, c.column_name;

-- Step 2: Fix survey_questions.question_id to TEXT (if not already)
ALTER TABLE survey_questions ALTER COLUMN question_id TYPE TEXT;

-- Step 3: Fix quiz_questions.survey_question_id to TEXT (if not already)
ALTER TABLE quiz_questions ALTER COLUMN survey_question_id TYPE TEXT;

-- Step 4: Fix duplicate question_ids before adding UNIQUE constraint
UPDATE survey_questions
SET question_id = CONCAT('question_', EXTRACT(epoch FROM NOW())::text, '_', id::text)
WHERE question_id IS NOT NULL;

-- Step 5: Add UNIQUE constraint to survey_questions.question_id (required for foreign key)
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_id_key UNIQUE (question_id);

-- Step 6: Drop existing foreign key constraint (if it exists)
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_survey_question_id_fkey;

-- Step 7: Add correct foreign key constraint referencing question_id (TEXT)
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_survey_question_id_fkey
    FOREIGN KEY (survey_question_id) REFERENCES survey_questions(question_id) ON DELETE CASCADE;

-- Step 8: Verify the fix worked
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'quiz_questions';
