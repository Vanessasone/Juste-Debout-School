-- Synthetic, rollback-only acceptance test. No real grades or notices retained.
DO $test$
DECLARE teacher uuid:=gen_random_uuid(); person uuid:=gen_random_uuid(); grp uuid; member uuid;
 street uuid; dance uuid; theory uuid; short uuid; unknown uuid; report uuid; payload jsonb; denied boolean; result numeric;
BEGIN
 SELECT id INTO grp FROM public.jds_training_groups WHERE campus='INDUSTRY' AND name='P3' AND season='2026-2027';
 UPDATE public.jds_bulletin_subjects SET active=false WHERE group_id=grp AND term=3;
 INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES(teacher,teacher::text||'@example.invalid','{}',now());
 INSERT INTO public.jds_access_requests(profile_id,kind,campus,status) VALUES(teacher,'teacher','INDUSTRY','approved');
 INSERT INTO public.jds_private_directory(id,external_key,campus,person_type,first_name,last_name) VALUES(person,person::text,'INDUSTRY','student','Synthetic','Coefficients');
 INSERT INTO public.jds_training_members(group_id,person_id) VALUES(grp,person) RETURNING id INTO member;
 PERFORM set_config('request.jwt.claim.sub','74d99439-9ecb-454d-b7c8-c3d186dd9bf5',true);
 street:=public.jds_save_bulletin_subject_policy(grp,3,'HIP HOP',teacher,'Synthetic teacher','street',3);
 dance:=public.jds_save_bulletin_subject_policy(grp,3,'MODERN',teacher,'Synthetic teacher','dance',8);
 theory:=public.jds_save_bulletin_subject_policy(grp,3,'ANATOMIE',teacher,'Synthetic teacher','theory',5);
 short:=public.jds_save_bulletin_subject_policy(grp,3,'BREAK',teacher,'Synthetic teacher','street',2);
 unknown:=public.jds_save_bulletin_subject_policy(grp,3,'Short unassigned',NULL,'',NULL,NULL);
 IF (SELECT cc_coefficient FROM public.jds_bulletin_subjects WHERE id=street)<>4 OR (SELECT evaluation_coefficient FROM public.jds_bulletin_subjects WHERE id=dance)<>2 OR (SELECT cc_coefficient FROM public.jds_bulletin_subjects WHERE id=theory)<>1 OR (SELECT cc_coefficient FROM public.jds_bulletin_subjects WHERE id=short)<>0 THEN RAISE EXCEPTION '4/2/1/0 policy failed'; END IF;
 PERFORM public.jds_save_bulletin_draft(member,3,'Synthetic coefficient acceptance',0,0);
 PERFORM set_config('request.jwt.claim.sub',teacher::text,true);
 PERFORM public.jds_save_bulletin_grade(street,member,ARRAY[5]::numeric[],ARRAY[20]::numeric[],false,false,'Synthetic',true);
 PERFORM public.jds_save_bulletin_grade(dance,member,ARRAY[2.5]::numeric[],ARRAY[10]::numeric[],false,false,'Synthetic',true);
 PERFORM public.jds_save_bulletin_grade(theory,member,ARRAY[0]::numeric[],ARRAY[0]::numeric[],false,false,'Synthetic',true);
 denied:=false;BEGIN PERFORM public.jds_save_bulletin_subject_policy(grp,3,'BREAK',teacher,'Synthetic teacher','street',3,0,short);EXCEPTION WHEN raise_exception THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Teacher changed the policy';END IF;
 PERFORM set_config('request.jwt.claim.sub','74d99439-9ecb-454d-b7c8-c3d186dd9bf5',true);
 denied:=false;BEGIN PERFORM public.jds_preview_bulletin(member,3);EXCEPTION WHEN raise_exception THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Unknown course count accepted for publication';END IF;
 PERFORM public.jds_save_bulletin_subject_policy(grp,3,'Short unassigned',NULL,'',NULL,0,0,unknown);
 payload:=public.jds_preview_bulletin(member,3);
 IF (payload->>'cc_average20')::numeric<>14.29 OR (payload->>'evaluation_average20')::numeric<>14.29 THEN RAISE EXCEPTION 'Weighted means or zero treatment failed: %',payload;END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(payload->'rows') r WHERE (r->>'taught_course_count')::int=2 AND (r->>'excluded_low_course_count')::boolean) THEN RAISE EXCEPTION 'Missing exclusion label';END IF;
 SELECT grade_mean20 INTO result FROM public.jds_student_three_rankings() WHERE member_id=member;
 IF abs(result-100::numeric/7)>0.00001 THEN RAISE EXCEPTION 'Ranking weights failed: %',result;END IF;
 report:=public.jds_publish_bulletin(member,3);
 -- Crossing the 2 -> 3 boundary restores weight 4 and requires a real evaluation.
 PERFORM public.jds_save_bulletin_subject_policy(grp,3,'BREAK',teacher,'Synthetic teacher','street',3,0,short);
 denied:=false;BEGIN PERFORM public.jds_preview_bulletin(member,3);EXCEPTION WHEN raise_exception THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Third course did not restore grade requirement';END IF;
 PERFORM public.jds_save_bulletin_grade(short,member,ARRAY[0]::numeric[],ARRAY[0]::numeric[],false,false,'Synthetic zero',true);
 payload:=public.jds_preview_bulletin(member,3);
 IF (payload->>'cc_average20')::numeric<>9.09 THEN RAISE EXCEPTION 'Third course did not restore weight';END IF;
 IF (SELECT (snapshot->>'cc_average20')::numeric FROM public.jds_bulletin_reports WHERE id=report)<>14.29 THEN RAISE EXCEPTION 'Published snapshot mutated';END IF;
 -- Both legacy clients and direct row changes must obey the category, never manual weights.
 PERFORM public.jds_save_bulletin_subject(grp,3,'HIP HOP',teacher,'Synthetic teacher',99,99,0,street);
 IF (SELECT cc_coefficient FROM public.jds_bulletin_subjects WHERE id=street)<>4 THEN RAISE EXCEPTION 'Legacy endpoint bypassed policy';END IF;
 PERFORM public.jds_save_bulletin_subject_policy(grp,3,'Short unassigned',NULL,'',NULL,3,0,unknown);
 denied:=false;BEGIN PERFORM public.jds_preview_bulletin(member,3);EXCEPTION WHEN raise_exception THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Unknown category accepted';END IF;
 IF has_function_privilege('anon','public.jds_save_bulletin_subject_policy(uuid,integer,text,uuid,text,text,integer,integer,uuid)','EXECUTE') OR has_table_privilege('authenticated','public.jds_bulletin_subjects','UPDATE') THEN RAISE EXCEPTION 'Unsafe permissions'; END IF;
END $test$;
SELECT 'coefficient policy: weights, zero, unknown counts, 2-to-3 boundary, ranking, teacher denial and immutable snapshots passed' AS test_result;
