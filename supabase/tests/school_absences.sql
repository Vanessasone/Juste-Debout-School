begin;
create temp table absence_test_ids(k text,v uuid);
do $$
declare student uuid:=gen_random_uuid();peer uuid:=gen_random_uuid();person uuid:=gen_random_uuid();grp uuid;member uuid;admin_id uuid;req uuid;absence uuid;path text;denied boolean;
begin
 select id into admin_id from public.profiles where 'admin'=any(roles) limit 1;
 select id into grp from public.jds_training_groups where campus='INDUSTRY' and name='P1' limit 1;
 insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values(student,'absence-student@example.invalid','{}',now()),(peer,'absence-peer@example.invalid','{}',now());
 insert into public.jds_private_directory(id,external_key,campus,person_type,first_name,last_name) values(person,person::text,'INDUSTRY','student','Test','Absence');
 insert into public.jds_training_members(group_id,person_id) values(grp,person) returning id into member;
 perform set_config('request.jwt.claim.sub',student::text,true);
 req:=public.jds_submit_student_request('formation','INDUSTRY',grp,'');
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform public.jds_review_student_request(req,'approved',person,'Test absence');
 perform set_config('request.jwt.claim.sub',student::text,true);
 denied:=false;begin perform public.jds_submit_absence(member,'2026-11-02','2026-11-02',null,'proof.pdf');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Missing proof accepted';end if;
 path:=student::text||'/'||member::text||'/'||gen_random_uuid()::text||'.pdf';
 denied:=false;begin perform public.jds_submit_absence(member,'2026-11-02','2026-11-02',path,'proof.pdf');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Nonexistent proof accepted';end if;
 -- Transaction-local metadata fixtures only: no real document is uploaded.
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('school-absence-proofs',path,student::text,'{"mimetype":"application/pdf","size":100}');
 absence:=public.jds_submit_absence(member,'2026-11-02','2026-11-03',path,'proof.pdf');
 denied:=false;begin perform public.jds_review_absence(absence,'approved','');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Student reviewed own absence';end if;
 denied:=false;begin perform public.jds_submit_absence(member,'2026-11-02','2026-11-03',path,'proof.pdf');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Duplicate absence accepted';end if;
 perform set_config('request.jwt.claim.sub',peer::text,true);
 denied:=false;begin perform public.jds_submit_absence(member,'2026-11-04','2026-11-04',path,'proof.pdf');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Peer submitted for pupil';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 denied:=false;begin perform public.jds_review_absence(absence,'rejected','');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Unexplained rejection accepted';end if;
 perform public.jds_review_absence(absence,'approved','Document vérifié');
 perform public.jds_review_absence(absence,'approved','Document vérifié');
 if (select status from public.jds_absence_requests where id=absence)<>'approved' then raise exception 'Review missing';end if;
 if exists(select 1 from public.jds_training_attendance where member_id=member) then raise exception 'Declaration changed actual attendance';end if;
 if has_table_privilege('authenticated','public.jds_absence_requests','INSERT') or has_table_privilege('authenticated','public.jds_absence_requests','UPDATE') or has_function_privilege('anon','public.jds_submit_absence(uuid,date,date,text,text)','EXECUTE') then raise exception 'Unsafe grants';end if;
 insert into absence_test_ids values('student',student),('peer',peer),('absence',absence),('admin',admin_id);
end $$;
grant select on absence_test_ids to authenticated;
select set_config('request.jwt.claim.sub',(select v::text from absence_test_ids where k='student'),true);
set local role authenticated;
do $$begin
 if (select count(*) from public.jds_absence_requests)<>1 then raise exception 'Own absence not readable';end if;
 if (select count(*) from storage.objects where bucket_id='school-absence-proofs')<>1 then raise exception 'Own proof not readable';end if;
 begin delete from storage.objects where bucket_id='school-absence-proofs';exception when insufficient_privilege then null;end;
 if (select count(*) from storage.objects where bucket_id='school-absence-proofs')<>1 then raise exception 'Submitted proof deleted';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select v::text from absence_test_ids where k='peer'),true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.jds_absence_requests) or exists(select 1 from storage.objects where bucket_id='school-absence-proofs') then raise exception 'Peer saw private absence/proof';end if;
end $$;
reset role;
rollback;
