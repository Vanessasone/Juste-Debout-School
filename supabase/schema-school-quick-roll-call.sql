BEGIN;
ALTER TABLE public.jds_training_lessons ADD COLUMN bulletin_subject_id uuid REFERENCES public.jds_bulletin_subjects(id);
CREATE UNIQUE INDEX school_roll_call_session ON public.jds_training_lessons(bulletin_subject_id,starts_at)
 WHERE bulletin_subject_id IS NOT NULL AND status='published';

CREATE FUNCTION public.jds_record_quick_roll_call(subject_key uuid, day date, begins time, ends time, roster jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.jds_bulletin_subjects; lesson uuid; starts timestamptz; finishes timestamptz;
BEGIN
 SELECT * INTO s FROM public.jds_bulletin_subjects WHERE id=subject_key;
 PERFORM 1 FROM public.jds_training_groups WHERE id=s.group_id FOR UPDATE;
 IF NOT coalesce(school_private.bulletin_can_grade(subject_key),false) THEN RAISE EXCEPTION 'Accès à cette matière refusé.'; END IF;
 IF day IS NULL OR begins IS NULL OR ends IS NULL OR ends<=begins OR day>(now() AT TIME ZONE 'Europe/Paris')::date
 OR jsonb_typeof(roster) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Vérifie la date et les horaires du cours.'; END IF;
 IF jsonb_array_length(roster)=0 OR EXISTS(
   SELECT 1 FROM jsonb_to_recordset(roster) a(member_id uuid,status text)
   LEFT JOIN public.jds_training_members m ON m.id=a.member_id AND m.group_id=s.group_id
   WHERE m.id IS NULL OR a.status IS NULL OR a.status NOT IN('present','absent','late')
 ) OR EXISTS(SELECT 1 FROM jsonb_to_recordset(roster) a(member_id uuid) GROUP BY member_id HAVING count(*)>1)
 OR jsonb_array_length(roster)<>(SELECT count(*) FROM public.jds_training_members WHERE group_id=s.group_id)
 THEN RAISE EXCEPTION 'Renseigne le statut de tous les élèves de la classe.'; END IF;
 starts:=(day+begins) AT TIME ZONE 'Europe/Paris'; finishes:=(day+ends) AT TIME ZONE 'Europe/Paris';
 IF EXISTS(SELECT 1 FROM public.jds_training_lessons l WHERE l.group_id=s.group_id AND l.starts_at=starts AND l.status='published' AND l.bulletin_subject_id IS NULL)
 THEN RAISE EXCEPTION 'Un cours existe déjà à cette heure dans le planning. Utilise la feuille d’appel de ce cours dans Formation & promotions.'; END IF;

 INSERT INTO public.jds_training_lessons(group_id,title,teacher,starts_at,ends_at,status,bulletin_subject_id)
 VALUES(s.group_id,s.subject,s.teacher_name,starts,finishes,'published',s.id)
 ON CONFLICT (bulletin_subject_id,starts_at) WHERE bulletin_subject_id IS NOT NULL AND status='published' DO NOTHING
 RETURNING id INTO lesson;
 IF lesson IS NULL THEN RAISE EXCEPTION 'L’appel de ce cours est déjà enregistré. L’administration peut le corriger dans Formation & promotions.'; END IF;
 INSERT INTO public.jds_training_attendance(lesson_id,member_id,status)
 SELECT lesson,a.member_id,a.status FROM jsonb_to_recordset(roster) a(member_id uuid,status text);
END $$;

CREATE FUNCTION public.jds_quick_roll_call_for_day(subject_key uuid, day date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH lessons AS (
  SELECT l.id FROM public.jds_training_lessons l
  WHERE l.bulletin_subject_id=subject_key AND l.status='published' AND (l.starts_at AT TIME ZONE 'Europe/Paris')::date=day
    AND school_private.bulletin_can_grade(subject_key)
 )
 SELECT CASE WHEN (SELECT count(*) FROM lessons)=1 THEN (
  SELECT coalesce(jsonb_agg(jsonb_build_object('member_id',a.member_id,'presence',CASE WHEN a.status IN ('absent','excused') THEN 'absent' ELSE 'present' END)),'[]'::jsonb)
  FROM public.jds_training_attendance a JOIN lessons l ON l.id=a.lesson_id
 ) ELSE '[]'::jsonb END;
$$;
REVOKE ALL ON FUNCTION public.jds_record_quick_roll_call(uuid,date,time,time,jsonb), public.jds_quick_roll_call_for_day(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_record_quick_roll_call(uuid,date,time,time,jsonb), public.jds_quick_roll_call_for_day(uuid,date) TO authenticated;

-- Recheck actual attendance when approving a grade sheet linked unambiguously by subject and date.
CREATE FUNCTION school_private.check_sheet_against_roll_call()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE matching_count integer; lesson_key uuid;
BEGIN
 IF NEW.state='approved' AND OLD.state IS DISTINCT FROM NEW.state THEN
  SELECT count(*),(array_agg(id))[1] INTO matching_count,lesson_key FROM public.jds_training_lessons
   WHERE bulletin_subject_id=NEW.subject_id AND status='published' AND (starts_at AT TIME ZONE 'Europe/Paris')::date=NEW.lesson_date;
  IF matching_count>1 THEN RAISE EXCEPTION 'Plusieurs appels existent pour cette matière à cette date. L’association à la séance doit être vérifiée.'; END IF;
  IF matching_count=1 AND EXISTS(
   SELECT 1 FROM jsonb_to_recordset(NEW.entries) e(member_id uuid,presence text,grade numeric)
    JOIN public.jds_training_attendance a ON a.lesson_id=lesson_key AND a.member_id=e.member_id
    WHERE (e.presence='present' AND a.status IN('absent','excused')) OR (e.presence='absent' AND a.status IN('present','late'))
  ) THEN RAISE EXCEPTION 'Les présences ne correspondent pas à l’appel enregistré. Renvoie la feuille pour correction.'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION school_private.check_sheet_against_roll_call() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER school_check_sheet_roll_call BEFORE UPDATE OF state ON public.jds_bulletin_sheets
FOR EACH ROW EXECUTE FUNCTION school_private.check_sheet_against_roll_call();
COMMIT;
