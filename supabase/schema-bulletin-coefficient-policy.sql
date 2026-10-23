-- School only. Vanessa's confirmed 4/2/1 rule; actual term course count is admin-confirmed.
ALTER TABLE public.jds_bulletin_subjects
 ADD COLUMN coefficient_category text CHECK(coefficient_category IN ('street','dance','theory')),
 ADD COLUMN taught_course_count integer CHECK(taught_course_count BETWEEN 0 AND 10000);

CREATE FUNCTION school_private.bulletin_subject_category(title text) RETURNS text
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 WITH label AS (SELECT regexp_replace(translate(upper(title),'ÉÈÊËÀÂÄÎÏÔÖÙÛÜÇ','EEEEAAAIIOOUUUC'),'[^A-Z0-9]','','g') AS v)
 SELECT CASE
 WHEN v IN ('BBOYING','BREAK','BREAKDANCE','BREAKING','HIPHOP','HIPHOPCHOREO','CHOREOCOMMERCIALHIPHOP','POPPING','LOCKING','HOUSE','HOUSEDANCE','HOUSEDANCECHOREOMODULE') THEN 'street'
 WHEN v IN ('ANATOMIE','HISTOIREDESMUSIQUES','HISTOIREDELAMUSIQUE','APPROCHEPEDAGOGIQUE','INDUSTRIECOMMERCIALE','INITIATIONMEDICALE') THEN 'theory'
 WHEN v IN ('ACADEMIQUETECHNIQUE','AFROHOUSE','BARREAUSOL','CLASSIQUE','DANCEHALL','DANSEAFRICAINE','DANSECLASSIQUE','ELECTRO','ETIREMENTSMODERNCONTACTIMPRO','ETIREMENTSMODERNJAZZ','EXPRESSIONSCENIQUE','FLOORWORKS','HEELS','JAZZ','JAZZROCK','KRUMP','MODERN','MODERNE','NDOMBOLOMODULE','SALSA','STREETJAZZFORMATAUDITION','TAPDANCE','TECHNIQUEACADEMIQUE','TECHNIQUESACADEMIQUES','URBANCONTEMPORAINMODULE','URBANCONTEMPORAIN','VOGUING','WHACKING') THEN 'dance'
 ELSE NULL END FROM label;
