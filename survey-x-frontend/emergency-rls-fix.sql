-- Emergency RLS Fix - Disable RLS temporarily to test
-- Run this if the policy approach isn't working

-- Temporarily disable RLS to test if that's the issue
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist DISABLE ROW LEVEL SECURITY;
ALTER TABLE special_surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE special_survey_responses DISABLE ROW LEVEL SECURITY;

-- Test a simple query
SELECT COUNT(*) as survey_count FROM surveys;
