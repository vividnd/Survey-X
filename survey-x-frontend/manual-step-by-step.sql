-- Step-by-step manual deletion (safest approach)

-- Step 1: Find your quiz IDs
SELECT id, title FROM quizzes WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK';

-- Step 2: Find your survey IDs  
SELECT survey_id, title FROM surveys WHERE creator_wallet = '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK';

-- Step 3: Delete quiz attempts (replace YOUR_QUIZ_ID with actual ID)
DELETE FROM quiz_attempts WHERE quiz_id = 'YOUR_QUIZ_ID';

-- Step 4: Delete quiz questions (replace YOUR_QUIZ_ID with actual ID)
DELETE FROM quiz_questions WHERE quiz_id = 'YOUR_QUIZ_ID';

-- Step 5: Delete quizzes (replace YOUR_QUIZ_ID with actual ID)
DELETE FROM quizzes WHERE id = 'YOUR_QUIZ_ID';

-- Step 6: Delete survey responses (replace YOUR_SURVEY_ID with actual ID)
DELETE FROM survey_responses WHERE survey_id = 'YOUR_SURVEY_ID';

-- Step 7: Delete survey questions (replace YOUR_SURVEY_ID with actual ID)
DELETE FROM survey_questions WHERE survey_id = 'YOUR_SURVEY_ID';

-- Step 8: Delete surveys (replace YOUR_SURVEY_ID with actual ID)
DELETE FROM surveys WHERE survey_id = 'YOUR_SURVEY_ID';

-- Repeat steps 3-8 for each quiz/survey you want to delete
