-- FIX ALL FUNCTION OVERLOAD CONFLICTS
-- Remove old UUID versions and keep only TEXT versions

-- Drop old UUID versions
DROP FUNCTION IF EXISTS is_quiz_accepting_responses(UUID);
DROP FUNCTION IF EXISTS is_user_whitelisted(TEXT, UUID);
DROP FUNCTION IF EXISTS calculate_attempt_score(UUID);

-- Verify only TEXT versions remain
SELECT
    proname,
    pg_get_function_identity_arguments(oid) as args
FROM pg_proc
WHERE proname IN ('is_quiz_accepting_responses', 'is_user_whitelisted', 'calculate_attempt_score')
ORDER BY proname, oid;
