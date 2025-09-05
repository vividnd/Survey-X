-- Verify RLS policies are working
-- Run this in Supabase SQL Editor

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'survey_questions', 'survey_responses')
ORDER BY tablename;

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'survey_questions', 'survey_responses')
ORDER BY tablename, policyname;

-- Test simple query (should work if policies are correct)
SELECT COUNT(*) as survey_count FROM surveys LIMIT 1;
