-- Simple manual approach: Create policies one by one
-- Run these commands individually in Supabase SQL Editor

CREATE POLICY "Allow all operations on quizzes" ON public.quizzes FOR ALL USING (true);
CREATE POLICY "Allow all operations on surveys" ON public.surveys FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_questions" ON public.survey_questions FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_responses" ON public.survey_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations on quiz_questions" ON public.quiz_questions FOR ALL USING (true);
CREATE POLICY "Allow all operations on quiz_attempts" ON public.quiz_attempts FOR ALL USING (true);
CREATE POLICY "Allow all operations on quiz_responses" ON public.quiz_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations on whitelist" ON public.whitelist FOR ALL USING (true);
CREATE POLICY "Allow all operations on special_surveys" ON public.special_surveys FOR ALL USING (true);
CREATE POLICY "Allow all operations on special_survey_responses" ON public.special_survey_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_profiles" ON public.user_profiles FOR ALL USING (true);
