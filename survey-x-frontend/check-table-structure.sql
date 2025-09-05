-- Check actual table structure to find correct column names
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND t.table_name IN ('quiz_responses', 'quiz_attempts', 'quiz_questions', 'survey_responses', 'survey_questions', 'special_survey_responses')
AND c.column_name LIKE '%id%'
ORDER BY t.table_name, c.column_name;
