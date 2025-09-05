-- Check the latest quiz for navigation
SELECT id, title, created_at
FROM quizzes
WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
ORDER BY created_at DESC
LIMIT 1;
