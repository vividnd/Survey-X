-- Fix database issues for quiz and survey functionality
-- Run this in your Supabase SQL Editor

-- Disable RLS temporarily to fix authentication issues
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

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Anyone can view active quizzes" ON quizzes;
DROP POLICY IF EXISTS "Anyone can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Anyone can update quizzes" ON quizzes;
DROP POLICY IF EXISTS "Surveys are viewable by everyone" ON surveys;
DROP POLICY IF EXISTS "Users can create surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete their own surveys" ON surveys;
