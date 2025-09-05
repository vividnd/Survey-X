-- MANUAL QUIZ FIX - Run this in Supabase SQL Editor
-- This fixes the "invalid input syntax for type uuid" error when creating quiz questions

-- Step 1: Fix survey_questions table to use TEXT for question_id
ALTER TABLE survey_questions ALTER COLUMN question_id TYPE TEXT;

-- Step 2: Fix quiz_questions table to reference survey_questions with TEXT
ALTER TABLE quiz_questions ALTER COLUMN survey_question_id TYPE TEXT;

-- Step 3: Fix duplicate question_ids before adding UNIQUE constraint
UPDATE survey_questions
SET question_id = CONCAT('question_', EXTRACT(epoch FROM NOW())::text, '_', id::text)
WHERE question_id IS NOT NULL;

-- Step 4: Add UNIQUE constraint to survey_questions.question_id (required for foreign key)
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_id_key UNIQUE (question_id);

-- Step 5: Drop and recreate the foreign key constraint (reference question_id, not id)
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_survey_question_id_fkey;
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_survey_question_id_fkey
    FOREIGN KEY (survey_question_id) REFERENCES survey_questions(question_id) ON DELETE CASCADE;
