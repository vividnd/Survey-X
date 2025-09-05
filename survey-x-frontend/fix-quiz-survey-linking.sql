-- FIX: Link existing quizzes to their surveys
-- Update quiz survey_id based on matching titles and creator

UPDATE quizzes
SET survey_id = (
  SELECT id FROM surveys s
  WHERE s.creator_wallet = quizzes.creator_wallet
    AND s.title = quizzes.title
    AND s.created_at >= quizzes.created_at - INTERVAL '1 minute'
    AND s.created_at <= quizzes.created_at + INTERVAL '1 minute'
  LIMIT 1
)
WHERE survey_id IS NULL;

-- Verify the fix
SELECT
  q.id as quiz_id,
  q.title,
  q.survey_id,
  s.title as survey_title
FROM quizzes q
LEFT JOIN surveys s ON q.survey_id = s.id
WHERE q.creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
ORDER BY q.created_at DESC;</content>
<parameter name="explanation">Fix the survey linking for existing quizzes
