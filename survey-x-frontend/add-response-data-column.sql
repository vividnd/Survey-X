-- Add response_data column to survey_responses table
-- This allows creators to view actual survey answers while maintaining encrypted data for MPC

ALTER TABLE public.survey_responses 
ADD COLUMN IF NOT EXISTS response_data JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN public.survey_responses.response_data IS 'Actual response data in JSON format for creators to view. Encrypted_data is used for MPC processing.';
