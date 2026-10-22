create table public.jds_student_good_actions(
 id uuid primary key,member_id uuid not null references public.jds_training_members(id),occurred_on date not null,
 label text not null check(length(trim(label)) between 3 and 300),
 created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),
 voided_at timestamptz,voided_by uuid references public.profiles(id),void_reason text not null default '',
 check((voided_at is null and voided_by is null and void_reason='') or (voided_at is not null and voided_by is not null and length(trim(void_reason)) between 1 and 500))
);
create index student_good_actions_member on public.jds_student_good_actions(member_id,occurred_on);
alter table public.jds_student_good_actions enable row level security;
revoke all on public.jds_student_good_actions from anon,authenticated;
grant select on public.jds_student_good_actions to authenticated;
create policy student_good_actions_manager on public.jds_student_good_actions for select to authenticated using(school_private.absence_member_access(member_id::text,true));

create function public.jds_add_student_good_action(action_key uuid,target_member uuid,action_date date,description text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;oldrow public.jds_student_good_actions;begin
 if auth.uid() is null or not school_private.absence_member_access(target_member::text,true) then raise exception 'Validation réservée à l’équipe habilitée du campus.';end if;
 if action_key is null or action_date is null or action_date>(now() at time zone 'Europe/Paris')::date then raise exception 'Renseigne la date réelle de l’action (pas de date future).';end if;
 if description is null or length(trim(description)) not between 3 and 300 then raise exception 'Décris cette bonne action (3 à 300 caractères).';end if;
 insert into public.jds_student_good_actions(id,member_id,occurred_on,label,created_by) values(action_key,target_member,action_date,trim(description),auth.uid()) on conflict(id) do nothing returning id into result;
 if result is null then
 select * into oldrow from public.jds_student_good_actions where id=action_key;
 if oldrow.member_id is distinct from target_member or oldrow.created_by is distinct from auth.uid() or oldrow.occurred_on is distinct from action_date or oldrow.label is distinct from trim(description) then raise exception 'Cet enregistrement existe déjà avec un autre contenu. Actualise la liste.';end if;
 result:=oldrow.id;
 end if;
 return result;
end $$;
create function public.jds_void_student_good_action(action_key uuid,reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare row public.jds_student_good_actions;begin
 select * into row from public.jds_student_good_actions where id=action_key for update;
 if auth.uid() is null or row.id is null or not school_private.absence_member_access(row.member_id::text,true) then raise exception 'Accès refusé.';end if;
 if reason is null or length(trim(reason)) not between 1 and 500 then raise exception 'Précise le motif de l’annulation (500 caractères maximum).';end if;
 if row.voided_at is null then update public.jds_student_good_actions set voided_at=now(),voided_by=auth.uid(),void_reason=trim(reason) where id=row.id;end if;
 return row.id;
end $$;
revoke all on function public.jds_add_student_good_action(uuid,uuid,date,text),public.jds_void_student_good_action(uuid,text) from public,anon;
grant execute on function public.jds_add_student_good_action(uuid,uuid,date,text),public.jds_void_student_good_action(uuid,text) to authenticated;

create function public.jds_student_three_rankings()
returns table(member_id uuid,group_id uuid,grade_count bigint,grade_mean20 numeric,grade_score100 numeric,bonus_points bigint,absence_penalty numeric,attendance_score numeric,global_score numeric,grade_rank bigint,attendance_rank bigint,global_rank bigint,warning_required boolean,recorded_courses bigint,missing_calls bigint,pending_justifications bigint,unsubmitted_subjects bigint)
language sql stable security definer set search_path='' as $$
 with members as (
 select m.id,m.group_id from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id
 where auth.uid() is not null and public.jds_can_manage_school(g.campus)
 ), grades as (
 -- Each submitted individual mark has equal weight unless an explicit coefficient is configured.
 -- CC /5 is converted to /20. Zero marks count; exemptions, drafts and archived subjects do not.
 select m.id,count(*) filter(where marks.weight>0 and marks.value is not null) grade_count,
 sum(marks.value*marks.weight)/nullif(sum(marks.weight) filter(where marks.value is not null and marks.weight>0),0) grade_mean20
 from members m join public.jds_bulletin_grades b on b.member_id=m.id and b.submitted
 join public.jds_bulletin_subjects s on s.id=b.subject_id and s.group_id=m.group_id and s.active
 cross join lateral(
 select v*4 value,coalesce(s.cc_coefficient,1) weight from unnest(b.cc_scores) v where not b.cc_exempt and coalesce(s.cc_coefficient,1)>0
 union all
 select v value,coalesce(s.evaluation_coefficient,1) weight from unnest(b.evaluation_scores) v where not b.evaluation_exempt and coalesce(s.evaluation_coefficient,1)>0
 ) marks group by m.id
 ), counts as (
 select m.id,m.group_id,coalesce(g.grade_count,0) grade_count,g.grade_mean20,
 (select count(*) from public.jds_student_good_actions a where a.member_id=m.id and a.voided_at is null) bonus_points,
 a.weighted_absences absence_penalty,a.warning_required,a.recorded_courses,a.missing_calls,a.pending_justifications,
 (select count(*) from public.jds_bulletin_subjects s where s.group_id=m.group_id and s.active and not exists(select 1 from public.jds_bulletin_grades b where b.subject_id=s.id and b.member_id=m.id and b.submitted)) unsubmitted_subjects
 from members m left join grades g on g.id=m.id join public.jds_student_attendance_summary() a on a.member_id=m.id
 ), scores as (
 select c.*,grade_mean20*5 grade_score100,case when recorded_courses>0 then 100-absence_penalty else null end attendance_score,
 grade_mean20*5+bonus_points-absence_penalty global_score from counts c
 )
 select id,group_id,grade_count,grade_mean20,grade_score100,bonus_points,absence_penalty,attendance_score,global_score,
 case when grade_score100 is not null then rank() over(partition by group_id order by grade_score100 desc nulls last) else null end,
 case when attendance_score is not null then rank() over(partition by group_id order by attendance_score desc nulls last) else null end,
 case when global_score is not null then rank() over(partition by group_id order by global_score desc nulls last) else null end,
 warning_required,recorded_courses,missing_calls,pending_justifications,unsubmitted_subjects from scores;
$$;
revoke all on function public.jds_student_three_rankings() from public,anon;
grant execute on function public.jds_student_three_rankings() to authenticated;
