-- Read-only operational view of existing students. Does not approve requests or link accounts.
create function school_private.student_activation_workspace() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now()))
 or not (public.jds_can_manage_school('CORE') or public.jds_can_manage_school('INDUSTRY')) then raise exception 'Accès réservé à l’administration de l’école.';end if;
 return jsonb_build_object('generated_at',now(),
 'groups',coalesce((select jsonb_agg(to_jsonb(g) order by g.campus,g.season desc,g.name) from public.jds_training_groups g where g.campus in ('CORE','INDUSTRY') and public.jds_can_manage_school(g.campus)),'[]'),
 'students',coalesce((select jsonb_agg(jsonb_build_object('member_id',m.id,'group_id',g.id,'campus',g.campus,'promotion',g.name,'season',g.season,
 'name',btrim(concat_ws(' ',d.first_name,d.last_name)),'email',coalesce(d.email,''),'directory_verified',d.review_status='verified',
 'linked',m.profile_id is not null,'request_status',req.status,'status',case
  when m.profile_id is not null then case when linked_user.id is not null and linked_user.email_confirmed_at is not null and (linked_user.banned_until is null or linked_user.banned_until<now()) and d.review_status='verified' then 'linked' else 'check_link' end
  when coalesce(lower(btrim(d.email)),'') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then 'missing_email'
  when matches.n=0 then 'no_account'
  when matches.n<>1 then 'ambiguous'
  when matches.blocked then 'blocked'
  when not matches.confirmed then 'unconfirmed'
  when req.status='pending' then 'pending'
  when req.status='approved' then 'check_link'
  when req.status='rejected' then 'rejected'
  else 'request_needed' end) order by g.campus,g.season desc,g.name,d.last_name,d.first_name,m.id)
 from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id join public.jds_private_directory d on d.id=m.person_id
 left join auth.users linked_user on linked_user.id=m.profile_id
 cross join lateral(select count(*) n,bool_and(u.email_confirmed_at is not null) confirmed,bool_or(u.banned_until>now()) blocked from auth.users u where lower(u.email)=lower(btrim(d.email))) matches
 left join lateral(select r.status from public.jds_access_requests r join auth.users u on u.id=r.profile_id where r.kind='student' and r.group_id=m.group_id and (r.linked_person_id=m.person_id or (r.linked_person_id is null and lower(u.email)=lower(btrim(d.email)))) order by r.requested_at desc limit 1) req on true
 where g.campus in ('CORE','INDUSTRY') and public.jds_can_manage_school(g.campus)),'[]'),
 'pending_requests',coalesce((select jsonb_agg(jsonb_build_object('campus',x.campus,'count',x.n)) from (select r.campus,count(*) n from public.jds_access_requests r where r.kind='student' and r.status='pending' and public.jds_can_manage_school(r.campus) group by r.campus)x),'[]'));
end $$;
revoke all on function school_private.student_activation_workspace() from public,anon,authenticated;
grant execute on function school_private.student_activation_workspace() to authenticated;
create function public.jds_student_activation_workspace() returns jsonb language sql stable security invoker set search_path='' as $$select school_private.student_activation_workspace()$$;
revoke all on function public.jds_student_activation_workspace() from public,anon,authenticated;
grant execute on function public.jds_student_activation_workspace() to authenticated;
notify pgrst,'reload schema';
