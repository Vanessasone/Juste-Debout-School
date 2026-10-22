-- CORE only. Calendar preparation; online checkout remains disabled until a dedicated Stripe account is connected.
create table public.jds_rental_calendar_settings(
 campus text primary key check(campus='CORE'),opening_time time not null default '10:00',closing_time time not null default '22:00',
 verified_until date,review_note text not null default '',updated_at timestamptz not null default now(),check(closing_time>opening_time)
);
insert into public.jds_rental_calendar_settings(campus) values('CORE');
create table public.jds_rental_calendar_rooms(
 studio_id uuid primary key references public.jds_studios(id),rate_id uuid not null unique references public.jds_rental_rates(id)
);
create table public.jds_rental_calendar_holidays(
 id uuid primary key default gen_random_uuid(),starts_on date not null,ends_on date not null,label text not null,confirmed boolean not null default false,
 check(ends_on>=starts_on),check(length(trim(label)) between 1 and 200)
);
create table public.jds_rental_calendar_blocks(
 id uuid primary key default gen_random_uuid(),studio_id uuid references public.jds_studios(id),
 starts_on date not null,ends_on date not null,weekday integer check(weekday between 1 and 7),
 starts_at time not null,ends_at time not null,kind text not null check(kind in ('class','annual','event','closure')),
 label text not null check(length(trim(label)) between 1 and 200),pause_holidays boolean not null default false,
 active boolean not null default true,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),
 check(ends_on>=starts_on),check(ends_at>starts_at)
);
create index rental_calendar_blocks_studio on public.jds_rental_calendar_blocks(studio_id,starts_on,ends_on);
create index rental_calendar_blocks_actor on public.jds_rental_calendar_blocks(created_by);
-- Seed the three rooms and the user-confirmed historical grid by CORE school lookup, never by another school's generated ID.
do $$declare school uuid;studio uuid;rate uuid;i integer;areas integer[]:=array[132,75,50];dayprices integer[]:=array[4000,3500,3000];eveprices integer[]:=array[7000,5000,4500];begin
 select id into strict school from public.jds_schools where code='CORE';
 for i in 1..3 loop
 select id into studio from public.jds_studios where school_id=school and name='Salle '||i limit 1;
 if studio is null then insert into public.jds_studios(school_id,name,area_m2,sort_order) values(school,'Salle '||i,areas[i],i) returning id into studio;end if;
 select id into rate from public.jds_rental_rates where school_id=school and label='Salle '||i and combo is null limit 1;
 if rate is null then rate:=gen_random_uuid();insert into public.jds_rental_rates(id,school_id,label,area_m2,sort_order) values(rate,school,'Salle '||i,areas[i],i);end if;
 insert into public.jds_rental_calendar_rooms(studio_id,rate_id) values(studio,rate);
 insert into public.jds_rental_prices(rate_id,slot_label,slot_order,price_cents) values(rate,'Journée sem. (10h-19h)',1,dayprices[i]),(rate,'Soir sem. (19h-22h)',2,eveprices[i]),(rate,'Week-end (avant 19h)',3,dayprices[i]) on conflict(rate_id,slot_label) do update set price_cents=excluded.price_cents,slot_order=excluded.slot_order;
 end loop;
end $$;
insert into public.jds_rental_calendar_holidays(starts_on,ends_on,label) values
 ('2026-10-24','2026-11-01','Toussaint · calendrier prévisionnel CORE'),('2026-12-19','2027-01-03','Noël · calendrier prévisionnel CORE'),('2027-02-27','2027-03-14','Hiver · calendrier prévisionnel CORE'),('2027-04-10','2027-04-25','Printemps · calendrier prévisionnel CORE');