$$;
REVOKE ALL ON FUNCTION school_private.bulletin_subject_category(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION school_private.bulletin_subject_category(text) TO authenticated;

CREATE FUNCTION school_private.bulletin_apply_coefficient_policy() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE weight numeric;
BEGIN
 IF TG_OP='INSERT' AND NEW.coefficient_category IS NULL THEN
  NEW.coefficient_category:=school_private.bulletin_subject_category(NEW.subject);
 ELSIF TG_OP='UPDATE' AND NEW.subject IS DISTINCT FROM OLD.subject AND NEW.coefficient_category IS NOT DISTINCT FROM OLD.coefficient_category THEN
  NEW.coefficient_category:=school_private.bulletin_subject_category(NEW.subject);
  NEW.taught_course_count:=NULL; -- a renamed subject needs its own actual count confirmed
 END IF;
 weight:=CASE WHEN NEW.taught_course_count BETWEEN 0 AND 2 THEN 0
  WHEN NEW.coefficient_category='street' THEN 4
  WHEN NEW.coefficient_category='dance' THEN 2
  WHEN NEW.coefficient_category='theory' THEN 1 ELSE NULL END;
 NEW.cc_coefficient:=weight; NEW.evaluation_coefficient:=weight;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION school_private.bulletin_apply_coefficient_policy() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER bulletin_coefficient_policy BEFORE INSERT OR UPDATE ON public.jds_bulletin_subjects
 FOR EACH ROW EXECUTE FUNCTION school_private.bulletin_apply_coefficient_policy();

UPDATE public.jds_bulletin_subjects s SET
 coefficient_category=school_private.bulletin_subject_category(s.subject),updated_at=now()
FROM public.jds_training_groups g WHERE g.id=s.group_id AND g.campus IN ('CORE','INDUSTRY');

CREATE FUNCTION public.jds_save_bulletin_subject_policy(target_group uuid,target_term integer,title text,teacher uuid,teacher_label text,category text,taught_courses integer,sort_position integer DEFAULT 0,subject_key uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid; school text;
BEGIN
 SELECT campus INTO school FROM public.jds_training_groups WHERE id=target_group FOR UPDATE;
 IF auth.uid() IS NULL OR school IS NULL OR NOT public.jds_can_manage_school(school) THEN
  RAISE EXCEPTION 'Configuration réservée à l’administration de cette école.';
 END IF;
 IF category IS NOT NULL AND category NOT IN ('street','dance','theory') THEN RAISE EXCEPTION 'Choisis une catégorie valide.'; END IF;
 IF taught_courses IS NOT NULL AND taught_courses NOT BETWEEN 0 AND 10000 THEN RAISE EXCEPTION 'Renseigne un nombre entier de cours réellement dispensés, ou laisse vide si inconnu.'; END IF;
 result:=public.jds_save_bulletin_subject(target_group,target_term,title,teacher,teacher_label,NULL,NULL,sort_position,subject_key);
 UPDATE public.jds_bulletin_subjects SET coefficient_category=category,taught_course_count=taught_courses,updated_at=now() WHERE id=result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.jds_save_bulletin_subject_policy(uuid,integer,text,uuid,text,text,integer,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_save_bulletin_subject_policy(uuid,integer,text,uuid,text,text,integer,integer,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION school_private.bulletin_snapshot(student_member uuid, target_term integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE g public.jds_training_groups; d public.jds_bulletin_drafts; student_name text; total integer;rows jsonb;cc_mean numeric;eval_mean numeric;
BEGIN
 SELECT gr.* INTO g FROM public.jds_training_members m JOIN public.jds_training_groups gr ON gr.id=m.group_id WHERE m.id=student_member;
 IF auth.uid() IS NULL OR g.id IS NULL OR NOT public.jds_can_manage_school(g.campus) THEN RAISE EXCEPTION 'Accès administratif requis.';END IF;
 SELECT p.first_name||' '||p.last_name INTO student_name FROM public.jds_training_members m JOIN public.jds_private_directory p ON p.id=m.person_id WHERE m.id=student_member;
 SELECT * INTO d FROM public.jds_bulletin_drafts WHERE member_id=student_member AND term=target_term;
 IF d.member_id IS NULL OR nullif(btrim(d.summary),'') IS NULL OR d.justified_absences IS NULL OR d.unjustified_absences IS NULL THEN RAISE EXCEPTION 'Renseigne la synthèse et vérifie les deux nombres d’absences (0 si aucune).';END IF;
 SELECT count(*) INTO total FROM public.jds_bulletin_subjects WHERE active AND group_id=g.id AND term=target_term;
 IF total=0 THEN RAISE EXCEPTION 'Ajoute les matières de ce trimestre.';END IF;
 IF EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s WHERE s.active AND s.group_id=g.id AND s.term=target_term AND s.taught_course_count IS NULL) THEN RAISE EXCEPTION 'Vérifie le nombre de cours réellement dispensés pour chaque matière du trimestre.';END IF;
 IF EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s WHERE s.active AND s.group_id=g.id AND s.term=target_term AND s.taught_course_count>=3 AND (s.cc_coefficient IS NULL OR s.evaluation_coefficient IS NULL OR s.teacher_profile IS NULL OR nullif(btrim(s.teacher_name),'') IS NULL OR NOT EXISTS(SELECT 1 FROM public.jds_access_requests r WHERE r.profile_id=s.teacher_profile AND r.kind='teacher' AND r.status='approved' AND r.campus=g.campus))) THEN RAISE EXCEPTION 'Vérifie les professeurs affectés et les coefficients de toutes les matières.';END IF;
 IF EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s LEFT JOIN public.jds_bulletin_grades b ON b.subject_id=s.id AND b.member_id=student_member WHERE s.active AND s.group_id=g.id AND s.term=target_term AND s.taught_course_count>=3 AND (b.member_id IS NULL OR NOT b.submitted OR nullif(btrim(b.appreciation),'') IS NULL OR (s.cc_coefficient>0 AND NOT b.cc_exempt AND cardinality(b.cc_scores)=0) OR(s.evaluation_coefficient>0 AND NOT b.evaluation_exempt AND cardinality(b.evaluation_scores)=0))) THEN RAISE EXCEPTION 'Des évaluations sont manquantes ou n’ont pas encore été transmises.';END IF;
 WITH score_values AS(SELECT s.subject,s.teacher_name,s.sort_order,s.taught_course_count,s.coefficient_category,s.cc_coefficient,s.evaluation_coefficient,b.appreciation,b.cc_exempt,b.evaluation_exempt,CASE WHEN NOT b.cc_exempt THEN(SELECT avg(v) FROM unnest(b.cc_scores)v) END AS cc5,CASE WHEN NOT b.evaluation_exempt THEN(SELECT avg(v) FROM unnest(b.evaluation_scores)v) END AS ev20 FROM public.jds_bulletin_subjects s LEFT JOIN public.jds_bulletin_grades b ON b.subject_id=s.id AND b.member_id=student_member WHERE s.active AND s.group_id=g.id AND s.term=target_term)
 SELECT jsonb_agg(jsonb_build_object('subject',subject,'teacher',teacher_name,'cc5',round(cc5,2),'cc20',round(cc5*4,2),'cc_coefficient',cc_coefficient,'evaluation20',round(ev20,2),'evaluation_coefficient',evaluation_coefficient,'cc_exempt',cc_exempt,'evaluation_exempt',evaluation_exempt,'appreciation',appreciation,'taught_course_count',taught_course_count,'coefficient_category',coefficient_category,'excluded_low_course_count',taught_course_count<=2) ORDER BY sort_order,subject),
 round(sum(cc5*4*cc_coefficient) FILTER(WHERE cc5 IS NOT NULL AND cc_coefficient>0)/nullif(sum(cc_coefficient) FILTER(WHERE cc5 IS NOT NULL AND cc_coefficient>0),0),2),
 round(sum(ev20*evaluation_coefficient) FILTER(WHERE ev20 IS NOT NULL AND evaluation_coefficient>0)/nullif(sum(evaluation_coefficient) FILTER(WHERE ev20 IS NOT NULL AND evaluation_coefficient>0),0),2)
 INTO rows,cc_mean,eval_mean FROM score_values;
 RETURN jsonb_build_object('school_name','Juste Debout School '||g.campus,'campus',g.campus,'address',CASE WHEN g.campus='CORE' THEN '3 rue de l’Est, 75020 Paris' ELSE '27 boulevard de la Somme, 75017 Paris' END,'class_name',g.name,'season',g.season,'term',target_term,'student_name',student_name,'rows',rows,'cc_average20',cc_mean,'evaluation_average20',eval_mean,'justified_absences',d.justified_absences,'unjustified_absences',d.unjustified_absences,'summary',d.summary);
END $function$
;
CREATE OR REPLACE FUNCTION school_private.student_rankings_engine()
 RETURNS TABLE(member_id uuid, group_id uuid, grade_count bigint, grade_mean20 numeric, grade_score100 numeric, bonus_points bigint, absence_penalty numeric, attendance_score numeric, global_score numeric, grade_rank bigint, attendance_rank bigint, global_rank bigint, warning_required boolean, recorded_courses bigint, missing_calls bigint, pending_justifications bigint, unsubmitted_subjects bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with members as (
 select m.id,m.group_id from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id
 -- Internal engine: all cohorts for daily snapshots; public wrappers enforce identity/campus.
 where true
 ), grades as (
 -- Only submitted marks with confirmed >=3 taught courses and an explicit category enter rankings.
 -- CC /5 is converted to /20. Zero marks count; exemptions, drafts and archived subjects do not.
 select m.id,count(*) filter(where marks.weight>0 and marks.value is not null) grade_count,
 sum(marks.value*marks.weight)/nullif(sum(marks.weight) filter(where marks.value is not null and marks.weight>0),0) grade_mean20
 from members m join public.jds_bulletin_grades b on b.member_id=m.id and b.submitted
 join public.jds_bulletin_subjects s on s.id=b.subject_id and s.group_id=m.group_id and s.active and s.taught_course_count>=3 and s.coefficient_category IS NOT NULL
 cross join lateral(
 select v*4 value,s.cc_coefficient weight from unnest(b.cc_scores) v where not b.cc_exempt and s.cc_coefficient>0
 union all
 select v value,s.evaluation_coefficient weight from unnest(b.evaluation_scores) v where not b.evaluation_exempt and s.evaluation_coefficient>0
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
 (select count(*) from public.jds_bulletin_subjects s where s.group_id=m.group_id and s.active and (s.taught_course_count IS NULL OR s.taught_course_count>=3) and (s.taught_course_count IS NULL OR s.coefficient_category IS NULL OR not exists(select 1 from public.jds_bulletin_grades b where b.subject_id=s.id and b.member_id=m.id and b.submitted))) unsubmitted_subjects
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
$function$
;
