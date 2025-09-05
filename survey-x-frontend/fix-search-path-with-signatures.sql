-- Fix search_path for all functions with proper signatures
DO $$
DECLARE
    func_record RECORD;
    alter_cmd TEXT;
BEGIN
    FOR func_record IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as arguments,
            oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname LIKE '%quiz%'
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
END $$;
