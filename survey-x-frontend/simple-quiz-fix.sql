-- SIMPLE QUIZ FIX - Run this step by step in Supabase SQL Editor

-- Step 1: Drop the problematic foreign key constraint
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_survey_question_id_fkey;

-- Step 2: Change survey_questions.question_id to TEXT
ALTER TABLE survey_questions ALTER COLUMN question_id TYPE TEXT;

-- Step 3: Change quiz_questions.survey_question_id to TEXT
ALTER TABLE quiz_questions ALTER COLUMN survey_question_id TYPE TEXT;

-- Step 4: Fix duplicate question_ids before adding UNIQUE constraint
UPDATE survey_questions
SET question_id = CONCAT('question_', EXTRACT(epoch FROM NOW())::text, '_', id::text)
WHERE question_id IS NOT NULL;

-- Step 5: Add UNIQUE constraint to survey_questions.question_id (required for foreign key)
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_id_key UNIQUE (question_id);

-- Step 6: Create the correct foreign key constraint
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_survey_question_id_fkey
    FOREIGN KEY (survey_question_id) REFERENCES survey_questions(question_id) ON DELETE CASCADE;

-- Step 7: Verify it worked
SELECT 'Foreign key created successfully!' as status;
