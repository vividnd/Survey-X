-- Test basic Supabase connectivity
SELECT 'Supabase connection works!' as status;

-- Test if we can query surveys (should work)
SELECT COUNT(*) as survey_count FROM surveys;

-- Test if we can query quizzes (might fail with 406)
SELECT COUNT(*) as quiz_count FROM quizzes;
