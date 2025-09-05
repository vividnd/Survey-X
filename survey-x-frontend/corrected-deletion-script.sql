-- Corrected deletion script with proper column names
-- This version handles different column naming conventions

DO $$
DECLARE
    user_wallet TEXT := '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK';
    deleted_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting corrected deletion for wallet: %', user_wallet;
    
    -- Delete in correct order with proper column names
    
    -- 1. Delete special survey responses
    DELETE FROM special_survey_responses 
    WHERE special_survey_id::text IN (
        SELECT id::text FROM special_surveys 
        WHERE survey_id::text IN (
            SELECT survey_id FROM surveys WHERE creator_wallet = user_wallet
        )
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % special survey responses', deleted_count;
    
    -- 2. Delete special surveys
    DELETE FROM special_surveys 
    WHERE survey_id::text IN (
        SELECT survey_id FROM surveys WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % special surveys', deleted_count;
    
    -- 3. Delete quiz responses (check for different column names)
    BEGIN
        DELETE FROM quiz_responses 
        WHERE quiz_id::text IN (
            SELECT id::text FROM quizzes WHERE creator_wallet = user_wallet
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % quiz responses', deleted_count;
    EXCEPTION
        WHEN undefined_column THEN
            -- Try alternative column name
            DELETE FROM quiz_responses 
            WHERE attempt_id::text IN (
                SELECT id::text FROM quiz_attempts 
                WHERE quiz_id::text IN (
                    SELECT id::text FROM quizzes WHERE creator_wallet = user_wallet
                )
            );
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % quiz responses (using attempt_id)', deleted_count;
    END;
    
    -- 4. Delete quiz attempts
    DELETE FROM quiz_attempts 
    WHERE quiz_id::text IN (
        SELECT id::text FROM quizzes WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % quiz attempts', deleted_count;
    
    -- 5. Delete quiz questions
    DELETE FROM quiz_questions 
    WHERE quiz_id::text IN (
        SELECT id::text FROM quizzes WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % quiz questions', deleted_count;
    
    -- 6. Delete quizzes
    DELETE FROM quizzes WHERE creator_wallet = user_wallet;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % quizzes', deleted_count;
    
    -- 7. Delete survey responses
    DELETE FROM survey_responses 
    WHERE survey_id::text IN (
        SELECT survey_id FROM surveys WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % survey responses', deleted_count;
    
    -- 8. Delete survey questions
    DELETE FROM survey_questions 
    WHERE survey_id::text IN (
        SELECT survey_id FROM surveys WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % survey questions', deleted_count;
    
    -- 9. Delete whitelist entries
    DELETE FROM whitelist 
    WHERE quiz_id::text IN (
        SELECT id::text FROM quizzes WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % whitelist entries', deleted_count;
    
    -- 10. Finally, delete surveys
    DELETE FROM surveys WHERE creator_wallet = user_wallet;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % surveys', deleted_count;
    
    RAISE NOTICE '✅ Corrected deletion completed successfully!';
END $$;
