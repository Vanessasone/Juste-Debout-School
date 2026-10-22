begin;
do $$declare admin_id uuid;grp uuid:=gen_random_uuid();person uuid:=gen_random_uuid();member uuid;lesson uuid;request uuid;r record;i integer;begin
 select id into admin_id from public.profiles where 'admin'=any(roles) limit 1;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 insert into public.jds_training_groups(id,campus,name,season) values(grp,'INDUSTRY','Test weighted absences','test');
 insert into public.jds_private_directory(id,external_key,campus,person_type,first_name,last_name) values(person,person::text,'INDUSTRY','student','Test','Weighted');
 insert into public.jds_training_members(group_id,person_id) values(grp,person) returning id into member;
 for i in 0..2 loop
 insert into public.jds_training_lessons(group_id,title,starts_at,ends_at,status) values(grp,'Test course',timestamptz '2026-09-01 09:00+02'+i*interval '2 hours',timestamptz '2026-09-01 10:00+02'+i*interval '2 hours','published') returning id into lesson;
 insert into public.jds_training_attendance(lesson_id,member_id,status) values(lesson,member,'absent');
 end loop;
 select * into r from public.jds_student_attendance_summary() where member_id=member;
 if r.weighted_absences<>3 or r.raw_absences<>3 or r.warning_required then raise exception 'Full day must count as 3';end if;
 insert into public.jds_absence_requests(member_id,starts_on,ends_on,proof_path,proof_name,status,submitted_by,reviewed_by,reviewed_at) values(member,'2026-09-01','2026-09-01',gen_random_uuid()::text,'Test fixture','approved',admin_id,admin_id,now()) returning id into request;
 select * into r from public.jds_student_attendance_summary() where member_id=member;
 if r.weighted_absences<>1.5 or r.justified_absences<>3 then raise exception 'Justified day must count as 1.5';end if;
 for i in 1..27 loop
 insert into public.jds_training_lessons(group_id,title,starts_at,ends_at,status) values(grp,'Test course',timestamptz '2026-09-01 09:00+02'+i*interval '1 day',timestamptz '2026-09-01 10:00+02'+i*interval '1 day','published') returning id into lesson;
 insert into public.jds_training_attendance(lesson_id,member_id,status) values(lesson,member,'excused');
 end loop;
 select * into r from public.jds_student_attendance_summary() where member_id=member;
 if r.weighted_absences<>28.5 then raise exception 'Excused marker without validated proof must not reduce count';end if;
 update public.jds_absence_requests set ends_on='2026-09-30' where id=request;
 select * into r from public.jds_student_attendance_summary() where member_id=member;
 if r.weighted_absences<>15 or not r.warning_required then raise exception '30 justified courses must reach weighted threshold 15';end if;
 update public.jds_training_attendance set status='present' where lesson_id=lesson and member_id=member;
 select * into r from public.jds_student_attendance_summary() where member_id=member;
 if r.weighted_absences<>14.5 or r.warning_required then raise exception 'Correction must recalculate threshold';end if;
 insert into public.jds_training_lessons(group_id,title,starts_at,ends_at,status) values(grp,'Missing call','2026-08-01 09:00+02','2026-08-01 10:00+02','published');
 insert into public.jds_training_lessons(group_id,title,starts_at,ends_at,status) values(grp,'Future','2030-08-01 09:00+02','2030-08-01 10:00+02','published');
 update public.jds_training_lessons set status='cancelled' where id=lesson;
 select * into r from public.jds_student_attendance_summary() where member_id=member;
 if r.weighted_absences<>14.5 or r.missing_calls<>1 or r.recorded_courses<>29 then raise exception 'Future, cancelled and missing call handling';end if;
 update public.jds_absence_requests set status='pending',reviewed_at=null,reviewed_by=null where id=request;
 select * into r from public.jds_student_attendance_summary() where member_id=member;
 if r.weighted_absences<>29 or r.pending_justifications<>29 then raise exception 'Pending proof must remain provisional at 1';end if;
 if has_function_privilege('anon','public.jds_student_attendance_summary()','EXECUTE') then raise exception 'Anonymous access';end if;
end $$;
rollback;
