BEGIN;

CREATE TABLE public.jds_bulletin_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.jds_bulletin_subjects(id),
  kind text NOT NULL CHECK (kind IN ('cc','exam')),
  lesson_date date NOT NULL,
  entries jsonb NOT NULL,
  state text NOT NULL CHECK (state IN ('draft','pending','returned','approved')),
  revision integer NOT NULL DEFAULT 1,
  feedback text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  UNIQUE (subject_id, kind, lesson_date)
);
CREATE UNIQUE INDEX jds_bulletin_one_exam ON public.jds_bulletin_sheets(subject_id) WHERE kind='exam';
ALTER TABLE public.jds_bulletin_sheets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jds_bulletin_sheets FROM anon, authenticated;

CREATE FUNCTION school_private.can_review_bulletin_sheet(school text)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_admin() OR EXISTS (
   SELECT 1 FROM public.jds_school_responsibilities r
   WHERE r.enabled AND r.profile_id=auth.uid() AND (r.campus IS NULL OR r.campus=school)
     AND split_part(lower(r.email),'@',1) IN ('nicolas','jacky')
 ));
$$;

CREATE FUNCTION public.jds_get_bulletin_sheets(subject_key uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE can_review boolean;
BEGIN
 IF NOT coalesce(school_private.bulletin_can_grade(subject_key),false) THEN
   RAISE EXCEPTION 'Accès à cette matière refusé.';
 END IF;
 SELECT school_private.can_review_bulletin_sheet(g.campus) INTO can_review
 FROM public.jds_bulletin_subjects s JOIN public.jds_training_groups g ON g.id=s.group_id WHERE s.id=subject_key;
 RETURN jsonb_build_object('can_review',can_review,'sheets',coalesce((
   SELECT jsonb_agg(to_jsonb(s) - 'created_by' - 'reviewed_by' ORDER BY s.lesson_date DESC)
   FROM public.jds_bulletin_sheets s WHERE s.subject_id=subject_key
 ),'[]'::jsonb));
END $$;

CREATE FUNCTION public.jds_pending_bulletin_sheets(class_key uuid, trimester integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'subject_id',s.id,'subject',s.subject,
   'teacher',s.teacher_name,'kind',b.kind,'lesson_date',b.lesson_date) ORDER BY b.lesson_date,s.subject),'[]'::jsonb)
 FROM public.jds_training_groups g JOIN public.jds_bulletin_subjects s ON s.group_id=g.id
 JOIN public.jds_bulletin_sheets b ON b.subject_id=s.id
 WHERE g.id=class_key AND s.term=trimester AND s.active AND b.state='pending'
   AND school_private.can_review_bulletin_sheet(g.campus);
$$;

