-- Simple Survey-X Database Schema for Supabase
-- Copy and paste this entire script into your Supabase SQL Editor

-- Create tables
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_wallet VARCHAR(44) NOT NULL,
    survey_id VARCHAR(88) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    hashtags TEXT[],
    is_active BOOLEAN DEFAULT true,
    question_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    max_responses INTEGER DEFAULT NULL, -- Maximum number of responses allowed
    encrypted_data TEXT, -- Encrypted survey data for MPC
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.survey_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id VARCHAR(88) NOT NULL REFERENCES surveys(survey_id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'rating', 'text_input')),
    options TEXT[],
    required BOOLEAN DEFAULT true,
    order_index INTEGER NOT NULL,
    UNIQUE(survey_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id VARCHAR(88) NOT NULL REFERENCES surveys(survey_id) ON DELETE CASCADE,
    responder_wallet VARCHAR(44) NOT NULL,
    response_id VARCHAR(88) UNIQUE NOT NULL,
    computation_status VARCHAR(20) DEFAULT 'pending' CHECK (computation_status IN ('pending', 'processing', 'completed', 'failed')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transaction_hash VARCHAR(88),
    encrypted_data TEXT, -- Encrypted response data for MPC
    UNIQUE(survey_id, responder_wallet)
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

-- Enable Row Level Security
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create basic policies (simplified for now)
CREATE POLICY "Allow all operations on surveys" ON surveys FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_questions" ON survey_questions FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_responses" ON survey_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles FOR ALL USING (true);

-- Function to check if survey has reached max responses
CREATE OR REPLACE FUNCTION is_survey_full(survey_uuid VARCHAR(88))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT
            CASE
                WHEN s.max_responses IS NULL THEN FALSE
                WHEN s.response_count >= s.max_responses THEN TRUE
                ELSE FALSE
            END
        FROM surveys s
        WHERE s.survey_id = survey_uuid
    );
END;
$$ LANGUAGE plpgsql;
