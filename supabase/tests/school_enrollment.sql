begin;
-- Synthetic identities and object metadata exist only inside this rolled-back transaction.
do $$declare student uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid();begin
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(student,'school-student-'||student||'@example.invalid',now(),'{"full_name":"School test student"}'),(stranger,'school-other-'||stranger||'@example.invalid',now(),'{"full_name":"School test other"}');
 insert into public.profiles(id,full_name) values(student,'School test student'),(stranger,'School test other') on conflict(id) do nothing;
 perform set_config('jds.test_student',student::text,true);perform set_config('jds.test_stranger',stranger::text,true);
 perform set_config('jds.test_email','school-student-'||student||'@example.invalid',true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','74d99439-9ecb-454d-b7c8-c3d186dd9bf5',true);
do $$declare g jsonb; e jsonb; result jsonb; payload jsonb; a uuid; req uuid:=gen_random_uuid();begin
 g:=public.jds_enrollment_admin_action('group',null,null,'{"campus":"CORE","name":"__Enrollment test__","season":"__test__"}');
 perform set_config('jds.test_group',g->>'id',true);
 e:=public.jds_enrollment_admin_action('student',(g->>'id')::uuid,null,jsonb_build_object('first_name','__Enrollment','last_name','test__','email',current_setting('jds.test_email'),'admission_approved',true));
 perform set_config('jds.test_enrollment',e->>'id',true);perform set_config('jds.test_member',e->>'member_id',true);perform set_config('jds.test_requirement',req::text,true);
 begin perform public.jds_enrollment_admin_action('issue',(e->>'id')::uuid,1,'{"admission_approved":true}');raise exception 'Unconfigured invitation accepted';exception when raise_exception then if sqlerrm not like '%configuration%' then raise;end if;end;
 perform public.jds_enrollment_admin_action('rules',(g->>'id')::uuid,0,jsonb_build_object('training_title','Formation synthétique de test','payment_terms','Modalités de paiement synthétiques pour le test, sans contrat réel.','school_terms','Informations d’inscription synthétiques pour le test, sans dossier réel.','requirements',jsonb_build_array(jsonb_build_object('id',req,'label','Pièce de test synthétique','required',true)),'ready',true));
 begin perform public.jds_enrollment_admin_action('issue',(e->>'id')::uuid,1,'{"admission_approved":true}');raise exception 'Invitation without finance accepted';exception when raise_exception then if sqlerrm not like '%Confirme le tarif%' then raise;end if;end;
 payload:=jsonb_build_object('member_id',e->>'member_id','base_cents',100000,'discount_cents',5000,'school_aid_cents',10000,'terms_confirmed',true,'schedule_confirmed',true,'funding',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'organization','__Confirmed fund__','kind','subsidy','status','confirmed','amount_cents',35000),jsonb_build_object('id',gen_random_uuid(),'organization','__Pending fund__','kind','scholarship','status','pending','amount_cents',10000)),'installments',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'label','Acompte','due_on',(now() at time zone 'Europe/Paris')::date,'amount_cents',40000),jsonb_build_object('id',gen_random_uuid(),'label','Solde','due_on',(now() at time zone 'Europe/Paris')::date+30,'amount_cents',45000)),'receipts','[]'::jsonb,'note','__ADMIN_ONLY_NOTE__');
 a:=public.jds_save_tuition_account(null,null,payload);perform set_config('jds.test_account',a::text,true);
 begin perform public.jds_enrollment_admin_action('issue',(e->>'id')::uuid,1,'{"admission_approved":false}');raise exception 'Admission confirmation bypassed';exception when raise_exception then if sqlerrm not like '%explicitement%' then raise;end if;end;
 result:=public.jds_enrollment_admin_action('issue',(e->>'id')::uuid,1,'{"admission_approved":true}');
 if length(result->>'token')<>64 or exists(select 1 from public.jds_enrollments where id=(e->>'id')::uuid and token_hash=result->>'token') then raise exception 'Token hashing incorrect';end if;
 perform set_config('jds.test_token',result->>'token',true);
 -- Rotation revokes the previous link, while retaining the same admitted student.
 e:=public.jds_enrollment_admin_action('issue',(e->>'id')::uuid,(result->>'revision')::integer,'{"admission_approved":true}');
 perform set_config('jds.test_old_token',current_setting('jds.test_token'),true);perform set_config('jds.test_token',e->>'token',true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('jds.test_stranger'),true);
do $$begin
 begin perform public.jds_enrollment_student_action('claim',null,null,jsonb_build_object('token',current_setting('jds.test_token')));raise exception 'Wrong identity claimed dossier';exception when raise_exception then if sqlerrm not like '%autre adresse%' then raise;end if;end;
 if exists(select 1 from public.jds_enrollments) or exists(select 1 from public.jds_tuition_accounts) then raise exception 'Student can directly read private tables';end if;
 begin perform public.jds_enrollment_workspace();raise exception 'Student loaded workspace';exception when raise_exception then if sqlerrm not like '%quatre directeurs%' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('jds.test_student'),true);
