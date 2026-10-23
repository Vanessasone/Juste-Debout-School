-- The source contains availability decisions only. No renter identity or amount is imported.
create table public.jds_rental_source_imports (
 id uuid primary key default gen_random_uuid(), campus text not null check(campus='CORE'),
 month date not null check(extract(day from month)=1), source_sha256 text not null check(length(source_sha256)=64),
 source_sheet text not null, active boolean not null default false, imported_at timestamptz not null default now(),
 unique(campus,month,source_sha256)
);
create unique index rental_source_one_active_month on public.jds_rental_source_imports(campus,month) where active;
create table public.jds_rental_source_windows (
 id bigint generated always as identity primary key, import_id uuid not null references public.jds_rental_source_imports(id),
 studio_id uuid not null references public.jds_studios(id), source_date date not null,
 starts_at timestamptz not null, ends_at timestamptz not null, available boolean not null,
 colour text not null check(colour in ('blue','yellow','green','blocked')), first_cells text not null,last_cells text not null,
 check(ends_at>starts_at), check(not available or colour<>'blocked'),
 unique(import_id,studio_id,source_date,starts_at)
);
create index rental_source_day on public.jds_rental_source_windows(import_id,source_date,studio_id);
alter table public.jds_rental_source_imports enable row level security;
alter table public.jds_rental_source_windows enable row level security;
revoke all on public.jds_rental_source_imports,public.jds_rental_source_windows from public,anon,authenticated;
grant select on public.jds_rental_source_imports,public.jds_rental_source_windows to authenticated;
create policy rental_source_import_manager on public.jds_rental_source_imports for select to authenticated using(public.jds_can_manage_school('CORE'));
create policy rental_source_window_manager on public.jds_rental_source_windows for select to authenticated using(public.jds_can_manage_school('CORE'));

create schema if not exists school_private;
-- Deliberately sanitized public availability. Only wrappers below can execute this helper.
create function school_private.core_rental_day(target_date date)
returns table(studio_id uuid,room_name text,starts_at timestamptz,ends_at timestamptz,available boolean,calendar_verified boolean,hour_price_cents integer,status_label text)
language plpgsql stable security definer set search_path='' as $$
begin
 if target_date is null or target_date<(now() at time zone 'Europe/Paris')::date or target_date>(now() at time zone 'Europe/Paris')::date+365 then raise exception 'Choisis une date dans les 12 prochains mois.';end if;
 return query with source as (
  select i.id from public.jds_rental_source_imports i where i.active and i.campus='CORE' and i.month=date_trunc('month',target_date)::date
 ), slots as (
  select r.studio_id,s.name,r.rate_id,c.verified_until,
   ((target_date+case when exists(select 1 from source) then time '08:30' else c.opening_time end) at time zone 'Europe/Paris')+i*interval '30 minutes' slot_start,
   ((target_date+case when exists(select 1 from source) then time '08:30' else c.opening_time end) at time zone 'Europe/Paris')+(i+2)*interval '30 minutes' slot_end,
   exists(select 1 from source) as imported
  from public.jds_rental_calendar_rooms r join public.jds_studios s on s.id=r.studio_id cross join public.jds_rental_calendar_settings c
  cross join lateral generate_series(0,case when exists(select 1 from source) then 25 else (extract(epoch from (c.closing_time-c.opening_time))/1800)::integer-2 end) i
 ), checked as (
  select x.*,
   (x.imported or coalesce(target_date<=x.verified_until,false)) as verified,
   (not x.imported or exists(select 1 from public.jds_rental_source_windows w join source on source.id=w.import_id
    where w.studio_id=x.studio_id and w.source_date=target_date and w.available and w.starts_at<=x.slot_start and w.ends_at>=x.slot_end)) as source_free,
   exists(select 1 from public.jds_rental_calendar_blocks b where b.active and (b.studio_id is null or b.studio_id=x.studio_id)
    and target_date between b.starts_on and b.ends_on and (b.weekday is null or b.weekday=extract(isodow from target_date))
    and not(b.pause_holidays and exists(select 1 from public.jds_rental_calendar_holidays h where h.confirmed and target_date between h.starts_on and h.ends_on))
    and tstzrange((target_date+b.starts_at) at time zone 'Europe/Paris',(target_date+b.ends_at) at time zone 'Europe/Paris','[)')&&tstzrange(x.slot_start,x.slot_end,'[)'))
   or exists(select 1 from public.jds_sessions l join public.jds_schools sc on sc.id=l.school_id where sc.code='CORE' and l.status not in ('cancelled','canceled','draft')
    and (l.studio_id is null or l.studio_id=x.studio_id) and tstzrange(l.starts_at,l.starts_at+l.duration_min*interval '1 minute','[)')&&tstzrange(x.slot_start,x.slot_end,'[)'))
   or exists(select 1 from public.jds_training_lessons l join public.jds_training_groups g on g.id=l.group_id where g.campus='CORE' and l.status='published'
    and (l.rental_studio_id is null or l.rental_studio_id=x.studio_id) and tstzrange(l.starts_at,l.ends_at,'[)')&&tstzrange(x.slot_start,x.slot_end,'[)')) as occupied,
   case when extract(isodow from target_date)>=6 then case when (x.slot_end at time zone 'Europe/Paris')::time<='19:00' then 3 end
    when (x.slot_start at time zone 'Europe/Paris')::time>='10:00' and (x.slot_end at time zone 'Europe/Paris')::time<='19:00' then 1
    when (x.slot_start at time zone 'Europe/Paris')::time>='19:00' and (x.slot_end at time zone 'Europe/Paris')::time<='22:00' then 2 end price_slot
  from slots x
 )
 select x.studio_id,x.name,x.slot_start,x.slot_end,
  x.source_free and not x.occupied and x.verified and x.slot_start>now(),x.verified,p.price_cents,
  case when x.slot_start<=now() then 'Créneau passé' when not x.verified then 'Planning à vérifier'
   when not x.source_free or x.occupied then 'Indisponible' when p.price_cents is null then 'Disponible · tarif sur devis' else 'Disponible · paiement non activé' end
 from checked x left join public.jds_rental_prices p on p.rate_id=x.rate_id and p.slot_order=x.price_slot order by x.name,x.slot_start;