CREATE FUNCTION public.jds_write_bulletin_sheet(
 subject_key uuid, sheet_key uuid, sheet_kind text, day date, roster jsonb, send boolean, expected_revision integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE subject_row public.jds_bulletin_subjects; sheet public.jds_bulletin_sheets; result uuid;
BEGIN
 SELECT * INTO subject_row FROM public.jds_bulletin_subjects WHERE id=subject_key;
 PERFORM 1 FROM public.jds_training_groups WHERE id=subject_row.group_id FOR UPDATE;
 IF NOT coalesce(school_private.bulletin_can_grade(subject_key),false) THEN RAISE EXCEPTION 'Accès refusé.'; END IF;
 IF sheet_kind IS NULL OR sheet_kind NOT IN ('cc','exam') OR day IS NULL OR send IS NULL
   OR jsonb_typeof(roster) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Feuille incomplète.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(roster))
   OR EXISTS (
     SELECT 1 FROM jsonb_to_recordset(roster) a(member_id uuid,presence text,grade numeric,comment text)
     LEFT JOIN public.jds_training_members m ON m.id=a.member_id AND m.group_id=subject_row.group_id
     WHERE m.id IS NULL OR a.presence IS NULL OR a.presence NOT IN ('present','absent','unset')
        OR (a.grade IS NOT NULL AND (a.presence<>'present' OR NOT (a.grade BETWEEN 0 AND CASE WHEN sheet_kind='cc' THEN 5 ELSE 20 END)))
        OR length(coalesce(a.comment,''))>3000
        OR (send AND a.presence='unset')
        OR (send AND sheet_kind='exam' AND a.grade IS NOT NULL AND nullif(btrim(a.comment),'') IS NULL)
   ) OR EXISTS (
     SELECT 1 FROM jsonb_to_recordset(roster) a(member_id uuid) GROUP BY a.member_id HAVING count(*)>1
   ) THEN RAISE EXCEPTION 'Vérifie les présences, le barème et les appréciations trimestrielles. Chaque note trimestrielle exige une appréciation.'; END IF;
 IF send AND EXISTS (
   SELECT 1 FROM public.jds_training_members m WHERE m.group_id=subject_row.group_id
   AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset(roster) a(member_id uuid) WHERE a.member_id=m.id)
 ) THEN RAISE EXCEPTION 'Le groupe a changé. Actualise la feuille avant transmission.'; END IF;
 IF sheet_key IS NULL THEN
   INSERT INTO public.jds_bulletin_sheets(subject_id,kind,lesson_date,entries,state,created_by)
   VALUES(subject_key,sheet_kind,day,roster,CASE WHEN send THEN 'pending' ELSE 'draft' END,auth.uid())
   ON CONFLICT DO NOTHING RETURNING id INTO result;
   IF result IS NULL THEN RAISE EXCEPTION 'Une feuille existe déjà pour cette séance ou cette évaluation. Actualise pour la reprendre.'; END IF;
 ELSE
   SELECT * INTO sheet FROM public.jds_bulletin_sheets WHERE id=sheet_key AND subject_id=subject_key FOR UPDATE;
   IF sheet.id IS NULL OR sheet.revision IS DISTINCT FROM expected_revision OR sheet.kind<>sheet_kind OR sheet.state NOT IN ('draft','returned') THEN
     RAISE EXCEPTION 'Cette feuille a changé ou est déjà transmise. Actualise la page.';
   END IF;
   UPDATE public.jds_bulletin_sheets SET lesson_date=day,entries=roster,state=CASE WHEN send THEN 'pending' ELSE sheet.state END,
     revision=revision+1 WHERE id=sheet.id RETURNING id INTO result;
 END IF;
 RETURN result;
END $$;

