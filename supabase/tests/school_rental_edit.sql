begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','74d99439-9ecb-454d-b7c8-c3d186dd9bf5',true);
do $$declare key uuid; payload jsonb;begin
 payload:='{"starts_on":"2026-11-01","ends_on":"2026-11-01","starts_at":"10:00","ends_at":"12:00","kind":"closure","label":"__rental_edit_test__","pause_holidays":false}';
 key:=public.jds_edit_core_rental_block(null,null,payload);
 perform public.jds_edit_core_rental_block(key,1,payload||'{"ends_on":"2026-11-15","weekday":null,"label":"__rental_period_test__"}');
 if not exists(select 1 from public.jds_rental_calendar_blocks where id=key and ends_on='2026-11-15' and weekday is null and revision=2) then raise exception 'All-days period edit failed';end if;
 begin perform public.jds_edit_core_rental_block(key,1,payload);raise exception 'Stale rental edit accepted';exception when raise_exception then if sqlerrm not like '%a changé%' then raise;end if;end;
 perform public.jds_edit_core_rental_block(key,2,payload||'{"ends_on":"2027-06-30","weekday":3}');
 if not exists(select 1 from public.jds_rental_calendar_blocks where id=key and weekday=3 and revision=3) then raise exception 'Weekly period edit failed';end if;
 perform public.jds_save_core_rental_block(key,null,null,null,null,null,null,null,null,false);
 if (select active from public.jds_rental_calendar_blocks where id=key) then raise exception 'Removal failed';end if;
 if (select count(*) from public.jds_rental_block_events where block_id=key)<>4 then raise exception 'Rental audit missing';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
 begin perform public.jds_edit_core_rental_block(key,4,payload);raise exception 'Other account can edit rental';exception when raise_exception then if sqlerrm not like '%Accès CORE%' then raise;end if;end;
end $$;
rollback;
