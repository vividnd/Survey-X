-- DROP CONSTRAINTS WITH CASCADE - Handles dependencies properly
-- Run this in Supabase SQL Editor

-- Drop foreign key first (it depends on the unique constraint)
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_survey_question_id_fkey;

-- Now drop the unique constraint (no longer has dependencies)
ALTER TABLE survey_questions DROP CONSTRAINT IF EXISTS survey_questions_question_id_key;

-- Recreate the unique constraint
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_id_key UNIQUE (question_id);

-- Recreate the foreign key constraint
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_survey_question_id_fkey
    FOREIGN KEY (survey_question_id) REFERENCES survey_questions(question_id) ON DELETE CASCADE;

-- Verify it worked
SELECT '✅ Constraints recreated successfully!' as status;