CREATE FUNCTION public.jds_review_bulletin_sheet(sheet_key uuid, expected_revision integer, approve boolean, reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sheet public.jds_bulletin_sheets; school text; class_id uuid;
BEGIN
 SELECT g.id,g.campus INTO class_id,school FROM public.jds_bulletin_sheets b
 JOIN public.jds_bulletin_subjects s ON s.id=b.subject_id JOIN public.jds_training_groups g ON g.id=s.group_id WHERE b.id=sheet_key;
 IF class_id IS NULL OR NOT school_private.can_review_bulletin_sheet(school) THEN RAISE EXCEPTION 'Validation réservée aux responsables autorisés.'; END IF;
 PERFORM 1 FROM public.jds_training_groups WHERE id=class_id FOR UPDATE;
 SELECT * INTO sheet FROM public.jds_bulletin_sheets WHERE id=sheet_key FOR UPDATE;
 IF sheet.state<>'pending' OR sheet.revision IS DISTINCT FROM expected_revision OR approve IS NULL THEN
   RAISE EXCEPTION 'Cette feuille a déjà changé. Actualise la liste.';
 END IF;
 IF NOT approve AND (nullif(btrim(reason),'') IS NULL OR length(reason)>1000) THEN RAISE EXCEPTION 'Indique la correction attendue.'; END IF;
 UPDATE public.jds_bulletin_sheets SET state=CASE WHEN approve THEN 'approved' ELSE 'returned' END,
   feedback=CASE WHEN approve THEN '' ELSE btrim(reason) END, reviewed_by=auth.uid(),reviewed_at=now(),revision=revision+1 WHERE id=sheet.id;
 IF approve THEN
   INSERT INTO public.jds_bulletin_grades (subject_id,member_id,cc_scores,evaluation_scores,appreciation,submitted,updated_by)
   SELECT sheet.subject_id,a.member_id,CASE WHEN sheet.kind='cc' THEN ARRAY[a.grade] ELSE ARRAY[]::numeric[] END,
     CASE WHEN sheet.kind='exam' THEN ARRAY[a.grade] ELSE ARRAY[]::numeric[] END,CASE WHEN sheet.kind='exam' THEN coalesce(btrim(a.comment),'') ELSE '' END,true,auth.uid()
   FROM jsonb_to_recordset(sheet.entries) a(member_id uuid,presence text,grade numeric,comment text)
   JOIN public.jds_training_members m ON m.id=a.member_id AND m.group_id=class_id
   WHERE a.presence='present' AND a.grade IS NOT NULL
   ON CONFLICT(subject_id,member_id) DO UPDATE SET
     cc_scores=CASE WHEN sheet.kind='cc' THEN
       (CASE WHEN jds_bulletin_grades.submitted THEN jds_bulletin_grades.cc_scores ELSE ARRAY[]::numeric[] END)||excluded.cc_scores
       ELSE CASE WHEN jds_bulletin_grades.submitted THEN jds_bulletin_grades.cc_scores ELSE ARRAY[]::numeric[] END END,
     evaluation_scores=CASE WHEN sheet.kind='exam' THEN excluded.evaluation_scores
       ELSE CASE WHEN jds_bulletin_grades.submitted THEN jds_bulletin_grades.evaluation_scores ELSE ARRAY[]::numeric[] END END,
     cc_exempt=CASE WHEN sheet.kind='cc' THEN false ELSE jds_bulletin_grades.cc_exempt END,
     evaluation_exempt=CASE WHEN sheet.kind='exam' THEN false ELSE jds_bulletin_grades.evaluation_exempt END,
     appreciation=CASE WHEN sheet.kind='exam' THEN excluded.appreciation ELSE jds_bulletin_grades.appreciation END,
     submitted=true,revision=jds_bulletin_grades.revision+1,updated_by=auth.uid(),updated_at=now();
 END IF;
END $$;

REVOKE EXECUTE ON FUNCTION school_private.can_review_bulletin_sheet(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jds_get_bulletin_sheets(uuid), public.jds_pending_bulletin_sheets(uuid,integer),
 public.jds_write_bulletin_sheet(uuid,uuid,text,date,jsonb,boolean,integer),
 public.jds_review_bulletin_sheet(uuid,integer,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_get_bulletin_sheets(uuid), public.jds_pending_bulletin_sheets(uuid,integer),
 public.jds_write_bulletin_sheet(uuid,uuid,text,date,jsonb,boolean,integer),
 public.jds_review_bulletin_sheet(uuid,integer,boolean,text) TO authenticated;
DO $migration$
DECLARE definition text; anchor text := ' SELECT count(*) INTO total FROM public.jds_bulletin_subjects';
BEGIN
 SELECT pg_get_functiondef('school_private.bulletin_snapshot(uuid,integer)'::regprocedure) INTO definition;
 IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'La fonction de bulletin ne correspond pas à la version attendue.'; END IF;
 EXECUTE replace(definition,anchor,$guard$
 IF EXISTS(SELECT 1 FROM public.jds_bulletin_sheets b JOIN public.jds_bulletin_subjects s ON s.id=b.subject_id
   WHERE s.group_id=g.id AND s.term=target_term AND s.active AND b.state IN ('pending','returned')) THEN
   RAISE EXCEPTION 'Des feuilles de la classe attendent encore une validation ou une correction.';
 END IF;
$guard$ || anchor);
END $migration$;

-- Older clients may read historical marks, but new marks must pass through a sheet.
REVOKE EXECUTE ON FUNCTION public.jds_save_bulletin_grade(uuid,uuid,numeric[],numeric[],boolean,boolean,text,boolean,integer) FROM PUBLIC,anon,authenticated;
COMMIT;
