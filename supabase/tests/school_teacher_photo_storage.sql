BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE 'admin'=ANY(roles) LIMIT 1),true);
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects(bucket_id,name) VALUES('photos','teachers/00000000-0000-0000-0000-000000000001.jpg');
UPDATE storage.objects SET metadata='{"test":true}'::jsonb WHERE bucket_id='photos' AND name='teachers/00000000-0000-0000-0000-000000000001.jpg';
DO $test$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='photos' AND name='teachers/00000000-0000-0000-0000-000000000001.jpg' AND metadata->>'test'='true') THEN
 RAISE EXCEPTION 'Admin upload/replacement failed'; END IF;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE roles=ARRAY['student']::text[] LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN
 BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('photos','teachers/00000000-0000-0000-0000-000000000002.jpg');
 RAISE EXCEPTION 'Student unexpectedly allowed upload';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 UPDATE storage.objects SET metadata='{"test":false}'::jsonb WHERE bucket_id='photos' AND name='teachers/00000000-0000-0000-0000-000000000001.jpg';
 IF FOUND THEN RAISE EXCEPTION 'Student unexpectedly allowed replacement'; END IF;
END $test$;
RESET ROLE;
ROLLBACK;