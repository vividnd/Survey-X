-- Simple test to verify RLS is working
-- Run this in Supabase SQL Editor

-- Test 1: Basic table access (should work)
SELECT COUNT(*) FROM surveys;

-- Test 2: Specific survey lookup (this is what's failing)
SELECT survey_id FROM surveys WHERE survey_id = 'test-survey-id' LIMIT 1;

-- Test 3: Check if we can see policy details
SELECT * FROM pg_policies WHERE tablename = 'surveys';
