-- Simple deletion by survey/quiz IDs (replace with your actual IDs)
-- This is safer if you only want to delete specific items

-- Example: Delete specific survey and all its related data
-- DELETE FROM survey_responses WHERE survey_id = 'your-survey-id';
-- DELETE FROM survey_questions WHERE survey_id = 'your-survey-id';
-- DELETE FROM surveys WHERE survey_id = 'your-survey-id';

-- Example: Delete specific quiz and all its related data  
-- DELETE FROM quiz_responses WHERE quiz_id = 'your-quiz-id';
-- DELETE FROM quiz_attempts WHERE quiz_id = 'your-quiz-id';
-- DELETE FROM quiz_questions WHERE quiz_id = 'your-quiz-id';
-- DELETE FROM quizzes WHERE id = 'your-quiz-id';

-- To find your survey IDs:
SELECT survey_id, title FROM surveys WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK';

-- To find your quiz IDs:
SELECT id, title FROM quizzes WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK';
