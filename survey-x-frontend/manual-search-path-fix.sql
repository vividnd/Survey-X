-- Manual fix for each function
-- Replace 'function_name' with the actual function name

ALTER FUNCTION public.is_quiz_accepting_responses SET search_path = public;
ALTER FUNCTION public.calculate_quiz_score SET search_path = public;
ALTER FUNCTION public.get_quiz_total_points SET search_path = public;
ALTER FUNCTION public.check_quiz_timer SET search_path = public;
ALTER FUNCTION public.validate_quiz_response SET search_path = public;
ALTER FUNCTION public.get_user_quiz_attempts SET search_path = public;
ALTER FUNCTION public.update_quiz_attempt SET search_path = public;
ALTER FUNCTION public.finalize_quiz_attempt SET search_path = public;
