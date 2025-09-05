-- Complete RLS Policy Fix - No Syntax Errors
-- Run this in Supabase SQL Editor

-- Drop existing policies first (ignore errors if they don't exist)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies for our tables
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('surveys', 'survey_questions', 'survey_responses', 'user_profiles', 'quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_responses', 'whitelist', 'special_surveys', 'special_survey_responses')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- Create new permissive policies for all tables
CREATE POLICY "Allow all operations on surveys" ON surveys FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_questions" ON survey_questions FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_responses" ON survey_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on quizzes" ON quizzes FOR ALL USING (true);
CREATE POLICY "Allow all operations on quiz_questions" ON quiz_questions FOR ALL USING (true);
CREATE POLICY "Allow all operations on quiz_attempts" ON quiz_attempts FOR ALL USING (true);
CREATE POLICY "Allow all operations on quiz_responses" ON quiz_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations on whitelist" ON whitelist FOR ALL USING (true);
CREATE POLICY "Allow all operations on special_surveys" ON special_surveys FOR ALL USING (true);
CREATE POLICY "Allow all operations on special_survey_responses" ON special_survey_responses FOR ALL USING (true);

-- Enable RLS on all tables
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

-- Verify the setup
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = p.schemaname AND tablename = p.tablename) as policy_count
FROM pg_tables p
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'survey_questions', 'survey_responses', 'user_profiles', 'quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_responses', 'whitelist', 'special_surveys', 'special_survey_responses')
ORDER BY tablename;
