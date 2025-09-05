-- Quiz System Database Schema - FIXED VERSION
-- Extends the existing survey system with quiz functionality and whitelist
-- Uses TEXT for quiz IDs to support Solana wallet addresses

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS special_survey_responses CASCADE;
DROP TABLE IF EXISTS special_surveys CASCADE;
DROP TABLE IF EXISTS whitelist CASCADE;
DROP TABLE IF EXISTS quiz_responses CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS auto_whitelist_passed_users() CASCADE;
DROP FUNCTION IF EXISTS update_attempt_score() CASCADE;
DROP FUNCTION IF EXISTS is_quiz_accepting_responses(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_user_whitelisted(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS calculate_attempt_score(UUID) CASCADE;
DROP FUNCTION IF EXISTS grade_mcq_response(UUID, JSONB) CASCADE;

-- Quiz table - extends surveys with quiz-specific fields
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT to support Solana addresses
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  minimum_score DECIMAL(5,2) DEFAULT 0.00, -- Minimum score to get whitelisted
  total_points DECIMAL(5,2) DEFAULT 0.00, -- Total possible points
  time_limit_minutes INTEGER, -- Optional time limit per attempt
  max_attempts INTEGER DEFAULT 1, -- Maximum attempts allowed
  availability_duration_minutes INTEGER, -- How long quiz is open for responses (e.g., 5 minutes)
  availability_ends_at TIMESTAMP WITH TIME ZONE, -- When quiz stops accepting responses
  creator_wallet TEXT NOT NULL, -- Wallet address of quiz creator
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz questions table - extends survey_questions with quiz-specific fields
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id TEXT REFERENCES quizzes(id) ON DELETE CASCADE, -- Changed from UUID to TEXT
  survey_question_id TEXT REFERENCES survey_questions(question_id) ON DELETE CASCADE,
  points DECIMAL(5,2) DEFAULT 1.00, -- Points for this question
  correct_answer TEXT, -- For MCQ questions
  correct_answers TEXT[], -- For multiple correct answers
  explanation TEXT, -- Explanation for the answer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix duplicate question_ids before adding UNIQUE constraint
UPDATE survey_questions
SET question_id = CONCAT('question_', EXTRACT(epoch FROM NOW())::text, '_', id::text)
WHERE question_id IS NOT NULL;

-- Add unique constraint to survey_questions.question_id (required for foreign key)
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_id_key UNIQUE (question_id);

-- Quiz attempts table - tracks participant attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id TEXT REFERENCES quizzes(id) ON DELETE CASCADE, -- Changed from UUID to TEXT
  participant_wallet TEXT NOT NULL, -- Wallet address of participant
  attempt_number INTEGER DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_taken_minutes INTEGER, -- Time taken to complete
  total_score DECIMAL(5,2) DEFAULT 0.00,
  max_possible_score DECIMAL(5,2) DEFAULT 0.00,
  percentage DECIMAL(5,2) DEFAULT 0.00,
  is_passed BOOLEAN DEFAULT false, -- Whether they passed the minimum score
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz responses table - individual question responses
CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  response_data JSONB, -- Encrypted response data
  is_correct BOOLEAN, -- For MCQ questions
  points_awarded DECIMAL(5,2) DEFAULT 0.00,
  is_graded BOOLEAN DEFAULT false, -- For text questions
  graded_by UUID REFERENCES auth.users(id), -- Who graded this response
  graded_at TIMESTAMP WITH TIME ZONE,
  feedback TEXT, -- Feedback from grader
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Whitelist table - tracks whitelisted addresses
CREATE TABLE IF NOT EXISTS whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  quiz_id TEXT REFERENCES quizzes(id) ON DELETE CASCADE, -- Changed from UUID to TEXT
  attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  whitelisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_address, quiz_id) -- One whitelist entry per wallet per quiz
);

