-- Clean verification query (no markdown formatting)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'survey_questions', 'survey_responses')
ORDER BY tablename;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'survey_questions', 'survey_responses')
ORDER BY tablename, policyname;
