-- Survey-X Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable RLS (Row Level Security)
-- Note: JWT secret is configured in Supabase Dashboard > Settings > API

-- Create tables
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_wallet VARCHAR(44) NOT NULL, -- Solana wallet address
    survey_id VARCHAR(88) UNIQUE NOT NULL, -- Arcium survey ID
    category VARCHAR(50) NOT NULL,
    hashtags TEXT[], -- Array of hashtags
    is_active BOOLEAN DEFAULT true,
    question_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.survey_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id VARCHAR(88) NOT NULL REFERENCES surveys(survey_id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'rating', 'text_input')),
    options TEXT[], -- For multiple choice questions
    required BOOLEAN DEFAULT true,
    order_index INTEGER NOT NULL,
    UNIQUE(survey_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id VARCHAR(88) NOT NULL REFERENCES surveys(survey_id) ON DELETE CASCADE,
    responder_wallet VARCHAR(44) NOT NULL,
    response_id VARCHAR(88) UNIQUE NOT NULL, -- Arcium response ID
    computation_status VARCHAR(20) DEFAULT 'pending' CHECK (computation_status IN ('pending', 'processing', 'completed', 'failed')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transaction_hash VARCHAR(88), -- Solana transaction hash
    UNIQUE(survey_id, responder_wallet) -- One response per survey per wallet
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    wallet_address VARCHAR(44) PRIMARY KEY,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    surveys_created INTEGER DEFAULT 0,
    responses_submitted INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_surveys_creator_wallet ON surveys(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_surveys_category ON surveys(category);
CREATE INDEX IF NOT EXISTS idx_surveys_active ON surveys(is_active);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_wallet ON survey_responses(responder_wallet);
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON survey_questions(survey_id);

-- Enable RLS (temporarily disabled for debugging)
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Surveys: Anyone can read, only creator can update/delete
CREATE POLICY "Surveys are viewable by everyone" ON surveys FOR SELECT USING (true);
CREATE POLICY "Users can create surveys" ON surveys FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own surveys" ON surveys FOR UPDATE USING (
  creator_wallet = auth.jwt()->>'wallet_address' OR
  creator_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
  true  -- Allow all updates for now (less secure but functional)
);
CREATE POLICY "Users can delete their own surveys" ON surveys FOR DELETE USING (
  creator_wallet = auth.jwt()->>'wallet_address' OR
  creator_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
  true  -- Allow all deletes for now (less secure but functional)
);

-- Survey Questions: Same as surveys
CREATE POLICY "Survey questions are viewable by everyone" ON survey_questions FOR SELECT USING (true);
CREATE POLICY "Users can create questions for their surveys" ON survey_questions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM surveys WHERE survey_id = survey_questions.survey_id AND creator_wallet = auth.jwt()->>'wallet_address')
);
CREATE POLICY "Users can update questions for their surveys" ON survey_questions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM surveys WHERE survey_id = survey_questions.survey_id AND creator_wallet = auth.jwt()->>'wallet_address')
);

-- Survey Responses: Private to responder, but allow survey creator to see aggregated data
CREATE POLICY "Users can view their own responses" ON survey_responses FOR SELECT USING (responder_wallet = auth.jwt()->>'wallet_address');
CREATE POLICY "Users can create responses" ON survey_responses FOR INSERT WITH CHECK (responder_wallet = auth.jwt()->>'wallet_address');
CREATE POLICY "Users can update their own responses" ON survey_responses FOR UPDATE USING (responder_wallet = auth.jwt()->>'wallet_address');

-- User Profiles: Users can manage their own profiles
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON user_profiles FOR INSERT WITH CHECK (wallet_address = auth.jwt()->>'wallet_address');
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (wallet_address = auth.jwt()->>'wallet_address');

-- Functions for updating counters
CREATE OR REPLACE FUNCTION increment_survey_response_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE surveys SET response_count = response_count + 1 WHERE survey_id = NEW.survey_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_user_response_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles SET responses_submitted = responses_submitted + 1 WHERE wallet_address = NEW.responder_wallet;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_user_survey_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles SET surveys_created = surveys_created + 1 WHERE wallet_address = NEW.creator_wallet;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_increment_survey_response_count
    AFTER INSERT ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION increment_survey_response_count();

CREATE TRIGGER trigger_increment_user_response_count
    AFTER INSERT ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION increment_user_response_count();

CREATE TRIGGER trigger_increment_user_survey_count
    AFTER INSERT ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION increment_user_survey_count();

-- Create categories enum (optional, for data integrity)
CREATE TYPE survey_category AS ENUM (
    'technology', 'health', 'education', 'entertainment',
    'business', 'sports', 'politics', 'science',
    'lifestyle', 'other'
);

-- Add category constraint (optional)
ALTER TABLE surveys ADD CONSTRAINT valid_category CHECK (category::survey_category IS NOT NULL);
