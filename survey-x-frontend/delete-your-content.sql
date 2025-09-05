-- Delete ALL your created content
-- ⚠️  This will permanently delete ALL your surveys and quizzes!

DO $$
DECLARE
    user_wallet TEXT := '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK'; -- Your wallet address
    deleted_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting deletion of all content for wallet: %', user_wallet;
    
    -- Delete in correct order to handle foreign keys
    
    -- 1. Delete special survey responses first
    DELETE FROM special_survey_responses 
    WHERE special_survey_id IN (
        SELECT id FROM special_surveys 
        WHERE survey_id IN (
            SELECT survey_id FROM surveys WHERE creator_wallet = user_wallet
        )
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % special survey responses', deleted_count;
    
    -- 2. Delete special surveys
    DELETE FROM special_surveys 
    WHERE survey_id IN (
        SELECT survey_id FROM surveys WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % special surveys', deleted_count;
    
    -- 3. Delete quiz responses
    DELETE FROM quiz_responses 
    WHERE quiz_id IN (
        SELECT id FROM quizzes WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % quiz responses', deleted_count;
    
    -- 4. Delete quiz attempts
    DELETE FROM quiz_attempts 
    WHERE quiz_id IN (
        SELECT id FROM quizzes WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % quiz attempts', deleted_count;
    
    -- 5. Delete quiz questions
    DELETE FROM quiz_questions 
    WHERE quiz_id IN (
        SELECT id FROM quizzes WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % quiz questions', deleted_count;
    
    -- 6. Delete quizzes
    DELETE FROM quizzes WHERE creator_wallet = user_wallet;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % quizzes', deleted_count;
    
    -- 7. Delete survey responses
    DELETE FROM survey_responses 
    WHERE survey_id IN (
        SELECT survey_id FROM surveys WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % survey responses', deleted_count;
    
    -- 8. Delete survey questions
    DELETE FROM survey_questions 
    WHERE survey_id IN (
        SELECT survey_id FROM surveys WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % survey questions', deleted_count;
    
    -- 9. Delete whitelist entries
    DELETE FROM whitelist 
    WHERE quiz_id IN (
        SELECT id FROM quizzes WHERE creator_wallet = user_wallet
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % whitelist entries', deleted_count;
    
    -- 10. Finally, delete surveys
    DELETE FROM surveys WHERE creator_wallet = user_wallet;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % surveys', deleted_count;
    
    RAISE NOTICE '✅ All content deletion completed successfully!';
END $$;
