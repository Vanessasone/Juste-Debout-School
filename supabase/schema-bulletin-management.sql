-- Reversible subject removal and multiple teachers per discipline.
ALTER TABLE public.jds_bulletin_subjects ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE public.jds_bulletin_subjects DROP CONSTRAINT jds_bulletin_subjects_group_id_term_subject_key;
ALTER TABLE public.jds_bulletin_subjects ADD CONSTRAINT bulletin_subject_teacher_unique UNIQUE(group_id,term,subject,teacher_name);

CREATE OR REPLACE FUNCTION school_private.bulletin_can_grade(subject_key uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s JOIN public.jds_training_groups g ON g.id=s.group_id WHERE s.id=subject_key AND s.active AND (public.jds_can_manage_school(g.campus) OR (s.teacher_profile=auth.uid() AND EXISTS(SELECT 1 FROM public.jds_access_requests r WHERE r.profile_id=auth.uid() AND r.kind='teacher' AND r.status='approved' AND r.campus=g.campus))))
$$;
CREATE OR REPLACE FUNCTION public.jds_bulletin_group(target_group uuid,target_term integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.jds_training_groups; manager boolean;
BEGIN
 SELECT * INTO g FROM public.jds_training_groups WHERE id=target_group;manager:=public.jds_can_manage_school(g.campus);
 IF auth.uid() IS NULL OR target_term NOT BETWEEN 1 AND 3 OR g.id IS NULL OR NOT(manager OR EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND s.term=target_term AND school_private.bulletin_can_grade(s.id))) THEN RAISE EXCEPTION 'Accès à cette classe refusé.';END IF;
 RETURN jsonb_build_object('group',to_jsonb(g),'can_manage',manager,'can_publish',school_private.bulletin_can_publish(g.campus),
 'subjects',coalesce((SELECT jsonb_agg(s ORDER BY s.sort_order,s.subject) FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND s.term=target_term AND school_private.bulletin_can_grade(s.id)),'[]'::jsonb),
 'archived_subjects',CASE WHEN manager THEN coalesce((SELECT jsonb_agg(s ORDER BY s.sort_order,s.subject,s.teacher_name) FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND s.term=target_term AND NOT s.active),'[]'::jsonb) ELSE '[]'::jsonb END,
 'members',coalesce((SELECT jsonb_agg(x ORDER BY x.name) FROM(SELECT m.id,d.first_name||' '||d.last_name AS name,m.profile_id IS NOT NULL AS linked FROM public.jds_training_members m JOIN public.jds_private_directory d ON d.id=m.person_id WHERE m.group_id=g.id)x),'[]'::jsonb),
 'grades',coalesce((SELECT jsonb_agg(b) FROM public.jds_bulletin_grades b JOIN public.jds_bulletin_subjects s ON s.id=b.subject_id WHERE s.group_id=g.id AND s.term=target_term AND school_private.bulletin_can_grade(s.id)),'[]'::jsonb),
 'drafts',CASE WHEN manager THEN coalesce((SELECT jsonb_agg(d) FROM public.jds_bulletin_drafts d JOIN public.jds_training_members m ON m.id=d.member_id WHERE m.group_id=g.id AND d.term=target_term),'[]'::jsonb) ELSE '[]'::jsonb END,
 'reports',CASE WHEN manager THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT b.id,b.member_id,b.version,b.published_at FROM public.jds_bulletin_reports b JOIN public.jds_training_members m ON m.id=b.member_id WHERE m.group_id=g.id AND b.term=target_term)x),'[]'::jsonb) ELSE '[]'::jsonb END);
