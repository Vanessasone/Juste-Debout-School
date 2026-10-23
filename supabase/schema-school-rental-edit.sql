alter table public.jds_rental_calendar_blocks add column revision integer not null default 1;
alter table public.jds_rental_calendar_blocks add column updated_at timestamptz not null default now();
create table public.jds_rental_block_events(
 id bigint generated always as identity primary key,block_id uuid not null references public.jds_rental_calendar_blocks(id),
 actor_id uuid not null references public.profiles(id),recorded_at timestamptz not null default now(),revision integer not null,
 before_snapshot jsonb,after_snapshot jsonb not null,unique(block_id,revision)
);
alter table public.jds_rental_block_events enable row level security;
revoke all on public.jds_rental_block_events from public,anon,authenticated;
grant select on public.jds_rental_block_events to authenticated;
create policy rental_block_event_manager on public.jds_rental_block_events for select to authenticated using((select public.jds_can_manage_school('CORE')));
create function school_private.edit_rental_block(block_key uuid,expected_revision integer,details jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare prior public.jds_rental_calendar_blocks; saved public.jds_rental_calendar_blocks; room uuid;
begin
 if auth.uid() is null or not public.jds_can_manage_school('CORE') then raise exception 'Accès CORE requis.';end if;
 if block_key is not null then
  select * into prior from public.jds_rental_calendar_blocks where id=block_key for update;
  if not found then raise exception 'Blocage introuvable.';end if;
  if expected_revision is distinct from prior.revision then raise exception 'Le blocage a changé. Actualise avant de modifier.';end if;
 end if;
 room:=nullif(details->>'studio_id','')::uuid;
 if room is not null and not exists(select 1 from public.jds_rental_calendar_rooms where studio_id=room) then raise exception 'Salle CORE inconnue.';end if;
 if block_key is null then
  insert into public.jds_rental_calendar_blocks(studio_id,starts_on,ends_on,weekday,starts_at,ends_at,kind,label,pause_holidays,active,created_by)
  values(room,(details->>'starts_on')::date,(details->>'ends_on')::date,nullif(details->>'weekday','')::integer,(details->>'starts_at')::time,(details->>'ends_at')::time,details->>'kind',btrim(details->>'label'),coalesce((details->>'pause_holidays')::boolean,false),true,auth.uid()) returning * into saved;
 else
  update public.jds_rental_calendar_blocks set studio_id=room,starts_on=(details->>'starts_on')::date,ends_on=(details->>'ends_on')::date,weekday=nullif(details->>'weekday','')::integer,starts_at=(details->>'starts_at')::time,ends_at=(details->>'ends_at')::time,kind=details->>'kind',label=btrim(details->>'label'),pause_holidays=coalesce((details->>'pause_holidays')::boolean,false),active=coalesce((details->>'active')::boolean,true),revision=revision+1,updated_at=now() where id=block_key returning * into saved;
 end if;
 insert into public.jds_rental_block_events(block_id,actor_id,revision,before_snapshot,after_snapshot) values(saved.id,auth.uid(),saved.revision,case when prior.id is not null then to_jsonb(prior) end,to_jsonb(saved));
 return saved.id;
end $$;
revoke all on function school_private.edit_rental_block(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function school_private.edit_rental_block(uuid,integer,jsonb) to authenticated;
create function public.jds_edit_core_rental_block(block_key uuid default null,expected_revision integer default null,details jsonb default '{}') returns uuid
language sql security invoker set search_path='' as $$select school_private.edit_rental_block(block_key,expected_revision,details)$$;
revoke all on function public.jds_edit_core_rental_block(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.jds_edit_core_rental_block(uuid,integer,jsonb) to authenticated;
-- Preserve the historical create/remove endpoint, with the same controls and audit trail.
create or replace function public.jds_save_core_rental_block(block_key uuid,room_key uuid,first_date date,last_date date,iso_weekday integer,start_time time,end_time time,block_kind text,description text,pause_on_holidays boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare prior public.jds_rental_calendar_blocks;
begin
 if auth.uid() is null or not public.jds_can_manage_school('CORE') then raise exception 'Accès CORE requis.';end if;
 if block_key is not null then
  select * into prior from public.jds_rental_calendar_blocks where id=block_key;
  if not found then raise exception 'Blocage introuvable.';end if;
  return school_private.edit_rental_block(block_key,prior.revision,to_jsonb(prior)||'{"active":false}');
 end if;
 return school_private.edit_rental_block(null,null,jsonb_build_object('studio_id',room_key,'starts_on',first_date,'ends_on',last_date,'weekday',iso_weekday,'starts_at',start_time,'ends_at',end_time,'kind',block_kind,'label',description,'pause_holidays',pause_on_holidays));
end $$;
notify pgrst,'reload schema';