-- Special surveys table - surveys only accessible to whitelisted users
CREATE TABLE IF NOT EXISTS special_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  quiz_id TEXT REFERENCES quizzes(id) ON DELETE CASCADE, -- Changed from UUID to TEXT
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Special survey responses - responses to special surveys
CREATE TABLE IF NOT EXISTS special_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_survey_id UUID REFERENCES special_surveys(id) ON DELETE CASCADE,
  participant_wallet TEXT NOT NULL,
  response_data JSONB, -- Encrypted response data
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_survey_id ON quizzes(survey_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_creator_wallet ON quizzes(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_participant ON quiz_attempts(participant_wallet);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_attempt_id ON quiz_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_wallet ON whitelist(wallet_address);
CREATE INDEX IF NOT EXISTS idx_whitelist_quiz_id ON whitelist(quiz_id);
CREATE INDEX IF NOT EXISTS idx_special_surveys_quiz_id ON special_surveys(quiz_id);
CREATE INDEX IF NOT EXISTS idx_special_survey_responses_survey_id ON special_survey_responses(special_survey_id);

-- RLS (Row Level Security) policies - temporarily disabled for debugging
-- ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE special_surveys ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE special_survey_responses ENABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS for debugging
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist DISABLE ROW LEVEL SECURITY;
ALTER TABLE special_surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE special_survey_responses DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on survey tables
-- ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE survey_questions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active quizzes" ON quizzes;
DROP POLICY IF EXISTS "Anyone can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Anyone can update quizzes" ON quizzes;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Anyone can create quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Anyone can view quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Anyone can create quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Anyone can update quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Anyone can view quiz responses" ON quiz_responses;
DROP POLICY IF EXISTS "Anyone can create quiz responses" ON quiz_responses;
DROP POLICY IF EXISTS "Anyone can view whitelist" ON whitelist;
DROP POLICY IF EXISTS "Anyone can create whitelist entries" ON whitelist;
DROP POLICY IF EXISTS "Anyone can view special surveys" ON special_surveys;
DROP POLICY IF EXISTS "Anyone can create special surveys" ON special_surveys;
DROP POLICY IF EXISTS "Anyone can view special survey responses" ON special_survey_responses;
DROP POLICY IF EXISTS "Anyone can create special survey responses" ON special_survey_responses;

-- Quiz policies
CREATE POLICY "Anyone can view active quizzes" ON quizzes FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can create quizzes" ON quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quizzes" ON quizzes FOR UPDATE USING (true);

-- Quiz questions policies
CREATE POLICY "Anyone can view quiz questions" ON quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_active = true)
);
CREATE POLICY "Anyone can create quiz questions" ON quiz_questions FOR INSERT WITH CHECK (true);

-- Quiz attempts policies
CREATE POLICY "Anyone can view quiz attempts" ON quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can create quiz attempts" ON quiz_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quiz attempts" ON quiz_attempts FOR UPDATE USING (true);

-- Quiz responses policies
CREATE POLICY "Anyone can view quiz responses" ON quiz_responses FOR SELECT USING (true);
CREATE POLICY "Anyone can create quiz responses" ON quiz_responses FOR INSERT WITH CHECK (true);

-- Whitelist policies
CREATE POLICY "Anyone can view whitelist" ON whitelist FOR SELECT USING (true);
CREATE POLICY "Anyone can create whitelist entries" ON whitelist FOR INSERT WITH CHECK (true);

-- Special surveys policies
CREATE POLICY "Anyone can view special surveys" ON special_surveys FOR SELECT USING (true);
CREATE POLICY "Anyone can create special surveys" ON special_surveys FOR INSERT WITH CHECK (true);

-- Special survey responses policies
CREATE POLICY "Anyone can view special survey responses" ON special_survey_responses FOR SELECT USING (true);
CREATE POLICY "Anyone can create special survey responses" ON special_survey_responses FOR INSERT WITH CHECK (true);

