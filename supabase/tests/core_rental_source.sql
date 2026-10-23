begin;
update public.jds_rental_source_imports set active=true where campus='CORE' and month='2026-11-01';
select set_config('request.jwt.claim.sub','74d99439-9ecb-454d-b7c8-c3d186dd9bf5',true);
do $$declare room uuid;begin
 if(select count(*) from public.jds_rental_source_windows)<>363 then raise exception 'Incomplete source import';end if;
 if(select sum(extract(epoch from(ends_at-starts_at))/1800) from public.jds_rental_source_windows where available)<>482 then raise exception 'Source half-hour mismatch';end if;
 select s.id into strict room from public.jds_studios s join public.jds_schools sc on sc.id=s.school_id where sc.code='CORE' and s.name='Salle 1';
 if exists(select 1 from public.jds_core_rental_day('2026-11-01') where studio_id=room and (starts_at at time zone 'Europe/Paris')::time='12:00' and available) then raise exception 'Merged booking not blocked';end if;
 perform public.jds_save_core_rental_block(null,room,'2026-11-01','2026-11-01',null,'10:00','11:00','event','Source collision test (rollback)',false);
 if exists(select 1 from public.jds_core_rental_day('2026-11-01') where studio_id=room and (starts_at at time zone 'Europe/Paris')::time='10:00' and available) then raise exception 'New block did not override source';end if;
 if not exists(select 1 from public.jds_core_rental_day('2026-11-01') where studio_id=room and (starts_at at time zone 'Europe/Paris')::time='11:00' and available) then raise exception 'Adjacent free hour blocked';end if;
 if exists(select 1 from public.jds_core_rental_public_day('2026-12-01') where available or calendar_verified) then raise exception 'Unimported December opened';end if;
 if has_table_privilege('anon','public.jds_rental_source_windows','SELECT') or has_function_privilege('anon','public.jds_school_cockpit(text,uuid,integer,date)','EXECUTE') then raise exception 'Raw source exposed';end if;
end $$;
set local role anon;
select count(*) as public_slots from public.jds_core_rental_public_day('2026-11-01');
rollback;
