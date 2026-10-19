drop policy training_groups_read on public.jds_training_groups;
create policy training_groups_read on public.jds_training_groups for select to authenticated using(public.is_admin() or exists(select 1 from public.jds_training_members m where m.group_id=jds_training_groups.id and m.profile_id=auth.uid()));
create unique index training_member_profile_unique on public.jds_training_members(group_id,profile_id) where profile_id is not null;
create unique index training_lesson_unique on public.jds_training_lessons(group_id,title,starts_at);
create function public.jds_assign_training_member(target_group uuid,target_person uuid) returns uuid language plpgsql set search_path='' as $$
declare member_uuid uuid; school text; school_season text;promo text;begin
 if not public.is_admin() then raise exception 'Accès administrateur requis.';end if;
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
