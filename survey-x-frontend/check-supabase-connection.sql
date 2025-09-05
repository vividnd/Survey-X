-- Check if Supabase connection works at all
SELECT 1 as connection_test;

-- Check if we can access any table
SELECT COUNT(*) FROM surveys LIMIT 1;

-- Check current user/session (this might reveal auth issues)
SELECT auth.uid() as current_user;

-- Check if RLS is really disabled on quizzes
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'quizzes' AND schemaname = 'public';