do $$declare e jsonb; path text;begin
 begin perform public.jds_enrollment_student_action('claim',null,null,jsonb_build_object('token',current_setting('jds.test_old_token')));raise exception 'Old invitation accepted';exception when raise_exception then if sqlerrm not like '%Lien invalide%' then raise;end if;end;
 e:=public.jds_enrollment_student_action('claim',null,null,jsonb_build_object('token',current_setting('jds.test_token')));
 if e::text like '%__ADMIN_ONLY_NOTE__%' or e ? 'token_hash' then raise exception 'Private notes or token hash leaked';end if;
 if (e->'finance'->>'agreed_cents')::integer<>85000 or (e->'finance'->>'student_share_cents')::integer<>50000 or (e->'finance'->>'received_cents')::integer<>0 then raise exception 'Grant/subsidy calculation incorrect';end if;
 begin perform public.jds_enrollment_student_action('submit',(e->>'id')::uuid,(e->>'revision')::integer,jsonb_build_object('acknowledged',true,'finance_hash',e->>'finance_hash'));raise exception 'Missing document accepted';exception when raise_exception then if sqlerrm not like '%pièces obligatoires%' then raise;end if;end;
 path:=(e->>'id')||'/'||current_setting('jds.test_requirement')||'/'||gen_random_uuid()||'.pdf';
 if not school_private.enrollment_storage_allowed(path,true) then raise exception 'Own required file cannot upload';end if;
 if school_private.enrollment_storage_allowed(gen_random_uuid()||'/'||current_setting('jds.test_requirement')||'/'||gen_random_uuid()||'.pdf',true) then raise exception 'Can upload into other dossier';end if;
 insert into storage.objects(bucket_id,name,owner,owner_id,metadata) values('school-enrollment',path,auth.uid(),auth.uid()::text,'{"mimetype":"application/pdf","size":16}');
 e:=public.jds_enrollment_student_action('document',(e->>'id')::uuid,(e->>'revision')::integer,jsonb_build_object('requirement_id',current_setting('jds.test_requirement'),'storage_path',path));
 perform set_config('jds.test_document',e->'documents'->0->>'id',true);perform set_config('jds.test_storage_path',path,true);
 begin perform public.jds_enrollment_student_action('submit',(e->>'id')::uuid,(e->>'revision')::integer,jsonb_build_object('acknowledged',true,'finance_hash','stale'));raise exception 'Stale financial terms accepted';exception when raise_exception then if sqlerrm not like '%ont changé%' then raise;end if;end;
 e:=public.jds_enrollment_student_action('submit',(e->>'id')::uuid,(e->>'revision')::integer,jsonb_build_object('acknowledged',true,'finance_hash',e->>'finance_hash','phone','__synthetic__'));
 if e->>'status'<>'submitted' then raise exception 'Student submission failed';end if;
 perform set_config('jds.test_revision',e->>'revision',true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('jds.test_stranger'),true);
do $$begin
 if school_private.enrollment_storage_allowed(current_setting('jds.test_storage_path'),false) then raise exception 'Other student can read file';end if;
 if exists(select 1 from storage.objects where bucket_id='school-enrollment' and name=current_setting('jds.test_storage_path')) then raise exception 'Storage RLS leaks another student file';end if;
 begin perform public.jds_enrollment_student_action('read',current_setting('jds.test_enrollment')::uuid);raise exception 'Other student can read dossier';exception when raise_exception then if sqlerrm not like '%Aucun dossier%' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','74d99439-9ecb-454d-b7c8-c3d186dd9bf5',true);
do $$declare e jsonb; payload jsonb; revision integer;begin
 begin perform public.jds_enrollment_admin_action('review',current_setting('jds.test_enrollment')::uuid,current_setting('jds.test_revision')::integer,'{"status":"validated"}');raise exception 'Unreviewed document accepted';exception when raise_exception then if sqlerrm not like '%pièces obligatoires%' then raise;end if;end;
 e:=public.jds_enrollment_admin_action('document',current_setting('jds.test_enrollment')::uuid,current_setting('jds.test_revision')::integer,jsonb_build_object('document_id',current_setting('jds.test_document'),'status','accepted'));
 e:=public.jds_enrollment_admin_action('review',(e->>'id')::uuid,(e->>'revision')::integer,'{"status":"validated"}');
 if e->>'status'<>'validated' then raise exception 'Director validation failed';end if;
 if exists(select 1 from public.jds_training_members where id=current_setting('jds.test_member')::uuid and profile_id is not null) then raise exception 'Validation silently granted access';end if;
 select to_jsonb(a),a.revision into payload,revision from public.jds_tuition_accounts a where id=current_setting('jds.test_account')::uuid;
 perform public.jds_save_tuition_account(current_setting('jds.test_account')::uuid,revision,payload||'{"note":"__ADMIN_ONLY_NOTE_CHANGED__"}');
 if (select status from public.jds_enrollments where id=(e->>'id')::uuid)<>'validated' then raise exception 'Private note wrongly reopened enrollment';end if;
 select to_jsonb(a),a.revision into payload,revision from public.jds_tuition_accounts a where id=current_setting('jds.test_account')::uuid;
 perform public.jds_save_tuition_account(current_setting('jds.test_account')::uuid,revision,jsonb_set(payload,'{funding,0,amount_cents}','34000'));
 if (select status from public.jds_enrollments where id=(e->>'id')::uuid)<>'changes_requested' then raise exception 'Financial amendment did not require renewed reading';end if;
 if not exists(select 1 from public.jds_enrollment_events where enrollment_id=(e->>'id')::uuid and kind='finance_changed') then raise exception 'Financial amendment audit missing';end if;
end $$;
set local role anon;
do $$begin
 begin perform public.jds_enrollment_student_action();raise exception 'Anon can read dossier';exception when insufficient_privilege then null;end;
 begin perform public.jds_enrollment_workspace();raise exception 'Anon can read workspace';exception when insufficient_privilege then null;end;
end $$;
rollback;
