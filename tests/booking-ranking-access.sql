begin;
select set_config('request.jwt.claims','{"sub":"1246246a-5035-4562-a70a-7f8d5f59236f","role":"authenticated"}',true);
insert into public.jds_card_types(id,name,credits,price_cents) values('11111111-1111-4111-8111-111111111101','QA rollback',2,0);
insert into public.jds_user_cards(id,profile_id,card_type_id,credits_total,credits_left,status,expires_at)
values('11111111-1111-4111-8111-111111111102','1246246a-5035-4562-a70a-7f8d5f59236f','11111111-1111-4111-8111-111111111101',2,2,'active',now()+interval '365 days');
insert into public.jds_sessions(id,school_id,style,starts_at,capacity)
select '11111111-1111-4111-8111-111111111103',id,'QA rollback',now()+interval '30 days',1 from public.jds_schools where code='CORE';
insert into public.jds_sessions(id,school_id,style,starts_at,capacity)
select '11111111-1111-4111-8111-111111111104',id,'QA rollback',now()+interval '30 days',0 from public.jds_schools where code='CORE';
set local role authenticated;
do $$begin
 if public.jds_book_session('11111111-1111-4111-8111-111111111103','11111111-1111-4111-8111-111111111102')<>'booked' then raise exception 'booking failed'; end if;
 if public.jds_book_session('11111111-1111-4111-8111-111111111103','11111111-1111-4111-8111-111111111102')<>'booked' then raise exception 'repeat failed'; end if;
 if public.jds_book_session('11111111-1111-4111-8111-111111111104','11111111-1111-4111-8111-111111111102')<>'waitlist' then raise exception 'waitlist failed'; end if;
 if (select credits_left from public.jds_user_cards where id='11111111-1111-4111-8111-111111111102')<>1 then raise exception 'incorrect debit'; end if;
 if has_table_privilege('authenticated','public.jds_bookings','UPDATE') then raise exception 'direct mutation allowed'; end if;
end $$;
reset role;
insert into public.ranking_subjects(id,population,name,school_id,active)
select '11111111-1111-4111-8111-111111111105','formation_student','QA rollback CORE',id,true from public.jds_schools where code='CORE';
insert into public.ranking_subjects(id,population,name,school_id,active)
select '11111111-1111-4111-8111-111111111106','formation_student','QA rollback INDUSTRY',id,true from public.jds_schools where code='INDUSTRY';
update public.profiles set roles=array['student'] where id='1246246a-5035-4562-a70a-7f8d5f59236f';
insert into public.jds_school_responsibilities(display_name,email,title,campus,profile_id,enabled)
values('QA rollback','qa-rollback@example.invalid','QA','CORE','1246246a-5035-4562-a70a-7f8d5f59236f',true);
set local role authenticated;
do $$begin
 if (select count(*) from public.ranking_subjects where id='11111111-1111-4111-8111-111111111105')<>1 then raise exception 'CORE hidden'; end if;
 if exists(select 1 from public.ranking_subjects where id='11111111-1111-4111-8111-111111111106') then raise exception 'INDUSTRY exposed'; end if;
 perform public.ranking_add('11111111-1111-4111-8111-111111111105','bonus',1);
 begin
  perform public.ranking_add('11111111-1111-4111-8111-111111111106','bonus',1);
  raise exception 'cross-campus write allowed';
 exception when raise_exception then
  if sqlerrm <> 'réservé au staff du campus' then raise; end if;
 end;
end $$;
reset role;
rollback;
select 'PASS: repeated booking, waitlist, debit, direct update, CORE read/write, INDUSTRY deny; rolled back' as result;