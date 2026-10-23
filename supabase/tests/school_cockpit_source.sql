begin;
select set_config('request.jwt.claim.sub','74d99439-9ecb-454d-b7c8-c3d186dd9bf5',true);
do $$declare result jsonb;actual bigint;begin
 result:=public.jds_school_cockpit(null,null,1,null);
 if result->>'name' is null or result->>'central'<>'true' then raise exception 'Director cockpit unavailable';end if;
 select count(*) into actual from public.jds_access_requests where status='pending';
 if(select coalesce(sum((x->>'count')::int),0) from jsonb_array_elements(result->'actions')x where x->>'key'='access')<>actual then raise exception 'Pending requests count mismatch';end if;
 if result::text like '%proof_path%' or result::text like '%cc_scores%' or result::text like '%appreciation%' or result::text like '%snapshot%' then raise exception 'Cockpit returned sensitive detail';end if;
 result:=public.jds_school_cockpit('CORE',null,1,null);
 if exists(select 1 from jsonb_array_elements(result->'actions')x where x->>'campus'='INDUSTRY') then raise exception 'Campus filter failed';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $$begin
 begin perform public.jds_school_cockpit(null,null,1,null);raise exception 'Unauthorized cockpit allowed';
 exception when raise_exception then if sqlerrm<>'Accès administration School requis.' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 begin perform public.jds_school_cockpit(null,null,1,null);raise exception 'Signed-out cockpit allowed';
 exception when raise_exception then if sqlerrm<>'Connexion School requise.' then raise;end if;end;
end $$;
rollback;
