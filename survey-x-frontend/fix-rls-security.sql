-- Option 1: Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "Anyone can view active quizzes" ON quizzes;
DROP POLICY IF EXISTS "Anyone can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Anyone can update quizzes" ON quizzes;
DROP POLICY IF EXISTS "Surveys are viewable by everyone" ON surveys;
DROP POLICY IF EXISTS "Users can create surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete their own surveys" ON surveys;

-- Then re-enable RLS with proper policies
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_survey_responses ENABLE ROW LEVEL SECURITY;
