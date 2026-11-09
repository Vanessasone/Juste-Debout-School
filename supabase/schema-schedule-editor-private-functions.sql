-- Keep privileged implementations in the non-exposed School schema.
alter function public.jds_schedule_editor_access() set schema school_private;
alter function public.jds_activate_schedule_editor() set schema school_private;

create or replace function school_private.jds_activate_schedule_editor() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  update school_private.schedule_editors e
  set profile_id = auth.uid()
  where e.profile_id is null
    and exists (
      select 1 from auth.users u join public.profiles p on p.id = u.id
      where u.id = auth.uid() and lower(u.email) = e.email
        and u.email_confirmed_at is not null and u.confirmation_sent_at is not null
        and (u.banned_until is null or u.banned_until <= now())
    );
  return school_private.jds_schedule_editor_access();
end
$$;

create function public.jds_activate_schedule_editor() returns boolean
language sql security invoker set search_path = '' as $$
  select school_private.jds_activate_schedule_editor()
$$;

revoke all on function public.jds_activate_schedule_editor() from public, anon;
grant execute on function public.jds_activate_schedule_editor() to authenticated;