-- Private room identifiers for training lessons permit reliable room-specific collision checks.
alter table public.jds_training_lessons add column rental_studio_id uuid references public.jds_studios(id);
create index training_lesson_rental_studio on public.jds_training_lessons(rental_studio_id);
-- Only managers edit the preparation tables; public clients use the sanitized availability function.
alter table public.jds_rental_calendar_settings enable row level security;
alter table public.jds_rental_calendar_rooms enable row level security;
alter table public.jds_rental_calendar_holidays enable row level security;
alter table public.jds_rental_calendar_blocks enable row level security;
revoke all on public.jds_rental_calendar_settings,public.jds_rental_calendar_rooms,public.jds_rental_calendar_holidays,public.jds_rental_calendar_blocks from public,anon,authenticated;
grant select on public.jds_rental_calendar_settings,public.jds_rental_calendar_rooms,public.jds_rental_calendar_holidays,public.jds_rental_calendar_blocks to authenticated;
create policy rental_settings_manager on public.jds_rental_calendar_settings for select to authenticated using(public.jds_can_manage_school('CORE'));
create policy rental_rooms_manager on public.jds_rental_calendar_rooms for select to authenticated using(public.jds_can_manage_school('CORE'));
create policy rental_holidays_manager on public.jds_rental_calendar_holidays for select to authenticated using(public.jds_can_manage_school('CORE'));
create policy rental_blocks_manager on public.jds_rental_calendar_blocks for select to authenticated using(public.jds_can_manage_school('CORE'));
create function public.jds_save_core_rental_block(block_key uuid,room_key uuid,first_date date,last_date date,iso_weekday integer,start_time time,end_time time,block_kind text,description text,pause_on_holidays boolean)
returns uuid language plpgsql security definer set search_path='' as $$declare result uuid;begin
 if auth.uid() is null or not public.jds_can_manage_school('CORE') then raise exception 'Accès CORE requis.';end if;
 if room_key is not null and not exists(select 1 from public.jds_rental_calendar_rooms where studio_id=room_key) then raise exception 'Salle CORE inconnue.';end if;
 if first_date is null or last_date is null or start_time is null or end_time is null or description is null or block_kind is null then raise exception 'Dates, horaires et motif requis.';end if;
 if block_key is null then insert into public.jds_rental_calendar_blocks(studio_id,starts_on,ends_on,weekday,starts_at,ends_at,kind,label,pause_holidays,created_by) values(room_key,first_date,last_date,iso_weekday,start_time,end_time,block_kind,trim(description),coalesce(pause_on_holidays,false),auth.uid()) returning id into result;
 else update public.jds_rental_calendar_blocks set active=false where id=block_key returning id into result;if result is null then raise exception 'Blocage introuvable.';end if;end if;
 return result;
