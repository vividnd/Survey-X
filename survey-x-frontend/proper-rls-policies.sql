-- Proper RLS Policies that should work
-- Run this after the emergency disable

-- First, drop any existing policies
DROP POLICY IF EXISTS "Allow all operations on surveys" ON surveys;
DROP POLICY IF EXISTS "Allow all operations on survey_questions" ON survey_questions;
DROP POLICY IF EXISTS "Allow all operations on survey_responses" ON survey_responses;
DROP POLICY IF EXISTS "Allow all operations on user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow all operations on quizzes" ON quizzes;
DROP POLICY IF EXISTS "Allow all operations on quiz_questions" ON quiz_questions;
DROP POLICY IF EXISTS "Allow all operations on quiz_attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Allow all operations on quiz_responses" ON quiz_responses;
DROP POLICY IF EXISTS "Allow all operations on whitelist" ON whitelist;
DROP POLICY IF EXISTS "Allow all operations on special_surveys" ON special_surveys;
DROP POLICY IF EXISTS "Allow all operations on special_survey_responses" ON special_survey_responses;

-- Create working policies for each operation type
-- SURVEYS
CREATE POLICY "Enable select for surveys" ON surveys FOR SELECT USING (true);
CREATE POLICY "Enable insert for surveys" ON surveys FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for surveys" ON surveys FOR UPDATE USING (true);
CREATE POLICY "Enable delete for surveys" ON surveys FOR DELETE USING (true);

-- SURVEY_QUESTIONS
CREATE POLICY "Enable select for survey_questions" ON survey_questions FOR SELECT USING (true);
CREATE POLICY "Enable insert for survey_questions" ON survey_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for survey_questions" ON survey_questions FOR UPDATE USING (true);
CREATE POLICY "Enable delete for survey_questions" ON survey_questions FOR DELETE USING (true);

-- SURVEY_RESPONSES
CREATE POLICY "Enable select for survey_responses" ON survey_responses FOR SELECT USING (true);
CREATE POLICY "Enable insert for survey_responses" ON survey_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for survey_responses" ON survey_responses FOR UPDATE USING (true);
CREATE POLICY "Enable delete for survey_responses" ON survey_responses FOR DELETE USING (true);

-- USER_PROFILES
CREATE POLICY "Enable select for user_profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Enable insert for user_profiles" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for user_profiles" ON user_profiles FOR UPDATE USING (true);
CREATE POLICY "Enable delete for user_profiles" ON user_profiles FOR DELETE USING (true);

-- QUIZZES
CREATE POLICY "Enable select for quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Enable insert for quizzes" ON quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for quizzes" ON quizzes FOR UPDATE USING (true);
CREATE POLICY "Enable delete for quizzes" ON quizzes FOR DELETE USING (true);

-- QUIZ_QUESTIONS
CREATE POLICY "Enable select for quiz_questions" ON quiz_questions FOR SELECT USING (true);
CREATE POLICY "Enable insert for quiz_questions" ON quiz_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for quiz_questions" ON quiz_questions FOR UPDATE USING (true);
CREATE POLICY "Enable delete for quiz_questions" ON quiz_questions FOR DELETE USING (true);

-- QUIZ_ATTEMPTS
CREATE POLICY "Enable select for quiz_attempts" ON quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Enable insert for quiz_attempts" ON quiz_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for quiz_attempts" ON quiz_attempts FOR UPDATE USING (true);
CREATE POLICY "Enable delete for quiz_attempts" ON quiz_attempts FOR DELETE USING (true);

-- QUIZ_RESPONSES
CREATE POLICY "Enable select for quiz_responses" ON quiz_responses FOR SELECT USING (true);
CREATE POLICY "Enable insert for quiz_responses" ON quiz_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for quiz_responses" ON quiz_responses FOR UPDATE USING (true);
CREATE POLICY "Enable delete for quiz_responses" ON quiz_responses FOR DELETE USING (true);

-- WHITELIST
CREATE POLICY "Enable select for whitelist" ON whitelist FOR SELECT USING (true);
CREATE POLICY "Enable insert for whitelist" ON whitelist FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for whitelist" ON whitelist FOR UPDATE USING (true);
CREATE POLICY "Enable delete for whitelist" ON whitelist FOR DELETE USING (true);

-- SPECIAL_SURVEYS
CREATE POLICY "Enable select for special_surveys" ON special_surveys FOR SELECT USING (true);
CREATE POLICY "Enable insert for special_surveys" ON special_surveys FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for special_surveys" ON special_surveys FOR UPDATE USING (true);
CREATE POLICY "Enable delete for special_surveys" ON special_surveys FOR DELETE USING (true);

-- SPECIAL_SURVEY_RESPONSES
CREATE POLICY "Enable select for special_survey_responses" ON special_survey_responses FOR SELECT USING (true);
CREATE POLICY "Enable insert for special_survey_responses" ON special_survey_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for special_survey_responses" ON special_survey_responses FOR UPDATE USING (true);
CREATE POLICY "Enable delete for special_survey_responses" ON special_survey_responses FOR DELETE USING (true);

-- Re-enable RLS
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_survey_responses ENABLE ROW LEVEL SECURITY;

-- Verify policies are working
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = p.schemaname AND tablename = p.tablename) as policy_count
FROM pg_tables p
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'survey_questions', 'survey_responses')
ORDER BY tablename;
