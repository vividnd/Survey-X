-- DEBUG: Check if quiz actually exists
SELECT * FROM quizzes
WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
ORDER BY created_at DESC LIMIT 1;

-- Check if survey exists
SELECT * FROM surveys
WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
ORDER BY created_at DESC LIMIT 1;

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'quizzes';

-- Check if there are any active policies
SELECT * FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'quizzes';</content>
</xai:function_call">Check if quiz was created