-- Comprehensive fix for ALL functions with mutable search_path
DO $$
DECLARE
    func_record RECORD;
    alter_cmd TEXT;
BEGIN
    FOR func_record IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as arguments
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        -- Only fix functions that actually need it (don't have search_path set)
        AND NOT EXISTS (
            SELECT 1 FROM pg_proc p2
            WHERE p2.oid = p.oid 
            AND p2.proconfig IS NOT NULL 
            AND array_to_string(p2.proconfig, ',') LIKE '%search_path%'
        )
    LOOP
        -- Build the ALTER FUNCTION command with arguments
        alter_cmd := 'ALTER FUNCTION ' || func_record.schema_name || '.' || 
                    func_record.function_name || '(' || func_record.arguments || 
                    ') SET search_path = public';
        
        -- Execute the command
        BEGIN
            EXECUTE alter_cmd;
            RAISE NOTICE 'Fixed search_path for: % (%)', 
                        func_record.function_name, func_record.arguments;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error fixing % (%): %', 
                           func_record.function_name, func_record.arguments, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Search path fix completed!';
END $$;
