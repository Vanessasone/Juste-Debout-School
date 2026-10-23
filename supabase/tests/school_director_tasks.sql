-- Run in the School SQL test environment; all synthetic writes roll back.
begin;
select set_config('request.jwt.claim.sub',(select profile_id::text from public.jds_school_responsibilities where enabled and lower(email)='nicolas@juste-debout.com' limit 1),true);
do $$
declare x jsonb; y jsonb; denied boolean:=false;
begin
 if not school_private.finance_allowed() then raise exception 'Nicolas account not ready';end if;
 x:=public.jds_save_director_task(null,null,'TEST transaction','todo','test');
 y:=public.jds_save_director_task((x->>'id')::uuid,1,null,'done','test done');
 if y->>'status'<>'done' or (y->>'revision')::int<>2 then raise exception 'save failed';end if;
 begin perform public.jds_save_director_task((x->>'id')::uuid,1,null,'todo','stale');exception when others then denied:=true;end;
 if not denied then raise exception 'stale write allowed';end if;
 if (select count(*) from school_private.director_task_events where task_id=(x->>'id')::uuid)<>2 then raise exception 'audit failed';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 denied:=false;begin perform public.jds_director_tasks();exception when others then denied:=true;end;
 if not denied then raise exception 'unauthorized read allowed';end if;
 denied:=false;begin perform public.jds_save_director_task(null,null,'forbidden','todo','');exception when others then denied:=true;end;
 if not denied then raise exception 'unauthorized write allowed';end if;
 if has_function_privilege('anon','public.jds_director_tasks()','EXECUTE') or has_table_privilege('authenticated','school_private.director_tasks','SELECT,INSERT,UPDATE,DELETE') then raise exception 'unexpected privileges';end if;
end $$;
rollback;
