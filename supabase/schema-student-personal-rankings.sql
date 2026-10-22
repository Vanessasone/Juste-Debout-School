-- Shared calculation stays private. Public endpoints filter identity on the server.
create function school_private.student_rankings_engine()
returns table(member_id uuid,group_id uuid,grade_count bigint,grade_mean20 numeric,grade_score100 numeric,bonus_points bigint,absence_penalty numeric,attendance_score numeric,global_score numeric,grade_rank bigint,attendance_rank bigint,global_rank bigint,warning_required boolean,recorded_courses bigint,missing_calls bigint,pending_justifications bigint,unsubmitted_subjects bigint)
language sql stable security definer set search_path='' as $$
 with members as (
 select m.id,m.group_id from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id
 where auth.uid() is not null and (public.jds_can_manage_school(g.campus) or exists(select 1 from public.jds_training_members own where own.group_id=g.id and own.profile_id=auth.uid()))
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
 ), attendance as (
 select m.id member_id,count(a.id) recorded_courses,count(l.id) filter(where a.id is null) missing_calls,
 count(a.id) filter(where a.status in ('absent','excused') and not proof.approved and proof.pending) pending_justifications,
 coalesce(sum(case when a.status in ('absent','excused') then case when proof.approved then 0.5 else 1 end else 0 end),0) weighted_absences
 from members m
 left join public.jds_training_lessons l on l.group_id=m.group_id and l.status='published' and l.ends_at<=now()
 left join public.jds_training_attendance a on a.lesson_id=l.id and a.member_id=m.id
 left join lateral(select coalesce(bool_or(r.status='approved'),false) approved,coalesce(bool_or(r.status='pending'),false) pending
 from public.jds_absence_requests r where r.member_id=m.id and (l.starts_at at time zone 'Europe/Paris')::date between r.starts_on and r.ends_on) proof on true
 group by m.id
 ), counts as (
 select m.id,m.group_id,coalesce(g.grade_count,0) grade_count,g.grade_mean20,
 (select count(*) from public.jds_student_good_actions a where a.member_id=m.id and a.voided_at is null) bonus_points,
 a.weighted_absences absence_penalty,(a.weighted_absences>=15) warning_required,a.recorded_courses,a.missing_calls,a.pending_justifications,
 (select count(*) from public.jds_bulletin_subjects s where s.group_id=m.group_id and s.active and not exists(select 1 from public.jds_bulletin_grades b where b.subject_id=s.id and b.member_id=m.id and b.submitted)) unsubmitted_subjects
 from members m left join grades g on g.id=m.id join attendance a on a.member_id=m.id
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
revoke all on function school_private.student_rankings_engine() from public,anon,authenticated;
create or replace function public.jds_student_three_rankings()
returns table(member_id uuid,group_id uuid,grade_count bigint,grade_mean20 numeric,grade_score100 numeric,bonus_points bigint,absence_penalty numeric,attendance_score numeric,global_score numeric,grade_rank bigint,attendance_rank bigint,global_rank bigint,warning_required boolean,recorded_courses bigint,missing_calls bigint,pending_justifications bigint,unsubmitted_subjects bigint)
language sql stable security definer set search_path='' as $$
 select r.* from school_private.student_rankings_engine() r
 join public.jds_training_members m on m.id=r.member_id
 join public.jds_training_groups g on g.id=m.group_id
 where auth.uid() is not null and public.jds_can_manage_school(g.campus);
$$;
revoke all on function public.jds_student_three_rankings() from public,anon;
grant execute on function public.jds_student_three_rankings() to authenticated;
create or replace function public.jds_my_student_rankings()
returns table(member_id uuid,group_id uuid,grade_count bigint,grade_mean20 numeric,grade_score100 numeric,bonus_points bigint,absence_penalty numeric,attendance_score numeric,global_score numeric,grade_rank bigint,attendance_rank bigint,global_rank bigint,warning_required boolean,recorded_courses bigint,missing_calls bigint,pending_justifications bigint,unsubmitted_subjects bigint)
language sql stable security definer set search_path='' as $$
 select r.* from school_private.student_rankings_engine() r
 join public.jds_training_members m on m.id=r.member_id
 join public.jds_training_groups g on g.id=m.group_id
 where auth.uid() is not null and m.profile_id=auth.uid();
$$;
revoke all on function public.jds_my_student_rankings() from public,anon;
grant execute on function public.jds_my_student_rankings() to authenticated;
