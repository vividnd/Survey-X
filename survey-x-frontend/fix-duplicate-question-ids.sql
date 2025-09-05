-- FIX DUPLICATE QUESTION IDs - Run this before the unique constraint

-- Step 1: First, let's see what duplicate question_ids exist
SELECT question_id, COUNT(*) as count
FROM survey_questions
GROUP BY question_id
HAVING COUNT(*) > 1
ORDER BY question_id;

-- Step 2: Update duplicate question_ids to unique values
-- This will generate new unique IDs for all existing questions
UPDATE survey_questions
SET question_id = CONCAT('question_', EXTRACT(epoch FROM NOW())::text, '_', id::text)
WHERE question_id IS NOT NULL;

-- Step 3: Verify no duplicates remain
SELECT question_id, COUNT(*) as count
FROM survey_questions
GROUP BY question_id
HAVING COUNT(*) > 1;

-- Step 4: Now add the UNIQUE constraint
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_id_key UNIQUE (question_id);

-- Step 5: Verify the constraint was created
SELECT conname, conrelid::regclass, contype
FROM pg_constraint
WHERE conrelid = 'survey_questions'::regclass AND conname = 'survey_questions_question_id_key';
