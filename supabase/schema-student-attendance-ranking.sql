-- Automatic attendance component, per cohort/season. No invented conversion into pedagogical marks.
create function public.jds_student_attendance_summary()
returns table(member_id uuid,group_id uuid,recorded_courses bigint,missing_calls bigint,raw_absences bigint,justified_absences bigint,pending_justifications bigint,weighted_absences numeric,warning_required boolean,attendance_rank bigint)
language sql stable security definer set search_path='' as $$
 with accessible as (
 select m.id,m.group_id from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id
 where auth.uid() is not null and (m.profile_id=auth.uid() or public.jds_can_manage_school(g.campus))
 ), counts as (
 select m.id,m.group_id,count(a.id) as recorded_courses,count(l.id) filter(where a.id is null) as missing_calls,
 count(a.id) filter(where a.status in ('absent','excused')) as raw_absences,
 count(a.id) filter(where a.status in ('absent','excused') and proof.approved) as justified_absences,
 count(a.id) filter(where a.status in ('absent','excused') and not proof.approved and proof.pending) as pending_justifications,
 coalesce(sum(case when a.status in ('absent','excused') then case when proof.approved then 0.5 else 1 end else 0 end),0) as weighted_absences
 from public.jds_training_members m
 join public.jds_training_groups g on g.id=m.group_id
 left join public.jds_training_lessons l on l.group_id=m.group_id and l.status='published' and l.ends_at<=now()
 left join public.jds_training_attendance a on a.lesson_id=l.id and a.member_id=m.id
 left join lateral(select coalesce(bool_or(r.status='approved'),false) approved,coalesce(bool_or(r.status='pending'),false) pending
 from public.jds_absence_requests r where r.member_id=m.id and (l.starts_at at time zone 'Europe/Paris')::date between r.starts_on and r.ends_on) proof on true
 -- Include the full cohort when calculating rank, but return only authorized pupil rows below.
 where exists(select 1 from accessible x where x.group_id=m.group_id)
 group by m.id,m.group_id
 ), ranked as (
 select c.*,case when recorded_courses>0 then rank() over(partition by group_id,(recorded_courses>0) order by weighted_absences asc) else null end as attendance_rank from counts c
 )
 select c.id,c.group_id,c.recorded_courses,c.missing_calls,c.raw_absences,c.justified_absences,c.pending_justifications,c.weighted_absences,c.weighted_absences>=15,case when public.jds_can_manage_school((select g.campus from public.jds_training_groups g where g.id=c.group_id)) then c.attendance_rank else null end
 from ranked c join accessible x on x.id=c.id;
$$;
revoke all on function public.jds_student_attendance_summary() from public,anon;
grant execute on function public.jds_student_attendance_summary() to authenticated;
