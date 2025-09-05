-- Check which functions still have mutable search_path
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE 
        WHEN p.proconfig IS NULL THEN 'No config set'
        WHEN array_to_string(p.proconfig, ',') NOT LIKE '%search_path%' THEN 'Mutable search_path'
        ELSE 'Fixed'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY 
    CASE 
        WHEN p.proconfig IS NULL THEN 1
        WHEN array_to_string(p.proconfig, ',') NOT LIKE '%search_path%' THEN 2
        ELSE 3
    END,
    p.proname;
