-- Verify all tables have RLS and policies
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    CASE WHEN c.relrowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status,
    CASE WHEN COUNT(p.polname) > 0 THEN '✅ Has Policies' ELSE '❌ No Policies' END as policy_status,
    COUNT(p.polname) as policy_count
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
AND c.relkind = 'r'
AND c.relname IN ('surveys', 'survey_questions', 'survey_responses', 'quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_responses', 'whitelist', 'special_surveys', 'special_survey_responses', 'user_profiles')
GROUP BY n.nspname, c.relname, c.relrowsecurity
ORDER BY 
    CASE WHEN c.relrowsecurity AND COUNT(p.polname) > 0 THEN 1 ELSE 2 END,
    c.relname;
