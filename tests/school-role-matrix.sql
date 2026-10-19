begin;
select set_config('request.jwt.claims','{"sub":"1246246a-5035-4562-a70a-7f8d5f59236f","role":"authenticated"}',true);
insert into public.jds_private_directory(id,external_key,campus,person_type,first_name,last_name,review_status) values ('792ab134-7225-4483-8933-000000000001','QA-ROLE-CORE','CORE','student','QA','Rollback','verified'),('792ab134-7225-4483-8933-000000000002','QA-ROLE-OTHER','CORE','student','QA','Other','verified');
insert into public.jds_training_members(id,group_id,person_id,profile_id) values ('792ab134-7225-4483-8933-000000000003','dc2b714b-5799-473b-964a-04aa002e0ffa','792ab134-7225-4483-8933-000000000001','1246246a-5035-4562-a70a-7f8d5f59236f'),('792ab134-7225-4483-8933-000000000004','dc2b714b-5799-473b-964a-04aa002e0ffa','792ab134-7225-4483-8933-000000000002',null);
insert into public.jds_training_lessons(id,group_id,title,starts_at,ends_at,status) values ('792ab134-7225-4483-8933-000000000005','dc2b714b-5799-473b-964a-04aa002e0ffa','QA test','2030-01-07T09:00Z','2030-01-07T10:00Z','published');
insert into public.jds_training_attendance(id,lesson_id,member_id,status) values ('792ab134-7225-4483-8933-000000000007','792ab134-7225-4483-8933-000000000005','792ab134-7225-4483-8933-000000000003','present'),('792ab134-7225-4483-8933-000000000008','792ab134-7225-4483-8933-000000000005','792ab134-7225-4483-8933-000000000004','absent');
insert into public.jds_training_posts(id,group_id,title,kind,status) values ('792ab134-7225-4483-8933-000000000009','dc2b714b-5799-473b-964a-04aa002e0ffa','QA published','announcement','published'),('792ab134-7225-4483-8933-000000000010','dc2b714b-5799-473b-964a-04aa002e0ffa','QA draft','announcement','draft'),('792ab134-7225-4483-8933-000000000011','d66ccee2-8b85-464d-9b58-d5fd26e5408e','QA draft','announcement','draft');
update public.profiles set roles=array['student'] where id='1246246a-5035-4562-a70a-7f8d5f59236f';
set local role authenticated;
do $$declare n int;begin
if not ((select count(*) from public.jds_training_groups)=1) then raise exception 'student own group';end if;
if not ((select count(*) from public.jds_training_posts where id in ('792ab134-7225-4483-8933-000000000009','792ab134-7225-4483-8933-000000000010','792ab134-7225-4483-8933-000000000011'))=1) then raise exception 'student published only';end if;
if not ((select count(*) from public.jds_training_attendance where id in ('792ab134-7225-4483-8933-000000000007','792ab134-7225-4483-8933-000000000008'))=1) then raise exception 'student own attendance';end if;
if not (not exists(select 1 from public.jds_private_directory)) then raise exception 'student no directory';end if;
update public.jds_training_attendance set status='late' where id='792ab134-7225-4483-8933-000000000007';get diagnostics n=row_count;if n<>0 then raise exception 'student write';end if;
begin update public.profiles set roles=array['admin'] where id=auth.uid();raise exception 'self promotion';exception when insufficient_privilege then null;end;
end$$;reset role;
update public.profiles set roles=array['admin'] where id='1246246a-5035-4562-a70a-7f8d5f59236f';
update public.jds_training_members set profile_id=null where id='792ab134-7225-4483-8933-000000000003';
update public.profiles set roles=array['teacher'] where id='1246246a-5035-4562-a70a-7f8d5f59236f';
set local role authenticated;
do $$declare n int;begin
if not (not public.is_admin()) then raise exception 'teacher not admin';end if;
if not (not exists(select 1 from public.jds_training_groups)) then raise exception 'teacher no groups';end if;
if not (not exists(select 1 from public.jds_private_directory)) then raise exception 'teacher no directory';end if;
end$$;reset role;
insert into public.jds_school_responsibilities(id,display_name,email,title,campus,profile_id,enabled) values('792ab134-7225-4483-8933-000000000012','QA rollback','qa-role@example.invalid','QA','CORE','1246246a-5035-4562-a70a-7f8d5f59236f',true);
update public.jds_school_responsibilities set campus='CORE' where id='792ab134-7225-4483-8933-000000000012';
set local role authenticated;
do $$declare n int;begin
if not ((select count(*) from public.jds_training_groups)=3 and not exists(select 1 from public.jds_training_groups where campus<>'CORE')) then raise exception 'CORE groups';end if;
if not (exists(select 1 from public.jds_training_posts where id='792ab134-7225-4483-8933-000000000010') and not exists(select 1 from public.jds_training_posts where id='792ab134-7225-4483-8933-000000000011')) then raise exception 'CORE drafts';end if;
if not (not exists(select 1 from public.jds_private_directory where campus<>'CORE')) then raise exception 'CORE directory';end if;
update public.jds_training_posts set body='QA tested' where id='792ab134-7225-4483-8933-000000000010';get diagnostics n=row_count;if n<>1 then raise exception 'own write denied';end if;
update public.jds_training_posts set body='QA forbidden' where id='792ab134-7225-4483-8933-000000000011';get diagnostics n=row_count;if n<>0 then raise exception 'foreign write';end if;
update public.jds_school_responsibilities set enabled=false where id='792ab134-7225-4483-8933-000000000012';get diagnostics n=row_count;if n<>0 then raise exception 'staff responsibility update';end if;
end$$;reset role;
update public.jds_school_responsibilities set campus='INDUSTRY' where id='792ab134-7225-4483-8933-000000000012';
set local role authenticated;
do $$declare n int;begin
if not ((select count(*) from public.jds_training_groups)=3 and not exists(select 1 from public.jds_training_groups where campus<>'INDUSTRY')) then raise exception 'INDUSTRY groups';end if;
if not (exists(select 1 from public.jds_training_posts where id='792ab134-7225-4483-8933-000000000011') and not exists(select 1 from public.jds_training_posts where id='792ab134-7225-4483-8933-000000000010')) then raise exception 'INDUSTRY drafts';end if;
if not (not exists(select 1 from public.jds_private_directory where campus<>'INDUSTRY')) then raise exception 'INDUSTRY directory';end if;
update public.jds_training_posts set body='QA tested' where id='792ab134-7225-4483-8933-000000000011';get diagnostics n=row_count;if n<>1 then raise exception 'own write denied';end if;
update public.jds_training_posts set body='QA forbidden' where id='792ab134-7225-4483-8933-000000000010';get diagnostics n=row_count;if n<>0 then raise exception 'foreign write';end if;
update public.jds_school_responsibilities set enabled=false where id='792ab134-7225-4483-8933-000000000012';get diagnostics n=row_count;if n<>0 then raise exception 'staff responsibility update';end if;
end$$;reset role;
update public.jds_school_responsibilities set campus=null where id='792ab134-7225-4483-8933-000000000012';
set local role authenticated;
do $$declare n int;begin
if not ((select count(*) from public.jds_training_groups)=6) then raise exception 'global groups';end if;
end$$;reset role;
update public.jds_school_responsibilities set enabled=false where id='792ab134-7225-4483-8933-000000000012';
set local role authenticated;
do $$declare n int;begin
if not (not exists(select 1 from public.jds_training_groups)) then raise exception 'disabled manager';end if;
end$$;reset role;
update public.profiles set roles=array['admin'] where id='1246246a-5035-4562-a70a-7f8d5f59236f';
set local role authenticated;
do $$declare n int;begin
if not (public.is_admin() and (select count(*) from public.jds_training_groups)=6) then raise exception 'admin groups';end if;
end$$;reset role;
rollback;select 'PASS: student, teacher, CORE, INDUSTRY, global, disabled manager, admin; rolled back' as result;