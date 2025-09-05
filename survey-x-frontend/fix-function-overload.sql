-- FIX FUNCTION OVERLOAD CONFLICT
-- Remove the old UUID version and keep only the TEXT version

-- Drop the old UUID version of the function
DROP FUNCTION IF EXISTS is_quiz_accepting_responses(UUID);

-- Verify only the TEXT version remains
SELECT
    proname,
    pg_get_function_identity_arguments(oid) as args,
    obj_description(oid, 'pg_proc') as description
FROM pg_proc
WHERE proname = 'is_quiz_accepting_responses';