-- Functions for automatic grading
CREATE OR REPLACE FUNCTION grade_mcq_response(
  p_question_id UUID,
  p_response_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  correct_answer TEXT;
  user_answer TEXT;
BEGIN
  -- Get the correct answer
  SELECT qq.correct_answer INTO correct_answer
  FROM quiz_questions qq
  WHERE qq.id = p_question_id;
  
  -- Extract user answer from response data
  user_answer := p_response_data ->> 'answer';
  
  -- Compare answers (case-insensitive)
  RETURN LOWER(TRIM(user_answer)) = LOWER(TRIM(correct_answer));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total score for an attempt
CREATE OR REPLACE FUNCTION calculate_attempt_score(p_attempt_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_score DECIMAL(5,2) := 0.00;
BEGIN
  SELECT COALESCE(SUM(points_awarded), 0.00) INTO total_score
  FROM quiz_responses
  WHERE attempt_id = p_attempt_id;
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is whitelisted
CREATE OR REPLACE FUNCTION is_user_whitelisted(
  p_wallet_address TEXT,
  p_quiz_id TEXT -- Changed from UUID to TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM whitelist
    WHERE wallet_address = p_wallet_address
    AND quiz_id = p_quiz_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if quiz is still accepting responses
CREATE OR REPLACE FUNCTION is_quiz_accepting_responses(p_quiz_id TEXT) -- Changed from UUID to TEXT
RETURNS BOOLEAN AS $$
DECLARE
  quiz_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT availability_ends_at INTO quiz_ends_at
  FROM quizzes
  WHERE id = p_quiz_id;
  
  -- If no end time is set, quiz is always accepting responses
  IF quiz_ends_at IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if current time is before the end time
  RETURN NOW() < quiz_ends_at;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update quiz attempt scores
CREATE OR REPLACE FUNCTION update_attempt_score()
RETURNS TRIGGER AS $$
DECLARE
  new_total_score DECIMAL(5,2);
  max_possible_score DECIMAL(5,2);
  percentage DECIMAL(5,2);
  minimum_score DECIMAL(5,2);
  is_passed BOOLEAN;
BEGIN
  -- Calculate new total score
  new_total_score := calculate_attempt_score(NEW.attempt_id);
  
  -- Get max possible score and minimum score
  SELECT q.total_points, q.minimum_score INTO max_possible_score, minimum_score
  FROM quiz_attempts qa
  JOIN quizzes q ON q.id = qa.quiz_id
  WHERE qa.id = NEW.attempt_id;
  
  -- Calculate percentage
  percentage := CASE 
    WHEN max_possible_score > 0 THEN (new_total_score / max_possible_score) * 100
    ELSE 0
  END;
  
  -- Check if passed
  is_passed := new_total_score >= minimum_score;
  
  -- Update attempt
  UPDATE quiz_attempts
  SET 
    total_score = new_total_score,
    percentage = percentage,
    is_passed = is_passed,
    updated_at = NOW()
  WHERE id = NEW.attempt_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_attempt_score ON quiz_responses;
DROP TRIGGER IF EXISTS trigger_auto_whitelist ON quiz_attempts;

CREATE TRIGGER trigger_update_attempt_score
  AFTER INSERT OR UPDATE ON quiz_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_attempt_score();

-- Trigger to automatically whitelist users who pass
CREATE OR REPLACE FUNCTION auto_whitelist_passed_users()
RETURNS TRIGGER AS $$
BEGIN
  -- If user passed and is not already whitelisted, add to whitelist
  IF NEW.is_passed = true AND OLD.is_passed = false THEN
    INSERT INTO whitelist (wallet_address, quiz_id, attempt_id, score, percentage)
    VALUES (NEW.participant_wallet, NEW.quiz_id, NEW.id, NEW.total_score, NEW.percentage)
    ON CONFLICT (wallet_address, quiz_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_whitelist
  AFTER UPDATE ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION auto_whitelist_passed_users();
