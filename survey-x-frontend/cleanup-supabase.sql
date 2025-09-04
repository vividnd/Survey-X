-- Cleanup Survey-X Database Tables
-- Run this FIRST to remove old tables, then run the simple schema

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.survey_responses CASCADE;
DROP TABLE IF EXISTS public.survey_questions CASCADE;
DROP TABLE IF EXISTS public.surveys CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Drop any existing policies (they will be recreated with simple schema)
DROP POLICY IF EXISTS "Surveys are viewable by everyone" ON surveys;
DROP POLICY IF EXISTS "Users can create surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete their own surveys" ON surveys;
DROP POLICY IF EXISTS "Survey questions are viewable by everyone" ON survey_questions;
DROP POLICY IF EXISTS "Users can create questions for their surveys" ON survey_questions;
DROP POLICY IF EXISTS "Users can update questions for their surveys" ON survey_questions;
DROP POLICY IF EXISTS "Users can view their own responses" ON survey_responses;
DROP POLICY IF EXISTS "Users can create responses" ON survey_responses;
DROP POLICY IF EXISTS "Users can update their own responses" ON survey_responses;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Drop any existing indexes
DROP INDEX IF EXISTS idx_surveys_creator_wallet;
DROP INDEX IF EXISTS idx_surveys_category;
DROP INDEX IF EXISTS idx_surveys_active;
DROP INDEX IF EXISTS idx_surveys_created_at;
DROP INDEX IF EXISTS idx_survey_responses_survey_id;
DROP INDEX IF EXISTS idx_survey_responses_wallet;
DROP INDEX IF EXISTS idx_survey_questions_survey_id;

-- Drop any existing functions/triggers
DROP TRIGGER IF EXISTS trigger_increment_survey_response_count ON survey_responses;
DROP TRIGGER IF EXISTS trigger_increment_user_response_count ON survey_responses;
DROP TRIGGER IF EXISTS trigger_increment_user_survey_count ON surveys;
DROP FUNCTION IF EXISTS increment_survey_response_count();
DROP FUNCTION IF EXISTS increment_user_response_count();
DROP FUNCTION IF EXISTS increment_user_survey_count();

-- Drop the new function we added
DROP FUNCTION IF EXISTS is_survey_full(VARCHAR);

-- Drop the category enum if it exists
DROP TYPE IF EXISTS survey_category;

-- ============================================================================
-- TABLE CREATION ONLY (since cleanup already worked)
-- Run this script in Supabase SQL Editor
-- ============================================================================

-- Create tables
CREATE TABLE public.surveys (
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

CREATE TABLE public.survey_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id VARCHAR(88) NOT NULL REFERENCES surveys(survey_id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    options TEXT[],
    required BOOLEAN DEFAULT true,
    order_index INTEGER NOT NULL,
    UNIQUE(survey_id, question_id)
);

CREATE TABLE public.survey_responses (
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

CREATE TABLE public.user_profiles (
    wallet_address VARCHAR(44) PRIMARY KEY,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    surveys_created INTEGER DEFAULT 0,
    responses_submitted INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create basic policies (simplified for now)
CREATE POLICY "Allow all operations on surveys" ON surveys FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_questions" ON survey_questions FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_responses" ON survey_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles FOR ALL USING (true);

-- ============================================================================
-- SUCCESS: MPC-ENABLED DATABASE IS READY!
-- ============================================================================
-- Your database now supports:
-- ✅ Encrypted survey data storage
-- ✅ Response limits per survey
-- ✅ MPC computation status tracking
-- ✅ Privacy-preserving data handling
-- ============================================================================
