-- Fixed version: Add policies without quote escaping issues
DO $$
DECLARE
    table_record RECORD;
    policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Adding policies to tables with RLS enabled but no policies...';
    
    FOR table_record IN
        SELECT 
            n.nspname as schema_name,
            c.relname as table_name
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_policy p ON p.polrelid = c.oid
        WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relrowsecurity = true
        AND c.relname IN ('surveys', 'survey_questions', 'survey_responses', 'quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_responses', 'whitelist', 'special_surveys', 'special_survey_responses', 'user_profiles')
        GROUP BY n.nspname, c.relname
        HAVING COUNT(p.polname) = 0
    LOOP
        -- Create the policy with simple quotes
        EXECUTE 'CREATE POLICY "Allow all operations on ' || table_record.table_name || '" ON ' || 
                table_record.schema_name || '.' || table_record.table_name || 
                ' FOR ALL USING (true)';
        
        policy_count := policy_count + 1;
        RAISE NOTICE '✓ Created policy for: %.%', 
                    table_record.schema_name, table_record.table_name;
    END LOOP;
    
    RAISE NOTICE 'Policy creation completed! Added % policies.', policy_count;
END $$;
