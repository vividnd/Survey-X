-- Preview what will be deleted (safe - no actual deletion)
-- Update the wallet address in the query below

SELECT 'Surveys to delete' as category, COUNT(*) as count 
FROM surveys WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
UNION ALL
SELECT 'Quizzes to delete' as category, COUNT(*) as count 
FROM quizzes WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
UNION ALL
SELECT 'Survey responses to delete' as category, COUNT(*) as count 
FROM survey_responses WHERE survey_id IN (
    SELECT survey_id FROM surveys WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
)
UNION ALL
SELECT 'Quiz attempts to delete' as category, COUNT(*) as count 
FROM quiz_attempts WHERE quiz_id IN (
    SELECT id FROM quizzes WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
)
UNION ALL
SELECT 'Questions to delete' as category, 
    (SELECT COUNT(*) FROM survey_questions WHERE survey_id IN (
        SELECT survey_id FROM surveys WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
    )) + 
    (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id IN (
        SELECT id FROM quizzes WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'
    )) as count;
