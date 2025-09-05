-- Simpler deletion approach - collect IDs first, then delete
DO $$
DECLARE
    user_wallet TEXT := '2FtDcBkg7GurrE8d8KAHUH556E4DtzZKRGzFyANy8biK';
    survey_ids TEXT[];
    quiz_ids TEXT[];
    special_survey_ids TEXT[];
    deleted_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting simplified deletion for wallet: %', user_wallet;
    
    -- Collect survey IDs
    SELECT array_agg(survey_id::text) INTO survey_ids 
    FROM surveys WHERE creator_wallet = user_wallet;
    
    -- Collect quiz IDs  
    SELECT array_agg(id::text) INTO quiz_ids 
    FROM quizzes WHERE creator_wallet = user_wallet;
    
    -- Collect special survey IDs
    SELECT array_agg(id::text) INTO special_survey_ids 
    FROM special_surveys WHERE survey_id::text = ANY(survey_ids);
    
    RAISE NOTICE 'Found % surveys, % quizzes, % special surveys to delete', 
                array_length(survey_ids, 1), array_length(quiz_ids, 1), array_length(special_survey_ids, 1);
    
    -- Delete in correct order
    
    -- 1. Delete special survey responses
    IF special_survey_ids IS NOT NULL THEN
        DELETE FROM special_survey_responses 
        WHERE special_survey_id::text = ANY(special_survey_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % special survey responses', deleted_count;
    END IF;
    
    -- 2. Delete special surveys
    IF special_survey_ids IS NOT NULL THEN
        DELETE FROM special_surveys 
        WHERE id::text = ANY(special_survey_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % special surveys', deleted_count;
    END IF;
    
    -- 3. Delete quiz responses
    IF quiz_ids IS NOT NULL THEN
        DELETE FROM quiz_responses 
        WHERE quiz_id::text = ANY(quiz_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % quiz responses', deleted_count;
    END IF;
    
    -- 4. Delete quiz attempts
    IF quiz_ids IS NOT NULL THEN
        DELETE FROM quiz_attempts 
        WHERE quiz_id::text = ANY(quiz_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % quiz attempts', deleted_count;
    END IF;
    
    -- 5. Delete quiz questions
    IF quiz_ids IS NOT NULL THEN
        DELETE FROM quiz_questions 
        WHERE quiz_id::text = ANY(quiz_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % quiz questions', deleted_count;
    END IF;
    
    -- 6. Delete quizzes
    IF quiz_ids IS NOT NULL THEN
        DELETE FROM quizzes 
        WHERE id::text = ANY(quiz_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % quizzes', deleted_count;
    END IF;
    
    -- 7. Delete survey responses
    IF survey_ids IS NOT NULL THEN
        DELETE FROM survey_responses 
        WHERE survey_id::text = ANY(survey_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % survey responses', deleted_count;
    END IF;
    
    -- 8. Delete survey questions
    IF survey_ids IS NOT NULL THEN
        DELETE FROM survey_questions 
        WHERE survey_id::text = ANY(survey_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % survey questions', deleted_count;
    END IF;
    
    -- 9. Delete whitelist entries
    IF quiz_ids IS NOT NULL THEN
        DELETE FROM whitelist 
        WHERE quiz_id::text = ANY(quiz_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % whitelist entries', deleted_count;
    END IF;
    
    -- 10. Finally, delete surveys
    IF survey_ids IS NOT NULL THEN
        DELETE FROM surveys 
        WHERE survey_id::text = ANY(survey_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % surveys', deleted_count;
    END IF;
    
    RAISE NOTICE '✅ Simplified deletion completed successfully!';
END $$;
