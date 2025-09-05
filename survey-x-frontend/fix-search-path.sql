-- Fix search_path for all functions
-- This will make search_path immutable for security

-- Function to fix search_path for a specific function
CREATE OR REPLACE FUNCTION fix_function_search_path(function_name text, schema_name text DEFAULT 'public')
RETURNS void AS $$
DECLARE
    func_sql text;
BEGIN
    -- Get the current function definition
    SELECT pg_get_functiondef(oid) INTO func_sql
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = schema_name 
    AND p.proname = function_name;
    
    -- If function exists and doesn't have search_path set
    IF func_sql IS NOT NULL AND func_sql NOT LIKE '%SET search_path%' THEN
        -- Add search_path setting to function
        EXECUTE 'ALTER FUNCTION ' || schema_name || '.' || function_name || ' SET search_path = public';
        RAISE NOTICE 'Fixed search_path for function: %.%', schema_name, function_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix common functions that might have this issue
SELECT fix_function_search_path('is_quiz_accepting_responses');
SELECT fix_function_search_path('calculate_quiz_score');
SELECT fix_function_search_path('get_quiz_total_points');
SELECT fix_function_search_path('check_quiz_timer');
SELECT fix_function_search_path('validate_quiz_response');
SELECT fix_function_search_path('get_user_quiz_attempts');
SELECT fix_function_search_path('update_quiz_attempt');
SELECT fix_function_search_path('finalize_quiz_attempt');

-- Drop the helper function
DROP FUNCTION fix_function_search_path(text, text);