end $$;
create function public.jds_set_core_rental_holiday(holiday_key uuid,is_confirmed boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not public.jds_can_manage_school('CORE') then raise exception 'Accès CORE requis.';end if;
 update public.jds_rental_calendar_holidays set confirmed=coalesce(is_confirmed,false) where id=holiday_key;if not found then raise exception 'Période introuvable.';end if;
end $$;
create function public.jds_set_core_rental_calendar(start_time time,end_time time,checked_until date,note text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not public.jds_can_manage_school('CORE') then raise exception 'Accès CORE requis.';end if;
 if start_time is null or end_time is null or end_time<=start_time then raise exception 'Horaires invalides.';end if;
 if checked_until is not null and length(trim(coalesce(note,'')))<10 then raise exception 'Précise les cours et réservations annuelles vérifiés.';end if;
 update public.jds_rental_calendar_settings set opening_time=start_time,closing_time=end_time,verified_until=checked_until,review_note=left(coalesce(note,''),2000),updated_at=now() where campus='CORE';
end $$;
create function public.jds_core_rental_day(target_date date)
returns table(studio_id uuid,room_name text,starts_at timestamptz,ends_at timestamptz,available boolean,calendar_verified boolean,hour_price_cents integer,status_label text)
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Connexion requise.';end if;
 if target_date is null or target_date< (now() at time zone 'Europe/Paris')::date or target_date>(now() at time zone 'Europe/Paris')::date+365 then raise exception 'Choisis une date dans les 12 prochains mois.';end if;
 return query with slots as (
 select r.studio_id,s.name,r.rate_id,c.verified_until,
 ((target_date+c.opening_time) at time zone 'Europe/Paris')+i*interval '30 minutes' slot_start,
 ((target_date+c.opening_time) at time zone 'Europe/Paris')+(i+2)*interval '30 minutes' slot_end
 from public.jds_rental_calendar_rooms r join public.jds_studios s on s.id=r.studio_id cross join public.jds_rental_calendar_settings c
 cross join lateral generate_series(0,(extract(epoch from (c.closing_time-c.opening_time))/1800)::integer-2) i
 ),checked as (
 select x.*,
 exists(select 1 from public.jds_rental_calendar_blocks b where b.active and (b.studio_id is null or b.studio_id=x.studio_id) and target_date between b.starts_on and b.ends_on and (b.weekday is null or b.weekday=extract(isodow from target_date))
 and not (b.pause_holidays and exists(select 1 from public.jds_rental_calendar_holidays h where h.confirmed and target_date between h.starts_on and h.ends_on))
 and tstzrange((target_date+b.starts_at) at time zone 'Europe/Paris',(target_date+b.ends_at) at time zone 'Europe/Paris','[)') && tstzrange(x.slot_start,x.slot_end,'[)'))
 or exists(select 1 from public.jds_sessions l join public.jds_schools sc on sc.id=l.school_id where sc.code='CORE' and l.status not in ('cancelled','canceled') and (l.studio_id is null or l.studio_id=x.studio_id) and tstzrange(l.starts_at,l.starts_at+l.duration_min*interval '1 minute','[)') && tstzrange(x.slot_start,x.slot_end,'[)'))
 or exists(select 1 from public.jds_training_lessons l join public.jds_training_groups g on g.id=l.group_id where g.campus='CORE' and l.status<>'cancelled' and (l.rental_studio_id is null or l.rental_studio_id=x.studio_id) and tstzrange(l.starts_at,l.ends_at,'[)') && tstzrange(x.slot_start,x.slot_end,'[)')) as occupied,
 case when extract(isodow from target_date)>=6 then case when (x.slot_end at time zone 'Europe/Paris')::time<='19:00' then 3 end
 when (x.slot_start at time zone 'Europe/Paris')::time>='10:00' and (x.slot_end at time zone 'Europe/Paris')::time<='19:00' then 1
 when (x.slot_start at time zone 'Europe/Paris')::time>='19:00' and (x.slot_end at time zone 'Europe/Paris')::time<='22:00' then 2 end price_slot
 from slots x
 )
 select x.studio_id,x.name,x.slot_start,x.slot_end,
 (not x.occupied and coalesce(target_date<=x.verified_until,false) and x.slot_start>now()),coalesce(target_date<=x.verified_until,false),p.price_cents,
 case when x.occupied then 'Occupé' when x.slot_start<=now() then 'Créneau passé' when not coalesce(target_date<=x.verified_until,false) then 'Planning à vérifier' when p.price_cents is null then 'Disponible · tarif sur devis' else 'Disponible · paiement non activé' end
 from checked x left join public.jds_rental_prices p on p.rate_id=x.rate_id and p.slot_order=x.price_slot order by x.name,x.slot_start;
end $$;
revoke all on function public.jds_save_core_rental_block(uuid,uuid,date,date,integer,time,time,text,text,boolean),public.jds_set_core_rental_holiday(uuid,boolean),public.jds_set_core_rental_calendar(time,time,date,text),public.jds_core_rental_day(date) from public,anon;
grant execute on function public.jds_save_core_rental_block(uuid,uuid,date,date,integer,time,time,text,text,boolean),public.jds_set_core_rental_holiday(uuid,boolean),public.jds_set_core_rental_calendar(time,time,date,text),public.jds_core_rental_day(date) to authenticated;
