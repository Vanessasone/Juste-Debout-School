BEGIN;
DO $test$
DECLARE named_id uuid := gen_random_uuid(); blank_id uuid := gen_random_uuid();
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 (named_id,'school-name-test@example.invalid','{"full_name":"  Test School  ","roles":["admin"]}'::jsonb),
 (blank_id,'school-blank-test@example.invalid','{}'::jsonb);
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=named_id AND full_name='Test School' AND roles=ARRAY['student']::text[]) THEN
 RAISE EXCEPTION 'Signup name or standard role regression'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=blank_id AND full_name IS NULL AND roles=ARRAY['student']::text[]) THEN
 RAISE EXCEPTION 'Missing metadata regression'; END IF;
END;
$test$;
ROLLBACK;