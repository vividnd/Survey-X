-- Clean up conflicting policies and test
-- Step 1: Drop conflicting policies
DROP POLICY IF EXISTS "Allow all operations on surveys" ON surveys;
DROP POLICY IF EXISTS "Allow all operations on survey_questions" ON survey_questions;
DROP POLICY IF EXISTS "Allow all operations on survey_responses" ON survey_responses;

-- Step 2: Keep only the working granular policies for surveys
-- (We already have: Enable select, insert, update, delete for surveys)

-- Step 3: Add consistent policies for other tables
CREATE POLICY "Enable select for survey_questions" ON survey_questions FOR SELECT USING (true);
CREATE POLICY "Enable insert for survey_questions" ON survey_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for survey_questions" ON survey_questions FOR UPDATE USING (true);
CREATE POLICY "Enable delete for survey_questions" ON survey_questions FOR DELETE USING (true);

CREATE POLICY "Enable select for survey_responses" ON survey_responses FOR SELECT USING (true);
CREATE POLICY "Enable insert for survey_responses" ON survey_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for survey_responses" ON survey_responses FOR UPDATE USING (true);
CREATE POLICY "Enable delete for survey_responses" ON survey_responses FOR DELETE USING (true);

-- Step 4: Verify final state
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'survey_questions', 'survey_responses')
ORDER BY tablename, cmd;

-- Step 5: Test a simple query that was failing
SELECT COUNT(*) as survey_count FROM surveys LIMIT 1;
