-- First, get the exact function signatures
SELECT 
    'ALTER FUNCTION public.' || p.proname || '(' || 
    pg_get_function_identity_arguments(p.oid) || 
    ') SET search_path = public;' as alter_command
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%quiz%'
ORDER BY p.proname;
