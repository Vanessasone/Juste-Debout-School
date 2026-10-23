-- Read-only management summary. Decisions remain in existing, authorized tools.
create function public.jds_school_cockpit(target_campus text default null,target_group uuid default null,target_term integer default 1,target_date date default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare allowed text[];day date:=coalesce(target_date,(now() at time zone 'Europe/Paris')::date);result jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion School requise.';end if;
 select array_agg(c) into allowed from unnest(array['CORE','INDUSTRY'])c where public.jds_can_manage_school(c);
 if coalesce(cardinality(allowed),0)=0 then raise exception 'Accès administration School requis.';end if;
 if target_campus is not null and not(target_campus=any(allowed)) then raise exception 'École non autorisée.';end if;
 if target_term not between 1 and 3 or target_term is null then raise exception 'Trimestre invalide.';end if;
 if day<(now() at time zone 'Europe/Paris')::date-365 or day>(now() at time zone 'Europe/Paris')::date+365 then raise exception 'Date hors période.';end if;
 if target_group is not null and not exists(select 1 from public.jds_training_groups g where g.id=target_group and g.campus=any(allowed) and(target_campus is null or g.campus=target_campus)) then raise exception 'Promotion non autorisée.';end if;
 with groups as (
  select g.* from public.jds_training_groups g where g.campus=any(allowed) and(target_campus is null or g.campus=target_campus) and(target_group is null or g.id=target_group)
 ), actions as (
  select 'access' key,'decision' bucket,r.campus,null::uuid group_id,r.kind detail,count(*) amount from public.jds_access_requests r where r.status='pending' and r.campus=any(allowed) and(target_campus is null or r.campus=target_campus) and(target_group is null or r.group_id is null or r.group_id=target_group) group by r.campus,r.kind
  union all
  select 'directory','complete',p.campus,null,p.person_type,count(*) from public.jds_private_directory p where p.review_status is distinct from 'verified' and p.campus=any(allowed) and(target_campus is null or p.campus=target_campus) group by p.campus,p.person_type
  union all
  select 'members','complete',g.campus,g.id,'unlinked',count(*) from public.jds_training_members m join groups g on g.id=m.group_id where m.profile_id is null group by g.campus,g.id
  union all
  select 'subjects','complete',g.campus,g.id,'configuration',count(*) from public.jds_bulletin_subjects s join groups g on g.id=s.group_id where s.active and s.term=target_term and(s.teacher_profile is null or s.coefficient_category is null or s.taught_course_count is null or(s.taught_course_count>=3 and(s.cc_coefficient is null or s.evaluation_coefficient is null))) group by g.campus,g.id
  union all
  select 'evaluations_missing','complete',g.campus,g.id,'evaluations',count(*) from public.jds_bulletin_subjects s join groups g on g.id=s.group_id join public.jds_training_members m on m.group_id=g.id left join public.jds_bulletin_grades gr on gr.subject_id=s.id and gr.member_id=m.id where s.active and s.term=target_term and s.teacher_profile is not null and s.taught_course_count>=3 and coalesce(s.cc_coefficient,0)+coalesce(s.evaluation_coefficient,0)>0 and not coalesce(gr.submitted,false) group by g.campus,g.id
  union all
  select 'evaluations_received','review',g.campus,g.id,'submitted',count(*) from public.jds_bulletin_grades gr join public.jds_bulletin_subjects s on s.id=gr.subject_id join groups g on g.id=s.group_id where s.active and s.term=target_term and gr.submitted and gr.updated_at>coalesce((select max(r.published_at) from public.jds_bulletin_reports r where r.member_id=gr.member_id and r.term=s.term),'-infinity'::timestamptz) group by g.campus,g.id
  union all
  select 'summaries','draft',g.campus,g.id,'summaries',count(*) from public.jds_bulletin_drafts d join public.jds_training_members m on m.id=d.member_id join groups g on g.id=m.group_id where d.term=target_term and d.updated_at>coalesce((select max(r.published_at) from public.jds_bulletin_reports r where r.member_id=m.id and r.term=d.term),'-infinity'::timestamptz) group by g.campus,g.id
  union all
  select 'absences','decision',g.campus,g.id,'pending',count(*) from public.jds_absence_requests r join public.jds_training_members m on m.id=r.member_id join groups g on g.id=m.group_id where r.status='pending' group by g.campus,g.id
  union all
  select 'warnings','review',g.campus,g.id,'threshold',count(*) from public.jds_student_attendance_summary() a join groups g on g.id=a.group_id where a.warning_required group by g.campus,g.id
  union all
  select 'calls','complete',g.campus,g.id,'incomplete',count(*) from public.jds_training_lessons l join groups g on g.id=l.group_id where l.status='published' and l.ends_at<=now() and exists(select 1 from public.jds_training_members m where m.group_id=g.id and not exists(select 1 from public.jds_training_attendance a where a.lesson_id=l.id and a.member_id=m.id)) group by g.campus,g.id
  union all
  select 'documents','draft',g.campus,g.id,'posts',count(*) from public.jds_training_posts p join groups g on g.id=p.group_id where p.status='draft' group by g.campus,g.id
  union all
  select 'planning','draft',g.campus,g.id,'lessons',count(*) from public.jds_training_lessons l join groups g on g.id=l.group_id where l.status='draft' group by g.campus,g.id
  union all
  select 'responsibilities','decision',coalesce(r.campus,'CORE + INDUSTRY'),null,r.account_status,count(*) from public.jds_responsibility_accounts() r where not r.enabled and(target_campus is null or r.campus is null or r.campus=target_campus) group by r.campus,r.account_status
  union all
  select 'periods','draft',null,null,'calendar',count(*) from public.jds_training_periods p where not p.published having count(*)>0
 ), agenda as (
  select l.id,g.campus,g.id group_id,l.title,l.teacher,l.room,l.starts_at,l.ends_at,'formation' kind from public.jds_training_lessons l join groups g on g.id=l.group_id where l.status='published' and(l.starts_at at time zone 'Europe/Paris')::date=day
  union all
  select s.id,sc.code,null,s.title,null,st.name,s.starts_at,s.starts_at+s.duration_min*interval '1 minute',s.kind from public.jds_sessions s join public.jds_schools sc on sc.id=s.school_id left join public.jds_studios st on st.id=s.studio_id where target_group is null and sc.code=any(allowed) and(target_campus is null or sc.code=target_campus) and s.status not in ('draft','cancelled','canceled') and(s.starts_at at time zone 'Europe/Paris')::date=day
 )
 select jsonb_build_object(
  'generated_at',now(),'date',day,'term',target_term,'campuses',to_jsonb(allowed),'central',public.is_admin(),
  'can_teacher_ranking',public.jds_teacher_ranking_access(),
  'name',(select coalesce(nullif(p.full_name,''),nullif(p.alias,''),'Direction School') from public.profiles p where p.id=auth.uid()),
  'groups',(select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'campus',g.campus,'name',g.name,'season',g.season) order by g.campus,g.name),'[]'::jsonb) from public.jds_training_groups g where g.campus=any(allowed)),
  'actions',(select coalesce(jsonb_agg(jsonb_build_object('key',a.key,'bucket',a.bucket,'campus',a.campus,'group_id',a.group_id,'detail',a.detail,'count',a.amount) order by a.bucket,a.campus,a.group_id,a.key),'[]'::jsonb) from actions a),
  'agenda',(select coalesce(jsonb_agg(to_jsonb(a) order by a.starts_at,a.campus),'[]'::jsonb) from agenda a),
  'members',(select count(*) from public.jds_training_members m join groups g on g.id=m.group_id),
  'linked_members',(select count(*) from public.jds_training_members m join groups g on g.id=m.group_id where m.profile_id is not null),
  'published_bulletins',(select count(distinct r.member_id) from public.jds_bulletin_reports r join public.jds_training_members m on m.id=r.member_id join groups g on g.id=m.group_id where r.term=target_term),
  'rental_imports',(select coalesce(jsonb_agg(jsonb_build_object('month',i.month,'imported_at',i.imported_at)),'[]'::jsonb) from public.jds_rental_source_imports i where i.active and 'CORE'=any(allowed)),
  'payments_ready',false
 ) into result;
 return result;
end $$;
revoke all on function public.jds_school_cockpit(text,uuid,integer,date) from public,anon,authenticated;
grant execute on function public.jds_school_cockpit(text,uuid,integer,date) to authenticated;
notify pgrst,'reload schema';
