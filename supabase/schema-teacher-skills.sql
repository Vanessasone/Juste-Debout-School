create function school_private.teacher_ranking_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users u join public.jds_school_responsibilities r on r.profile_id=u.id and r.enabled
 where u.id=auth.uid() and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now())
 and lower(u.email)=lower(r.email) and lower(u.email) in ('nicolas@juste-debout.com','bruceykanji1@gmail.com','rabah@juste-debout.com','loic@juste-debout.com'));
$$;
revoke all on function school_private.teacher_ranking_allowed() from public,anon;
grant execute on function school_private.teacher_ranking_allowed() to authenticated;
create function public.jds_teacher_ranking_access() returns boolean language sql stable set search_path='' as $$select school_private.teacher_ranking_allowed()$$;
revoke all on function public.jds_teacher_ranking_access() from public,anon;
grant execute on function public.jds_teacher_ranking_access() to authenticated;
create table public.jds_teacher_skill_scores(
 id uuid primary key default gen_random_uuid(),teacher_name text not null check(length(trim(teacher_name)) between 1 and 200),
 period text not null check(length(trim(period)) between 1 and 100),formation boolean,open_classes boolean,
 scores numeric[] not null,revision integer not null default 1,source text not null default '',
 updated_by uuid references public.profiles(id),updated_at timestamptz not null default now(),unique(period,teacher_name),
 check(cardinality(scores)=10 and array_ndims(scores)=1 and array_lower(scores,1)=1)
);
create function school_private.validate_teacher_skill_scores() returns trigger language plpgsql set search_path='' as $$begin
 if exists(select 1 from unnest(new.scores) s where s is not null and (s<1 or s>5 or s<>trunc(s))) then raise exception 'Chaque critère doit être vide ou entier de 1 à 5.';end if;return new;end$$;
create trigger teacher_skill_scores_validate before insert or update on public.jds_teacher_skill_scores for each row execute function school_private.validate_teacher_skill_scores();
revoke all on function school_private.validate_teacher_skill_scores() from public,anon,authenticated;
alter table public.jds_teacher_skill_scores enable row level security;
revoke all on public.jds_teacher_skill_scores from anon,authenticated;
grant select on public.jds_teacher_skill_scores to authenticated;
create policy teacher_skills_four_only on public.jds_teacher_skill_scores for select to authenticated using(school_private.teacher_ranking_allowed());
create table public.jds_teacher_skill_audit(id uuid primary key default gen_random_uuid(),score_id uuid not null references public.jds_teacher_skill_scores(id),actor uuid not null references public.profiles(id),before_value jsonb,after_value jsonb not null,created_at timestamptz not null default now());
alter table public.jds_teacher_skill_audit enable row level security;
revoke all on public.jds_teacher_skill_audit from anon,authenticated;
grant select on public.jds_teacher_skill_audit to authenticated;
create policy teacher_skill_audit_four_only on public.jds_teacher_skill_audit for select to authenticated using(school_private.teacher_ranking_allowed());
create function public.jds_save_teacher_skills(score_key uuid,label text,period_label text,values10 numeric[],formation_flag boolean,open_flag boolean,expected_revision integer default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare oldrow public.jds_teacher_skill_scores;result public.jds_teacher_skill_scores;begin
 if not school_private.teacher_ranking_allowed() then raise exception 'Accès réservé aux quatre directeurs désignés.';end if;
 if score_key is not null then
 select * into oldrow from public.jds_teacher_skill_scores where id=score_key for update;
 if oldrow.id is null or expected_revision is distinct from oldrow.revision then raise exception 'Cette évaluation a changé. Recharge-la avant modification.';end if;
 update public.jds_teacher_skill_scores set teacher_name=trim(label),period=trim(period_label),scores=values10,formation=formation_flag,open_classes=open_flag,revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=score_key returning * into result;
 else
 insert into public.jds_teacher_skill_scores(teacher_name,period,scores,formation,open_classes,updated_by) values(trim(label),trim(period_label),values10,formation_flag,open_flag,auth.uid()) returning * into result;
 end if;
 insert into public.jds_teacher_skill_audit(score_id,actor,before_value,after_value) values(result.id,auth.uid(),case when oldrow.id is null then null else to_jsonb(oldrow) end,to_jsonb(result));
 return result.id;end$$;
revoke all on function public.jds_save_teacher_skills(uuid,text,text,numeric[],boolean,boolean,integer) from public,anon;
grant execute on function public.jds_save_teacher_skills(uuid,text,text,numeric[],boolean,boolean,integer) to authenticated;
-- Restrictive policies ensure the pre-existing admin ALL policy cannot bypass this boundary.
create policy ranking_teacher_four_boundary on public.ranking_subjects as restrictive for all to authenticated using(population not in ('open_teacher','formation_teacher') or school_private.teacher_ranking_allowed()) with check(population not in ('open_teacher','formation_teacher') or school_private.teacher_ranking_allowed());
create or replace function public.ranking_can_see(pop text) returns boolean language sql stable security definer set search_path='' as $$
 select case when pop in ('open_teacher','formation_teacher') then school_private.teacher_ranking_allowed() else public.is_admin() or exists(select 1 from public.jds_school_staff s where s.profile_id=auth.uid()) end;
$$;
create or replace function public.ranking_add(p_subject uuid,p_kind text,p_points numeric,p_season text default '2026-T1',p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare school uuid;code text;pop text;begin
 if auth.uid() is null then raise exception 'Connexion requise.';end if;
 select s.school_id,c.code,s.population into school,code,pop from public.ranking_subjects s left join public.jds_schools c on c.id=s.school_id where s.id=p_subject;
 if not found then raise exception 'Sujet introuvable.';end if;
 if pop in ('open_teacher','formation_teacher') then
 if not school_private.teacher_ranking_allowed() then raise exception 'Accès réservé aux quatre directeurs désignés.';end if;
 elsif not (public.is_admin() or coalesce(public.jds_is_school_staff(school),false) or coalesce(public.jds_can_manage_school(code),false)) then raise exception 'Accès campus refusé.';end if;
 insert into public.ranking_points(subject_id,season,kind,points,note,created_by) values(p_subject,p_season,p_kind,p_points,p_note,auth.uid());
end$$;
