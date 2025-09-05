-- Check if quiz was actually created and saved
SELECT
    q.id,
    q.title,
    q.survey_id,
    q.creator_wallet,
    q.is_active,
    q.created_at,
    COUNT(qq.id) as question_count
FROM quizzes q
LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
WHERE q.creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
  AND q.title LIKE '%special survey%'
GROUP BY q.id, q.title, q.survey_id, q.creator_wallet, q.is_active, q.created_at
ORDER BY q.created_at DESC
LIMIT 5;

-- Check if survey exists
SELECT id, title, creator_wallet, category
FROM surveys
WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
ORDER BY created_at DESC
LIMIT 5;
