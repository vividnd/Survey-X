-- FINAL QUIZ SCHEMA FIX
-- This script fixes all the UUID vs TEXT issues for quiz creation

-- Step 1: Fix survey_questions table to use TEXT for question_id
-- (This allows us to store our generated text-based question IDs)
ALTER TABLE survey_questions ALTER COLUMN question_id TYPE TEXT;

-- Step 2: Fix quiz_questions table to reference survey_questions with TEXT
-- (This allows quiz questions to properly link to survey questions)
ALTER TABLE quiz_questions ALTER COLUMN survey_question_id TYPE TEXT;

-- Step 3: Ensure the foreign key constraint is correct
-- Drop existing constraint if it exists
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_survey_question_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_survey_question_id_fkey
    FOREIGN KEY (survey_question_id) REFERENCES survey_questions(question_id) ON DELETE CASCADE;

-- Step 4: Apply the full quiz schema to ensure everything is properly set up
-- (This will recreate any missing tables or fix any issues)
\i quiz-schema-fixed.sql
