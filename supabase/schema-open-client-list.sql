create function school_private.open_client_list()
returns table(applicant_name text, campus text, disciplines text, status text, requested_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p.full_name, ''), nullif(p.alias, ''), 'Profil School'),
         r.campus, r.disciplines, r.status, r.requested_at
  from public.jds_access_requests r
  join public.profiles p on p.id = r.profile_id
  where auth.uid() is not null and r.kind = 'open'
    and school_private.can_review_access(r.campus, 'open')
  order by r.requested_at desc
$$;
revoke all on function school_private.open_client_list() from public, anon;
grant execute on function school_private.open_client_list() to authenticated;

create function public.jds_open_client_list()
returns table(applicant_name text, campus text, disciplines text, status text, requested_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from school_private.open_client_list()
$$;
revoke all on function public.jds_open_client_list() from public, anon;
grant execute on function public.jds_open_client_list() to authenticated;
