begin;
create temporary table activation_test_ids(k text,v uuid);
do $$
declare admin_id uuid; g uuid:=gen_random_uuid(); person uuid; learner uuid; pending_learner uuid; i integer; payload jsonb; expected text; email text;
begin
 select id into admin_id from public.profiles where 'admin'=any(roles) and exists(select 1 from auth.users u where u.id=profiles.id and u.email_confirmed_at is not null) limit 1;
 if admin_id is null then raise exception 'Admin fixture unavailable';end if;
 insert into public.jds_training_groups(id,campus,name,season) values(g,'CORE','__ACTIVATION_TEST__','__test__');
 for i in 1..5 loop
  person:=gen_random_uuid();learner:=gen_random_uuid();email:=case when i=1 then '' else learner::text||'@example.invalid' end;
  insert into public.jds_private_directory(id,external_key,campus,person_type,first_name,last_name,email) values(person,person::text,'CORE','student','Synthetic activation',i::text,email);
  insert into public.jds_training_members(group_id,person_id) values(g,person);
  if i>=3 then insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(learner,email,case when i>=4 then now() else null end,'{}');end if;
  if i=5 then insert into public.jds_access_requests(profile_id,kind,campus,status,group_id) values(learner,'student','CORE','pending',g);pending_learner:=learner;end if;
 end loop;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 payload:=public.jds_student_activation_workspace();
 for i in 1..5 loop
  expected:=case i when 1 then 'missing_email' when 2 then 'no_account' when 3 then 'unconfirmed' when 4 then 'request_needed' when 5 then 'pending' end;
  if not exists(select 1 from jsonb_array_elements(payload->'students') s where s->>'group_id'=g::text and s->>'name'='Synthetic activation '||i and s->>'status'=expected) then raise exception 'Incorrect activation status %',i;end if;
 end loop;
 insert into activation_test_ids values('admin',admin_id),('group',g),('student',pending_learner);
end $$;
grant select on activation_test_ids to authenticated;
select set_config('request.jwt.claim.sub',(select v::text from activation_test_ids where k='admin'),true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from jsonb_array_elements(public.jds_student_activation_workspace()->'students') s where s->>'group_id'=(select v::text from activation_test_ids where k='group')) then raise exception 'Authenticated administrator cannot read';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select v::text from activation_test_ids where k='student'),true);
set local role authenticated;
do $$declare denied boolean:=false;begin
 begin perform public.jds_student_activation_workspace();exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Student can read activation roster';end if;
end $$;
reset role;
set local role anon;
do $$begin
 begin perform public.jds_student_activation_workspace();raise exception 'Anon can execute activation RPC';exception when insufficient_privilege then null;end;
end $$;
rollback;
