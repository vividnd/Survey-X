-- Check the actual column names in your tables
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('quiz_responses', 'quiz_attempts', 'quiz_questions')
AND column_name LIKE '%id%'
ORDER BY table_name, column_name;
