-- Check data types of ID columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name IN ('id', 'survey_id', 'quiz_id', 'special_survey_id')
AND table_name IN ('surveys', 'quizzes', 'special_surveys', 'special_survey_responses', 'quiz_attempts', 'quiz_responses')
ORDER BY table_name, column_name;
