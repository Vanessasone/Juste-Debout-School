-- Dedicated School only. Responsibilities are prepared inactive, never claimed by email.
create table public.jds_school_responsibilities(
 id uuid primary key default gen_random_uuid(),
 display_name text not null check(length(trim(display_name)) between 1 and 100),
 email text not null unique check(email=lower(trim(email)) and length(email)<=320),
 title text not null check(length(trim(title)) between 1 and 100),
 campus text check(campus in ('CORE','INDUSTRY')),
 profile_id uuid references public.profiles(id),
 enabled boolean not null default false,
 created_at timestamptz not null default now(),
 check(not enabled or profile_id is not null));
create index school_responsibilities_profile on public.jds_school_responsibilities(profile_id) where enabled;
alter table public.jds_school_responsibilities enable row level security;
revoke all on public.jds_school_responsibilities from public,anon,authenticated;
grant select,insert,update on public.jds_school_responsibilities to authenticated;
create policy school_responsibilities_read on public.jds_school_responsibilities for select to authenticated using(public.is_admin() or profile_id=auth.uid());
create policy school_responsibilities_insert on public.jds_school_responsibilities for insert to authenticated with check(public.is_admin());
create policy school_responsibilities_update on public.jds_school_responsibilities for update to authenticated using(public.is_admin()) with check(public.is_admin());
create function public.jds_can_manage_school(school text) returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and (public.is_admin() or exists(select 1 from public.jds_school_responsibilities r where r.profile_id=auth.uid() and r.enabled and (r.campus is null or r.campus=school)))
$$;
revoke all on function public.jds_can_manage_school(text) from public;
grant execute on function public.jds_can_manage_school(text) to authenticated;
-- Non-exposed helper: bypasses only the group/member policy cycle, checks current user.
create schema if not exists school_private;
revoke all on schema school_private from public,anon;
grant usage on schema school_private to authenticated;
create function school_private.can_manage_group(group_key text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.is_admin() or exists(
 select 1 from public.jds_training_groups g join public.jds_school_responsibilities r on r.campus is null or r.campus=g.campus
 where g.id::text=group_key and r.enabled and r.profile_id=auth.uid()))
$$;
revoke all on function school_private.can_manage_group(text) from public,anon;
grant execute on function school_private.can_manage_group(text) to authenticated;
alter policy private_directory_admin_select on public.jds_private_directory using(public.jds_can_manage_school(campus));
alter policy private_directory_admin_insert on public.jds_private_directory with check(public.jds_can_manage_school(campus));
alter policy private_directory_admin_update on public.jds_private_directory using(public.jds_can_manage_school(campus)) with check(public.jds_can_manage_school(campus));
-- Group structure and shared calendar stay under the central administrator.
alter policy training_groups_read on public.jds_training_groups using(public.jds_can_manage_school(campus) or exists(select 1 from public.jds_training_members m where m.group_id=jds_training_groups.id and m.profile_id=auth.uid()));
alter policy training_members_read on public.jds_training_members using(school_private.can_manage_group(group_id::text) or profile_id=auth.uid());
alter policy training_lessons_read on public.jds_training_lessons using(school_private.can_manage_group(group_id::text) or (status in ('published','cancelled') and exists(select 1 from public.jds_training_members m where m.group_id=jds_training_lessons.group_id and m.profile_id=auth.uid())));
alter policy training_posts_read on public.jds_training_posts using(school_private.can_manage_group(group_id::text) or (status='published' and exists(select 1 from public.jds_training_members m where m.group_id=jds_training_posts.group_id and m.profile_id=auth.uid())));
alter policy training_attendance_read on public.jds_training_attendance using(exists(select 1 from public.jds_training_members m where m.id=member_id and (m.profile_id=auth.uid() or school_private.can_manage_group(m.group_id::text))));
alter policy training_periods_read on public.jds_training_periods using(public.jds_can_manage_school('CORE') or public.jds_can_manage_school('INDUSTRY') or (published and exists(select 1 from public.jds_training_members m where m.profile_id=auth.uid())));
do $$declare t text;begin foreach t in array array['jds_training_members','jds_training_lessons','jds_training_posts'] loop
 execute format('alter policy %I on public.%I with check(school_private.can_manage_group(group_id::text))',t||'_insert',t);
 execute format('alter policy %I on public.%I using(school_private.can_manage_group(group_id::text)) with check(school_private.can_manage_group(group_id::text))',t||'_update',t);
end loop;end $$;
alter policy jds_training_attendance_insert on public.jds_training_attendance with check(exists(select 1 from public.jds_training_lessons l where l.id=lesson_id and school_private.can_manage_group(l.group_id::text)));
alter policy jds_training_attendance_update on public.jds_training_attendance using(exists(select 1 from public.jds_training_lessons l where l.id=lesson_id and school_private.can_manage_group(l.group_id::text))) with check(exists(select 1 from public.jds_training_lessons l where l.id=lesson_id and school_private.can_manage_group(l.group_id::text)));
alter policy training_files_read on storage.objects using(bucket_id='school-training' and (school_private.can_manage_group(split_part(name,'/',1)) or exists(select 1 from public.jds_training_members m join public.jds_training_posts p on p.group_id=m.group_id where m.profile_id=auth.uid() and p.status='published' and p.storage_path=name)));
alter policy training_files_insert on storage.objects with check(bucket_id='school-training' and school_private.can_manage_group(split_part(name,'/',1)));
alter policy training_files_delete on storage.objects using(bucket_id='school-training' and school_private.can_manage_group(split_part(name,'/',1)) and not exists(select 1 from public.jds_training_posts p where p.storage_path=name));

create or replace function public.jds_assign_training_member(target_group uuid,target_person uuid) returns uuid language plpgsql set search_path='' as $$
declare member_uuid uuid; school text; school_season text;promo text;begin
 if not school_private.can_manage_group(target_group::text) then raise exception 'Accès responsable de cette école requis.';end if;
 select campus,season,name into school,school_season,promo from public.jds_training_groups where id=target_group;
 if school is null then raise exception 'Promotion introuvable.';end if;
 if exists(select 1 from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id where m.person_id=target_person and g.season=school_season and m.group_id<>target_group) then raise exception 'Cet élève est déjà affecté à une autre promotion pour cette saison.';end if;
 if not exists(select 1 from public.jds_private_directory d where d.id=target_person and d.campus=school and d.person_type='student') then raise exception 'École ou fiche incompatible.';end if;
 update public.jds_private_directory set cohort=promo where id=target_person and cohort is distinct from promo;
 insert into public.jds_training_members(group_id,person_id) values(target_group,target_person) on conflict(group_id,person_id) do nothing;
 select id into member_uuid from public.jds_training_members where group_id=target_group and person_id=target_person;
 return member_uuid;end $$;
revoke all on function public.jds_assign_training_member(uuid,uuid) from public;
grant execute on function public.jds_assign_training_member(uuid,uuid) to authenticated;
-- Account identity matching remains a central administration operation.
create function public.jds_guard_training_account_link() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (tg_op='INSERT' and new.profile_id is not null) or (tg_op='UPDATE' and new.profile_id is distinct from old.profile_id) then
  if not public.is_admin() then raise exception 'Le rattachement des comptes est réservé à l’administration centrale.';end if;
 end if;
 return new;
end $$;
revoke all on function public.jds_guard_training_account_link() from public;
create trigger training_account_link_guard before insert or update on public.jds_training_members for each row execute function public.jds_guard_training_account_link();
