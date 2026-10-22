-- Four directors share both campuses. All synthetic users and changes roll back.
BEGIN;
DO $test$
DECLARE admin_id uuid; student_id uuid:=gen_random_uuid(); account_id uuid; verified timestamptz; r record; denied boolean; first_role uuid;
BEGIN
 SELECT p.id INTO STRICT admin_id FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE lower(u.email)='vanysone@gmail.com' AND 'admin'=ANY(p.roles);
 INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES(student_id,'activation-student@example.invalid',now(),'{}');
 SELECT id INTO first_role FROM public.jds_school_responsibilities WHERE email='bruceykanji1@gmail.com';
 PERFORM set_config('request.jwt.claim.sub',student_id::text,true);
 IF EXISTS(SELECT 1 FROM public.jds_responsibility_accounts()) THEN RAISE EXCEPTION 'Team account metadata leaked'; END IF;
 denied:=false;BEGIN PERFORM public.jds_activate_school_responsibility(first_role);EXCEPTION WHEN raise_exception THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Student activated staff';END IF;
 FOR r IN SELECT * FROM public.jds_school_responsibilities WHERE email IN('nicolas@juste-debout.com','bruceykanji1@gmail.com','loic@juste-debout.com','rabah@juste-debout.com') LOOP
 IF r.campus IS NOT NULL THEN RAISE EXCEPTION 'Director campus must cover both schools';END IF;
 account_id:=NULL;verified:=NULL;
 SELECT id,email_confirmed_at INTO account_id,verified FROM auth.users WHERE lower(email)=r.email;
 PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
 IF account_id IS NULL THEN
 account_id:=gen_random_uuid();
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(account_id,r.email,'{}');
 denied:=false;BEGIN PERFORM public.jds_activate_school_responsibility(r.id);EXCEPTION WHEN raise_exception THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Unconfirmed director activated';END IF;
 UPDATE auth.users SET email_confirmed_at=now() WHERE id=account_id;
 ELSIF verified IS NULL THEN
 denied:=false;BEGIN PERFORM public.jds_activate_school_responsibility(r.id);EXCEPTION WHEN raise_exception THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Unconfirmed existing account activated';END IF;
 CONTINUE;
 END IF;
 PERFORM public.jds_activate_school_responsibility(r.id);
 PERFORM public.jds_activate_school_responsibility(r.id);
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=account_id AND 'admin'=ANY(roles) AND cardinality(array_positions(roles,'admin'))=1) THEN RAISE EXCEPTION 'Director admin missing or duplicated';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.jds_school_responsibilities WHERE id=r.id AND profile_id=account_id AND enabled AND activated_at IS NOT NULL) THEN RAISE EXCEPTION 'Activation audit missing';END IF;
 PERFORM set_config('request.jwt.claim.sub',account_id::text,true);
 IF NOT public.is_admin() OR NOT public.jds_can_manage_school('CORE') OR NOT public.jds_can_manage_school('INDUSTRY') OR NOT school_private.bulletin_can_publish('CORE') OR NOT school_private.bulletin_can_publish('INDUSTRY') OR NOT school_private.can_review_access('CORE','team') OR NOT school_private.can_review_access('INDUSTRY','teacher') THEN RAISE EXCEPTION 'Full director rights failed';END IF;
 END LOOP;
 IF has_function_privilege('anon','public.jds_activate_school_responsibility(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous activation grant';END IF;
END $test$;
ROLLBACK;
