-- COMPLETE RESET: Drop and recreate quiz tables
-- Use this if nothing else works

-- Drop all quiz-related tables
DROP TABLE IF EXISTS quiz_responses CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;

-- Recreate tables without RLS
\i quiz-schema-fixed.sql

-- Verify tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'quiz%';

-- Confirm RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'quiz%';
