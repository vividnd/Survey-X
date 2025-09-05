-- Fix survey_questions table to use TEXT for question_id
-- This is needed because we're now generating text-based question IDs

-- First, add a new text column
ALTER TABLE survey_questions ADD COLUMN question_id_text TEXT;

-- Copy existing UUID values to text (if any exist)
UPDATE survey_questions SET question_id_text = question_id::TEXT WHERE question_id IS NOT NULL;

-- Drop the old UUID column
ALTER TABLE survey_questions DROP COLUMN question_id;

-- Rename the new text column to question_id
ALTER TABLE survey_questions RENAME COLUMN question_id_text TO question_id;

-- Make it NOT NULL
ALTER TABLE survey_questions ALTER COLUMN question_id SET NOT NULL;

-- Add primary key constraint (if it doesn't exist)
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_pkey PRIMARY KEY (question_id);

-- Add unique constraint
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_id_key UNIQUE (question_id);
