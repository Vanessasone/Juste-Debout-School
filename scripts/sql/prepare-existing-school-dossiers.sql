-- Administrative preparation explicitly requested by Vanessa.
-- Idempotent: existing dossiers, rules and finance accounts are never overwritten.
-- No invitation, admission decision, activation or financial confirmation.
begin;
create temporary table school_preparation_counts(kind text primary key,n integer) on commit drop;
do $$
declare author uuid; n integer;
begin
 select u.id into author from auth.users u join public.profiles p on p.id=u.id
 where lower(u.email)='vanessa@juste-debout.com' and u.email_confirmed_at is not null;
 if author is null then raise exception 'Verified requesting author not found';end if;
 if exists(select 1 from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id left join public.jds_private_directory d on d.id=m.person_id where g.campus in ('CORE','INDUSTRY') and g.season='2026-2027' and d.id is null) then raise exception 'Missing source directory record';end if;
 with made as (
  insert into public.jds_enrollment_rules(group_id,training_title,updated_by)
  select g.id,'Formation professionnelle '||g.campus||' · '||g.name||' · '||g.season,author
  from public.jds_training_groups g where g.campus in ('CORE','INDUSTRY') and g.season='2026-2027'
  and exists(select 1 from public.jds_training_members m where m.group_id=g.id)
  on conflict(group_id) do nothing returning *
 ), audited as (
  insert into public.jds_enrollment_events(group_id,actor_id,kind,snapshot)
  select group_id,author,'existing_students_rules_draft',jsonb_build_object('source','Existing School groups; requested by Vanessa','rules',to_jsonb(made)) from made returning id
 ) select count(*) into n from audited;
 insert into school_preparation_counts values('new_promotion_drafts',n);
 with made as (
  insert into public.jds_enrollments(member_id,target_email,phone,created_by)
  select m.id,coalesce(lower(btrim(d.email)),''),coalesce(d.phone,''),author
  from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id join public.jds_private_directory d on d.id=m.person_id
  where g.campus in ('CORE','INDUSTRY') and g.season='2026-2027'
  and (nullif(btrim(d.email),'') is null or lower(btrim(d.email)) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
  on conflict(member_id) do nothing returning *
 ), audited as (
  insert into public.jds_enrollment_events(enrollment_id,group_id,actor_id,kind,snapshot)
  select made.id,m.group_id,author,'existing_student_draft_prepared',jsonb_build_object('source','Existing private directory and formation roster; requested by Vanessa','enrollment',to_jsonb(made)-'token_hash','identity_confirmed',false,'financial_information_confirmed',false)
  from made join public.jds_training_members m on m.id=made.member_id returning id
 ) select count(*) into n from audited;
 insert into school_preparation_counts values('new_student_drafts',n);
end $$;
-- Catch incomplete joins or unexpected preparation state before commit.
do $$ begin
 if exists(select 1 from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id left join public.jds_enrollments e on e.member_id=m.id where g.campus in ('CORE','INDUSTRY') and g.season='2026-2027' and e.id is null) then raise exception 'Some dossiers were not prepared';end if;
 if exists(select 1 from public.jds_enrollment_events ev join public.jds_enrollments e on e.id=ev.enrollment_id where ev.kind='existing_student_draft_prepared' and ev.recorded_at>=transaction_timestamp() and (e.status<>'draft' or e.token_hash is not null or e.admitted_at is not null or e.validated_at is not null or e.profile_id is not null or e.acknowledged)) then raise exception 'Preparation must remain unconfirmed';end if;
end $$;
select jsonb_build_object('created',(select jsonb_object_agg(kind,n) from school_preparation_counts),'promotions',(select jsonb_agg(x) from (select g.campus,g.name,count(*) dossiers,count(nullif(e.target_email,'')) emails,count(nullif(e.phone,'')) phones from public.jds_enrollments e join public.jds_training_members m on m.id=e.member_id join public.jds_training_groups g on g.id=m.group_id where g.campus in ('CORE','INDUSTRY') and g.season='2026-2027' group by g.id order by g.campus,g.name)x));
commit;
