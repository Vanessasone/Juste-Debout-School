BEGIN;
DO $test$
DECLARE student_id uuid:=gen_random_uuid(); director_id uuid:=gen_random_uuid(); global_id uuid:=gen_random_uuid(); jacky_id uuid:=gen_random_uuid(); core_request uuid; industry_request uuid; denied boolean;
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
 (student_id,'access-student@example.invalid',now(),'{"full_name":"Access Test"}'),
 (director_id,'access-director@example.invalid',now(),'{}'),
 (global_id,'access-global@example.invalid',now(),'{}'),
 (jacky_id,'access-jacky@example.invalid',now(),'{}');
 UPDATE public.jds_school_responsibilities SET profile_id=director_id,enabled=true WHERE email='rabah@juste-debout.com';
 UPDATE public.jds_school_responsibilities SET profile_id=global_id,enabled=true WHERE email='nicolas@juste-debout.com';
 UPDATE public.jds_school_responsibilities SET profile_id=jacky_id,enabled=true WHERE email='jacky@juste-debout.com';
 PERFORM set_config('request.jwt.claim.sub',student_id::text,true);
 core_request:=public.jds_submit_access_request('teacher','CORE','Hip-Hop');
 industry_request:=public.jds_submit_access_request('teacher','INDUSTRY','House');
 IF public.jds_submit_access_request('teacher','CORE','Other')<>core_request THEN RAISE EXCEPTION 'Duplicate request'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=student_id AND roles<>ARRAY['student']::text[]) THEN RAISE EXCEPTION 'Unexpected role grant'; END IF;
 denied:=false;
 BEGIN PERFORM public.jds_review_access_request(core_request,'approved'); EXCEPTION WHEN raise_exception THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Student self approval'; END IF;
 PERFORM set_config('request.jwt.claim.sub',jacky_id::text,true);
 IF school_private.can_review_access('INDUSTRY','teacher') THEN RAISE EXCEPTION 'Jacky may not validate teachers'; END IF;
 PERFORM set_config('request.jwt.claim.sub',director_id::text,true);
 IF NOT school_private.can_review_access('CORE','teacher') OR school_private.can_review_access('INDUSTRY','teacher') OR school_private.can_review_access('CORE','team') THEN RAISE EXCEPTION 'Director campus/kind isolation'; END IF;
 denied:=false;
 BEGIN PERFORM public.jds_review_access_request(industry_request,'approved'); EXCEPTION WHEN raise_exception THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-campus approval'; END IF;
 PERFORM public.jds_review_access_request(core_request,'approved');
 IF NOT EXISTS(SELECT 1 FROM public.jds_access_requests WHERE id=core_request AND status='approved' AND reviewed_by=director_id) THEN RAISE EXCEPTION 'Approval receipt missing'; END IF;
 PERFORM set_config('request.jwt.claim.sub',global_id::text,true);
 IF NOT school_private.can_review_access('INDUSTRY','teacher') OR NOT school_private.can_review_access('CORE','teacher') THEN RAISE EXCEPTION 'Nicolas global access'; END IF;
 PERFORM public.jds_review_access_request(industry_request,'rejected','Test reason');
 PERFORM set_config('request.jwt.claim.sub',student_id::text,true);
 PERFORM public.jds_submit_access_request('teacher','INDUSTRY','House');
 IF NOT EXISTS(SELECT 1 FROM public.jds_access_requests WHERE id=industry_request AND status='pending' AND reviewed_by IS NULL) THEN RAISE EXCEPTION 'Resubmission failed'; END IF;
 IF has_table_privilege('authenticated','public.jds_access_requests','INSERT') OR has_table_privilege('authenticated','public.jds_access_requests','UPDATE') OR has_function_privilege('anon','public.jds_submit_access_request(text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Unsafe grants'; END IF;
END $test$;
ROLLBACK;