END $$;
CREATE OR REPLACE FUNCTION school_private.bulletin_snapshot(student_member uuid,target_term integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.jds_training_groups; d public.jds_bulletin_drafts; student_name text; total integer;rows jsonb;cc_mean numeric;eval_mean numeric;
BEGIN
 SELECT gr.* INTO g FROM public.jds_training_members m JOIN public.jds_training_groups gr ON gr.id=m.group_id WHERE m.id=student_member;
 IF auth.uid() IS NULL OR g.id IS NULL OR NOT public.jds_can_manage_school(g.campus) THEN RAISE EXCEPTION 'Accès administratif requis.';END IF;
 SELECT p.first_name||' '||p.last_name INTO student_name FROM public.jds_training_members m JOIN public.jds_private_directory p ON p.id=m.person_id WHERE m.id=student_member;
 SELECT * INTO d FROM public.jds_bulletin_drafts WHERE member_id=student_member AND term=target_term;
 IF d.member_id IS NULL OR nullif(btrim(d.summary),'') IS NULL OR d.justified_absences IS NULL OR d.unjustified_absences IS NULL THEN RAISE EXCEPTION 'Renseigne la synthèse et vérifie les deux nombres d’absences (0 si aucune).';END IF;
 SELECT count(*) INTO total FROM public.jds_bulletin_subjects WHERE active AND group_id=g.id AND term=target_term;
 IF total=0 THEN RAISE EXCEPTION 'Ajoute les matières de ce trimestre.';END IF;
 IF EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s WHERE s.active AND s.group_id=g.id AND s.term=target_term AND (s.cc_coefficient IS NULL OR s.evaluation_coefficient IS NULL OR s.teacher_profile IS NULL OR nullif(btrim(s.teacher_name),'') IS NULL OR NOT EXISTS(SELECT 1 FROM public.jds_access_requests r WHERE r.profile_id=s.teacher_profile AND r.kind='teacher' AND r.status='approved' AND r.campus=g.campus))) THEN RAISE EXCEPTION 'Vérifie les professeurs affectés et les coefficients de toutes les matières.';END IF;
 IF EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s LEFT JOIN public.jds_bulletin_grades b ON b.subject_id=s.id AND b.member_id=student_member WHERE s.active AND s.group_id=g.id AND s.term=target_term AND (b.member_id IS NULL OR NOT b.submitted OR nullif(btrim(b.appreciation),'') IS NULL OR (s.cc_coefficient>0 AND NOT b.cc_exempt AND cardinality(b.cc_scores)=0) OR(s.evaluation_coefficient>0 AND NOT b.evaluation_exempt AND cardinality(b.evaluation_scores)=0))) THEN RAISE EXCEPTION 'Des évaluations sont manquantes ou n’ont pas encore été transmises.';END IF;
 WITH score_values AS(SELECT s.subject,s.teacher_name,s.sort_order,s.cc_coefficient,s.evaluation_coefficient,b.appreciation,b.cc_exempt,b.evaluation_exempt,CASE WHEN NOT b.cc_exempt THEN(SELECT avg(v) FROM unnest(b.cc_scores)v) END AS cc5,CASE WHEN NOT b.evaluation_exempt THEN(SELECT avg(v) FROM unnest(b.evaluation_scores)v) END AS ev20 FROM public.jds_bulletin_subjects s JOIN public.jds_bulletin_grades b ON b.subject_id=s.id AND b.member_id=student_member WHERE s.active AND s.group_id=g.id AND s.term=target_term)
 SELECT jsonb_agg(jsonb_build_object('subject',subject,'teacher',teacher_name,'cc5',round(cc5,2),'cc20',round(cc5*4,2),'cc_coefficient',cc_coefficient,'evaluation20',round(ev20,2),'evaluation_coefficient',evaluation_coefficient,'cc_exempt',cc_exempt,'evaluation_exempt',evaluation_exempt,'appreciation',appreciation) ORDER BY sort_order,subject),
 round(sum(cc5*4*cc_coefficient) FILTER(WHERE cc5 IS NOT NULL AND cc_coefficient>0)/nullif(sum(cc_coefficient) FILTER(WHERE cc5 IS NOT NULL AND cc_coefficient>0),0),2),
 round(sum(ev20*evaluation_coefficient) FILTER(WHERE ev20 IS NOT NULL AND evaluation_coefficient>0)/nullif(sum(evaluation_coefficient) FILTER(WHERE ev20 IS NOT NULL AND evaluation_coefficient>0),0),2)
 INTO rows,cc_mean,eval_mean FROM score_values;
 RETURN jsonb_build_object('school_name','Juste Debout School '||g.campus,'campus',g.campus,'address',CASE WHEN g.campus='CORE' THEN '3 rue de l’Est, 75020 Paris' ELSE '27 boulevard de la Somme, 75017 Paris' END,'class_name',g.name,'season',g.season,'term',target_term,'student_name',student_name,'rows',rows,'cc_average20',cc_mean,'evaluation_average20',eval_mean,'justified_absences',d.justified_absences,'unjustified_absences',d.unjustified_absences,'summary',d.summary);
END $$;
CREATE FUNCTION public.jds_set_bulletin_subject_active(subject_key uuid,enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE grp uuid; school text;
BEGIN
 SELECT s.group_id,g.campus INTO grp,school FROM public.jds_bulletin_subjects s JOIN public.jds_training_groups g ON g.id=s.group_id WHERE s.id=subject_key;
 IF auth.uid() IS NULL OR grp IS NULL OR NOT public.jds_can_manage_school(school) THEN RAISE EXCEPTION 'Modification réservée à l’administration de cette école.';END IF;
 IF enabled IS NULL THEN RAISE EXCEPTION 'Choisis activer ou retirer.';END IF;
 PERFORM 1 FROM public.jds_training_groups WHERE id=grp FOR UPDATE;
 UPDATE public.jds_bulletin_subjects SET active=enabled,updated_at=now() WHERE id=subject_key AND active IS DISTINCT FROM enabled;
END $$;
REVOKE ALL ON FUNCTION public.jds_set_bulletin_subject_active(uuid,boolean) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.jds_set_bulletin_subject_active(uuid,boolean) TO authenticated;