end $$;
revoke all on function school_private.core_rental_day(date) from public,anon,authenticated;

create or replace function public.jds_core_rental_day(target_date date)
returns table(studio_id uuid,room_name text,starts_at timestamptz,ends_at timestamptz,available boolean,calendar_verified boolean,hour_price_cents integer,status_label text)
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Connexion requise.';end if;
 return query select * from school_private.core_rental_day(target_date);
end $$;

create function public.jds_core_rental_public_day(target_date date)
returns table(studio_id uuid,room_name text,starts_at timestamptz,ends_at timestamptz,available boolean,calendar_verified boolean,hour_price_cents integer,status_label text)
language sql stable security definer set search_path='' as $$select * from school_private.core_rental_day(target_date)$$;

create function public.jds_core_rental_public_month(target_month date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare chosen date;result jsonb;begin
 chosen:=coalesce(date_trunc('month',target_month)::date,(select min(i.month) from public.jds_rental_source_imports i where i.active and i.month>=date_trunc('month',now() at time zone 'Europe/Paris')::date),date_trunc('month',now() at time zone 'Europe/Paris')::date);
 if chosen<date_trunc('month',now() at time zone 'Europe/Paris')::date or chosen>(now() at time zone 'Europe/Paris')::date+365 then raise exception 'Mois hors période disponible.';end if;
 select jsonb_build_object('month',chosen,'source_verified',exists(select 1 from public.jds_rental_source_imports i where i.active and i.month=chosen),
  'days',coalesce(jsonb_agg(jsonb_build_object('date',d.source_day,'available_slots',a.free,'verified',a.verified) order by d.source_day),'[]'::jsonb)) into result
 from(select g::date as source_day from generate_series(greatest(chosen,(now() at time zone 'Europe/Paris')::date)::timestamp,least((chosen+interval '1 month'-interval '1 day')::date,(now() at time zone 'Europe/Paris')::date+365)::timestamp,interval '1 day')g)d
 cross join lateral(select count(*) filter(where available) free,coalesce(bool_and(calendar_verified),false) verified from school_private.core_rental_day(d.source_day))a;
 return result;
end $$;
revoke all on function public.jds_core_rental_public_day(date),public.jds_core_rental_public_month(date) from public,anon,authenticated;
grant execute on function public.jds_core_rental_public_day(date),public.jds_core_rental_public_month(date) to anon,authenticated;
notify pgrst,'reload schema';
