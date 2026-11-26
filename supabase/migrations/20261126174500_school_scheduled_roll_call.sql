CREATE OR REPLACE FUNCTION public.jds_my_next_teaching_session()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',l.id,'title',l.title,'starts_at',l.starts_at,'room',l.room,'campus',g.campus,'promotion',g.name)
 FROM public.jds_training_lessons l
 JOIN public.jds_bulletin_subjects s ON s.id=l.bulletin_subject_id AND s.group_id=l.group_id
 JOIN public.jds_training_groups g ON g.id=l.group_id
 WHERE s.teacher_profile=auth.uid() AND l.status='published' AND l.ends_at>now()
 AND school_private.bulletin_can_grade(s.id)
 ORDER BY l.starts_at,l.id LIMIT 1;
$$;

CREATE FUNCTION public.jds_scheduled_roll_call(lesson_key uuid, roster jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 lesson public.jds_training_lessons;
 subject_key uuid;
BEGIN
 SELECT l.* INTO lesson FROM public.jds_training_lessons l
 JOIN public.jds_bulletin_subjects s ON s.id=l.bulletin_subject_id AND s.group_id=l.group_id
 WHERE l.id=lesson_key AND l.status='published' AND s.teacher_profile=auth.uid()
 AND school_private.bulletin_can_grade(s.id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Cette séance est annulée ou ne t’est pas attribuée.'; END IF;
 subject_key:=lesson.bulletin_subject_id;
 IF roster IS NOT NULL THEN
   PERFORM 1 FROM public.jds_training_groups WHERE id=lesson.group_id FOR UPDATE;
   PERFORM 1 FROM public.jds_bulletin_subjects s WHERE s.id=subject_key
     AND s.teacher_profile=auth.uid() AND school_private.bulletin_can_grade(s.id) FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Cette séance ne t’est plus attribuée.'; END IF;
   SELECT l.* INTO lesson FROM public.jds_training_lessons l WHERE l.id=lesson_key
     AND l.bulletin_subject_id=subject_key AND l.status='published' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Cette séance a été modifiée ou annulée.'; END IF;
   IF lesson.starts_at>now() THEN RAISE EXCEPTION 'L’appel est disponible à partir de l’heure du cours.'; END IF;
   PERFORM public.jds_record_quick_roll_call(subject_key,
    (lesson.starts_at AT TIME ZONE 'Europe/Paris')::date,
    (lesson.starts_at AT TIME ZONE 'Europe/Paris')::time,
    (lesson.ends_at AT TIME ZONE 'Europe/Paris')::time, roster);
 END IF;
 RETURN jsonb_build_object(
   'can_record', lesson.starts_at<=now(),
   'recorded', EXISTS(SELECT 1 FROM public.jds_training_attendance WHERE lesson_id=lesson_key),
   'members', coalesce((
     SELECT jsonb_agg(jsonb_build_object('id',m.id,'name',concat_ws(' ',d.first_name,d.last_name),'status',a.status)
                      ORDER BY d.last_name,d.first_name,m.id)
     FROM public.jds_training_members m JOIN public.jds_private_directory d ON d.id=m.person_id
     LEFT JOIN public.jds_training_attendance a ON a.lesson_id=lesson_key AND a.member_id=m.id
     WHERE m.group_id=lesson.group_id
   ),'[]'::jsonb)
 );
END;
$$;
REVOKE ALL ON FUNCTION public.jds_scheduled_roll_call(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_scheduled_roll_call(uuid,jsonb) TO authenticated;
