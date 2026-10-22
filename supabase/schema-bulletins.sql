-- Private School report cards. No grades or student records are public.
CREATE TABLE public.jds_bulletin_subjects(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),group_id uuid NOT NULL REFERENCES public.jds_training_groups(id),term smallint NOT NULL CHECK(term BETWEEN 1 AND 3),
 subject text NOT NULL CHECK(length(btrim(subject)) BETWEEN 1 AND 150),teacher_profile uuid REFERENCES public.profiles(id),teacher_name text NOT NULL DEFAULT '' CHECK(length(teacher_name)<=150),
 cc_coefficient numeric CHECK(cc_coefficient>=0 AND cc_coefficient<1000),evaluation_coefficient numeric CHECK(evaluation_coefficient>=0 AND evaluation_coefficient<1000),sort_order integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(group_id,term,subject));
CREATE INDEX bulletin_subject_teacher ON public.jds_bulletin_subjects(teacher_profile);
CREATE TABLE public.jds_bulletin_grades(
 subject_id uuid NOT NULL REFERENCES public.jds_bulletin_subjects(id),member_id uuid NOT NULL REFERENCES public.jds_training_members(id),
 cc_scores numeric[] NOT NULL DEFAULT '{}',evaluation_scores numeric[] NOT NULL DEFAULT '{}',cc_exempt boolean NOT NULL DEFAULT false,evaluation_exempt boolean NOT NULL DEFAULT false,
 appreciation text NOT NULL DEFAULT '' CHECK(length(appreciation)<=3000),submitted boolean NOT NULL DEFAULT false,revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),updated_by uuid REFERENCES public.profiles(id),PRIMARY KEY(subject_id,member_id));
CREATE INDEX bulletin_grade_member ON public.jds_bulletin_grades(member_id);
CREATE INDEX bulletin_grade_actor ON public.jds_bulletin_grades(updated_by);
CREATE TABLE public.jds_bulletin_drafts(
 member_id uuid NOT NULL REFERENCES public.jds_training_members(id),term smallint NOT NULL CHECK(term BETWEEN 1 AND 3),summary text NOT NULL DEFAULT '' CHECK(length(summary)<=5000),
 justified_absences integer CHECK(justified_absences BETWEEN 0 AND 10000),unjustified_absences integer CHECK(unjustified_absences BETWEEN 0 AND 10000),revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),updated_by uuid REFERENCES public.profiles(id),PRIMARY KEY(member_id,term));
CREATE INDEX bulletin_draft_actor ON public.jds_bulletin_drafts(updated_by);
CREATE TABLE public.jds_bulletin_reports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),member_id uuid NOT NULL REFERENCES public.jds_training_members(id),term smallint NOT NULL CHECK(term BETWEEN 1 AND 3),version integer NOT NULL,
 snapshot jsonb NOT NULL,published_at timestamptz NOT NULL DEFAULT now(),published_by uuid NOT NULL REFERENCES public.profiles(id),UNIQUE(member_id,term,version));
CREATE INDEX bulletin_report_publisher ON public.jds_bulletin_reports(published_by);
CREATE TABLE public.jds_bulletin_notices(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL REFERENCES public.profiles(id),report_id uuid NOT NULL UNIQUE REFERENCES public.jds_bulletin_reports(id),created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz);
CREATE INDEX bulletin_notice_owner ON public.jds_bulletin_notices(profile_id,read_at);
CREATE TABLE public.jds_bulletin_audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor uuid REFERENCES public.profiles(id),at timestamptz NOT NULL DEFAULT now(),entity text NOT NULL,record_key text NOT NULL,old_value jsonb,new_value jsonb);
CREATE INDEX bulletin_audit_actor ON public.jds_bulletin_audit(actor);
CREATE FUNCTION school_private.bulletin_can_publish(school text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_admin() OR EXISTS(SELECT 1 FROM public.jds_school_responsibilities r WHERE r.profile_id=auth.uid() AND r.enabled AND (r.campus IS NULL OR r.campus=school) AND r.email IN ('rabah@juste-debout.com','loic@juste-debout.com','nicolas@juste-debout.com','bruceykanji1@gmail.com')))
$$;
CREATE FUNCTION school_private.bulletin_can_grade(subject_key uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s JOIN public.jds_training_groups g ON g.id=s.group_id WHERE s.id=subject_key AND (public.jds_can_manage_school(g.campus) OR (s.teacher_profile=auth.uid() AND EXISTS(SELECT 1 FROM public.jds_access_requests r WHERE r.profile_id=auth.uid() AND r.kind='teacher' AND r.status='approved' AND r.campus=g.campus))))
$$;
CREATE FUNCTION school_private.bulletin_audit_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN INSERT INTO public.jds_bulletin_audit(actor,entity,record_key,old_value,new_value) VALUES(auth.uid(),tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'member_id'),CASE WHEN tg_op='UPDATE' THEN to_jsonb(old) ELSE NULL END,to_jsonb(new));RETURN new;END $$;
CREATE FUNCTION school_private.bulletin_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'Un bulletin publié est immuable. Publie une nouvelle version.';END $$;
CREATE TRIGGER bulletin_subject_audit AFTER INSERT OR UPDATE ON public.jds_bulletin_subjects FOR EACH ROW EXECUTE FUNCTION school_private.bulletin_audit_change();
CREATE TRIGGER bulletin_grade_audit AFTER INSERT OR UPDATE ON public.jds_bulletin_grades FOR EACH ROW EXECUTE FUNCTION school_private.bulletin_audit_change();
CREATE TRIGGER bulletin_draft_audit AFTER INSERT OR UPDATE ON public.jds_bulletin_drafts FOR EACH ROW EXECUTE FUNCTION school_private.bulletin_audit_change();
CREATE TRIGGER bulletin_report_immutable BEFORE UPDATE OR DELETE ON public.jds_bulletin_reports FOR EACH ROW EXECUTE FUNCTION school_private.bulletin_immutable();
ALTER TABLE public.jds_bulletin_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jds_bulletin_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jds_bulletin_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jds_bulletin_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jds_bulletin_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jds_bulletin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jds_bulletin_subjects,public.jds_bulletin_grades,public.jds_bulletin_drafts,public.jds_bulletin_reports,public.jds_bulletin_notices,public.jds_bulletin_audit FROM public,anon,authenticated;
GRANT SELECT ON public.jds_bulletin_subjects,public.jds_bulletin_grades,public.jds_bulletin_drafts,public.jds_bulletin_reports,public.jds_bulletin_notices TO authenticated;
CREATE POLICY bulletin_subject_read ON public.jds_bulletin_subjects FOR SELECT TO authenticated USING(school_private.bulletin_can_grade(id));
CREATE POLICY bulletin_grade_read ON public.jds_bulletin_grades FOR SELECT TO authenticated USING(school_private.bulletin_can_grade(subject_id));
CREATE POLICY bulletin_draft_read ON public.jds_bulletin_drafts FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.jds_training_members m JOIN public.jds_training_groups g ON g.id=m.group_id WHERE m.id=member_id AND public.jds_can_manage_school(g.campus)));
CREATE POLICY bulletin_report_read ON public.jds_bulletin_reports FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.jds_training_members m JOIN public.jds_training_groups g ON g.id=m.group_id WHERE m.id=member_id AND (m.profile_id=(SELECT auth.uid()) OR public.jds_can_manage_school(g.campus))));
CREATE POLICY bulletin_notice_read ON public.jds_bulletin_notices FOR SELECT TO authenticated USING(profile_id=(SELECT auth.uid()));
CREATE FUNCTION public.jds_bulletin_context() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('groups',coalesce((SELECT jsonb_agg(x) FROM(SELECT g.id,g.campus,g.name,g.season,CASE WHEN public.jds_can_manage_school(g.campus) THEN ARRAY[1,2,3] ELSE ARRAY(SELECT DISTINCT s.term::integer FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND school_private.bulletin_can_grade(s.id) ORDER BY s.term::integer) END AS available_terms,public.jds_can_manage_school(g.campus) AS can_manage,school_private.bulletin_can_publish(g.campus) AS can_publish FROM public.jds_training_groups g WHERE auth.uid() IS NOT NULL AND (public.jds_can_manage_school(g.campus) OR EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND school_private.bulletin_can_grade(s.id))) ORDER BY g.campus,g.name,g.season DESC)x),'[]'::jsonb),
 'teachers',coalesce((SELECT jsonb_agg(x) FROM(SELECT DISTINCT p.id,coalesce(nullif(p.full_name,''),p.alias,'Professeur School') AS name,r.campus FROM public.profiles p JOIN public.jds_access_requests r ON r.profile_id=p.id WHERE r.kind='teacher' AND r.status='approved' AND public.jds_can_manage_school(r.campus))x),'[]'::jsonb),
 'reports',coalesce((SELECT jsonb_agg(x ORDER BY x.published_at DESC) FROM(SELECT b.id,b.term,b.version,b.published_at,b.snapshot->>'school_name' AS school_name,b.snapshot->>'class_name' AS class_name FROM public.jds_bulletin_reports b JOIN public.jds_training_members m ON m.id=b.member_id WHERE auth.uid() IS NOT NULL AND m.profile_id=auth.uid())x),'[]'::jsonb))
$$;
CREATE FUNCTION public.jds_bulletin_group(target_group uuid,target_term integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.jds_training_groups; manager boolean;
BEGIN
 SELECT * INTO g FROM public.jds_training_groups WHERE id=target_group;manager:=public.jds_can_manage_school(g.campus);
 IF auth.uid() IS NULL OR target_term NOT BETWEEN 1 AND 3 OR g.id IS NULL OR NOT(manager OR EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND s.term=target_term AND school_private.bulletin_can_grade(s.id))) THEN RAISE EXCEPTION 'Accès à cette classe refusé.';END IF;
 RETURN jsonb_build_object('group',to_jsonb(g),'can_manage',manager,'can_publish',school_private.bulletin_can_publish(g.campus),
 'subjects',coalesce((SELECT jsonb_agg(s ORDER BY s.sort_order,s.subject) FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND s.term=target_term AND school_private.bulletin_can_grade(s.id)),'[]'::jsonb),
 'members',coalesce((SELECT jsonb_agg(x ORDER BY x.name) FROM(SELECT m.id,d.first_name||' '||d.last_name AS name,m.profile_id IS NOT NULL AS linked FROM public.jds_training_members m JOIN public.jds_private_directory d ON d.id=m.person_id WHERE m.group_id=g.id)x),'[]'::jsonb),
 'grades',coalesce((SELECT jsonb_agg(b) FROM public.jds_bulletin_grades b JOIN public.jds_bulletin_subjects s ON s.id=b.subject_id WHERE s.group_id=g.id AND s.term=target_term AND school_private.bulletin_can_grade(s.id)),'[]'::jsonb),
 'drafts',CASE WHEN manager THEN coalesce((SELECT jsonb_agg(d) FROM public.jds_bulletin_drafts d JOIN public.jds_training_members m ON m.id=d.member_id WHERE m.group_id=g.id AND d.term=target_term),'[]'::jsonb) ELSE '[]'::jsonb END,
 'reports',CASE WHEN manager THEN coalesce((SELECT jsonb_agg(x) FROM(SELECT b.id,b.member_id,b.version,b.published_at FROM public.jds_bulletin_reports b JOIN public.jds_training_members m ON m.id=b.member_id WHERE m.group_id=g.id AND b.term=target_term)x),'[]'::jsonb) ELSE '[]'::jsonb END);
END $$;
CREATE FUNCTION public.jds_save_bulletin_subject(target_group uuid,target_term integer,title text,teacher uuid,teacher_label text,cc_weight numeric,eval_weight numeric,sort_position integer DEFAULT 0,subject_key uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.jds_training_groups; result uuid;
BEGIN
 SELECT * INTO g FROM public.jds_training_groups WHERE id=target_group FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.jds_can_manage_school(g.campus) OR g.id IS NULL THEN RAISE EXCEPTION 'Configuration réservée à l’administration de cette école.';END IF;
 IF teacher IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jds_access_requests r WHERE r.profile_id=teacher AND r.kind='teacher' AND r.status='approved' AND r.campus=g.campus) THEN RAISE EXCEPTION 'Le professeur doit être validé pour cette école.';END IF;
 IF subject_key IS NULL THEN
 INSERT INTO public.jds_bulletin_subjects(group_id,term,subject,teacher_profile,teacher_name,cc_coefficient,evaluation_coefficient,sort_order) VALUES(g.id,target_term,btrim(title),teacher,btrim(teacher_label),cc_weight,eval_weight,sort_position) RETURNING id INTO result;
 ELSE
 UPDATE public.jds_bulletin_subjects SET subject=btrim(title),teacher_profile=teacher,teacher_name=btrim(teacher_label),cc_coefficient=cc_weight,evaluation_coefficient=eval_weight,sort_order=sort_position,updated_at=now() WHERE id=subject_key AND group_id=g.id AND term=target_term RETURNING id INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'Matière introuvable dans ce trimestre.';END IF;
 END IF;RETURN result;
END $$;
CREATE FUNCTION public.jds_save_bulletin_grade(subject_key uuid,student_member uuid,cc numeric[],evaluations numeric[],no_cc boolean,no_evaluations boolean,comment text,send boolean,expected_revision integer DEFAULT 0) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.jds_bulletin_subjects;old_grade public.jds_bulletin_grades;manager boolean;
BEGIN
 SELECT * INTO s FROM public.jds_bulletin_subjects WHERE id=subject_key;
 PERFORM 1 FROM public.jds_training_groups WHERE id=s.group_id FOR UPDATE;
 SELECT * INTO s FROM public.jds_bulletin_subjects WHERE id=subject_key;
 IF auth.uid() IS NULL OR NOT school_private.bulletin_can_grade(s.id) OR NOT EXISTS(SELECT 1 FROM public.jds_training_members WHERE id=student_member AND group_id=s.group_id) THEN RAISE EXCEPTION 'Accès à cette matière ou cet élève refusé.';END IF;
 SELECT public.jds_can_manage_school(campus) INTO manager FROM public.jds_training_groups WHERE id=s.group_id;
 SELECT * INTO old_grade FROM public.jds_bulletin_grades WHERE subject_id=s.id AND member_id=student_member FOR UPDATE;
 IF coalesce(old_grade.revision,0)<>expected_revision THEN RAISE EXCEPTION 'La fiche a changé. Actualise avant de réenregistrer.';END IF;
 IF old_grade.submitted AND NOT manager THEN RAISE EXCEPTION 'Évaluation transmise. Demande une réouverture à l’administration.';END IF;
 IF cc IS NULL OR evaluations IS NULL OR cardinality(cc)>100 OR cardinality(evaluations)>100 OR EXISTS(SELECT 1 FROM unnest(cc) v WHERE v IS NULL OR NOT(v>=0 AND v<=5)) OR EXISTS(SELECT 1 FROM unnest(evaluations) v WHERE v IS NULL OR NOT(v>=0 AND v<=20)) OR no_cc IS NULL OR no_evaluations IS NULL OR send IS NULL OR comment IS NULL OR length(comment)>3000 OR (no_cc AND cardinality(cc)>0) OR(no_evaluations AND cardinality(evaluations)>0) THEN RAISE EXCEPTION 'Vérifie les notes et les champs non évalués.';END IF;
 IF send AND (nullif(btrim(comment),'') IS NULL OR (coalesce(s.cc_coefficient,1)>0 AND NOT no_cc AND cardinality(cc)=0) OR(coalesce(s.evaluation_coefficient,1)>0 AND NOT no_evaluations AND cardinality(evaluations)=0)) THEN RAISE EXCEPTION 'Complète les notes (ou indique non évalué) et l’appréciation avant transmission.';END IF;
 INSERT INTO public.jds_bulletin_grades(subject_id,member_id,cc_scores,evaluation_scores,cc_exempt,evaluation_exempt,appreciation,submitted,updated_by) VALUES(s.id,student_member,cc,evaluations,no_cc,no_evaluations,btrim(comment),send,auth.uid())
 ON CONFLICT(subject_id,member_id) DO UPDATE SET cc_scores=excluded.cc_scores,evaluation_scores=excluded.evaluation_scores,cc_exempt=excluded.cc_exempt,evaluation_exempt=excluded.evaluation_exempt,appreciation=excluded.appreciation,submitted=excluded.submitted,updated_at=now(),updated_by=auth.uid(),revision=jds_bulletin_grades.revision+1;
END $$;
CREATE FUNCTION public.jds_save_bulletin_draft(student_member uuid,target_term integer,director_summary text,justified integer,unjustified integer,expected_revision integer DEFAULT 0) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE grp uuid;school text;old_revision integer;
BEGIN
 SELECT m.group_id,g.campus INTO grp,school FROM public.jds_training_members m JOIN public.jds_training_groups g ON g.id=m.group_id WHERE m.id=student_member;
 PERFORM 1 FROM public.jds_training_groups WHERE id=grp FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.jds_can_manage_school(school) OR grp IS NULL THEN RAISE EXCEPTION 'Accès administratif requis.';END IF;
 SELECT revision INTO old_revision FROM public.jds_bulletin_drafts WHERE member_id=student_member AND term=target_term;
 IF coalesce(old_revision,0)<>expected_revision THEN RAISE EXCEPTION 'Le bulletin a changé. Actualise avant de réenregistrer.';END IF;
 INSERT INTO public.jds_bulletin_drafts(member_id,term,summary,justified_absences,unjustified_absences,updated_by) VALUES(student_member,target_term,btrim(director_summary),justified,unjustified,auth.uid())
 ON CONFLICT(member_id,term) DO UPDATE SET summary=excluded.summary,justified_absences=justified,unjustified_absences=unjustified,updated_at=now(),updated_by=auth.uid(),revision=jds_bulletin_drafts.revision+1;
END $$;
CREATE FUNCTION school_private.bulletin_snapshot(student_member uuid,target_term integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.jds_training_groups; d public.jds_bulletin_drafts; student_name text; total integer;rows jsonb;cc_mean numeric;eval_mean numeric;
BEGIN
 SELECT gr.* INTO g FROM public.jds_training_members m JOIN public.jds_training_groups gr ON gr.id=m.group_id WHERE m.id=student_member;
 IF auth.uid() IS NULL OR g.id IS NULL OR NOT public.jds_can_manage_school(g.campus) THEN RAISE EXCEPTION 'Accès administratif requis.';END IF;
 SELECT p.first_name||' '||p.last_name INTO student_name FROM public.jds_training_members m JOIN public.jds_private_directory p ON p.id=m.person_id WHERE m.id=student_member;
 SELECT * INTO d FROM public.jds_bulletin_drafts WHERE member_id=student_member AND term=target_term;
 IF d.member_id IS NULL OR nullif(btrim(d.summary),'') IS NULL OR d.justified_absences IS NULL OR d.unjustified_absences IS NULL THEN RAISE EXCEPTION 'Renseigne la synthèse et vérifie les deux nombres d’absences (0 si aucune).';END IF;
 SELECT count(*) INTO total FROM public.jds_bulletin_subjects WHERE group_id=g.id AND term=target_term;
 IF total=0 THEN RAISE EXCEPTION 'Ajoute les matières de ce trimestre.';END IF;
 IF EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND s.term=target_term AND (s.cc_coefficient IS NULL OR s.evaluation_coefficient IS NULL OR s.teacher_profile IS NULL OR nullif(btrim(s.teacher_name),'') IS NULL OR NOT EXISTS(SELECT 1 FROM public.jds_access_requests r WHERE r.profile_id=s.teacher_profile AND r.kind='teacher' AND r.status='approved' AND r.campus=g.campus))) THEN RAISE EXCEPTION 'Vérifie les professeurs affectés et les coefficients de toutes les matières.';END IF;
 IF EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s LEFT JOIN public.jds_bulletin_grades b ON b.subject_id=s.id AND b.member_id=student_member WHERE s.group_id=g.id AND s.term=target_term AND (b.member_id IS NULL OR NOT b.submitted OR nullif(btrim(b.appreciation),'') IS NULL OR (s.cc_coefficient>0 AND NOT b.cc_exempt AND cardinality(b.cc_scores)=0) OR(s.evaluation_coefficient>0 AND NOT b.evaluation_exempt AND cardinality(b.evaluation_scores)=0))) THEN RAISE EXCEPTION 'Des évaluations sont manquantes ou n’ont pas encore été transmises.';END IF;
 WITH score_values AS(SELECT s.subject,s.teacher_name,s.sort_order,s.cc_coefficient,s.evaluation_coefficient,b.appreciation,b.cc_exempt,b.evaluation_exempt,CASE WHEN NOT b.cc_exempt THEN(SELECT avg(v) FROM unnest(b.cc_scores)v) END AS cc5,CASE WHEN NOT b.evaluation_exempt THEN(SELECT avg(v) FROM unnest(b.evaluation_scores)v) END AS ev20 FROM public.jds_bulletin_subjects s JOIN public.jds_bulletin_grades b ON b.subject_id=s.id AND b.member_id=student_member WHERE s.group_id=g.id AND s.term=target_term)
 SELECT jsonb_agg(jsonb_build_object('subject',subject,'teacher',teacher_name,'cc5',round(cc5,2),'cc20',round(cc5*4,2),'cc_coefficient',cc_coefficient,'evaluation20',round(ev20,2),'evaluation_coefficient',evaluation_coefficient,'cc_exempt',cc_exempt,'evaluation_exempt',evaluation_exempt,'appreciation',appreciation) ORDER BY sort_order,subject),
 round(sum(cc5*4*cc_coefficient) FILTER(WHERE cc5 IS NOT NULL AND cc_coefficient>0)/nullif(sum(cc_coefficient) FILTER(WHERE cc5 IS NOT NULL AND cc_coefficient>0),0),2),
 round(sum(ev20*evaluation_coefficient) FILTER(WHERE ev20 IS NOT NULL AND evaluation_coefficient>0)/nullif(sum(evaluation_coefficient) FILTER(WHERE ev20 IS NOT NULL AND evaluation_coefficient>0),0),2)
 INTO rows,cc_mean,eval_mean FROM score_values;
 RETURN jsonb_build_object('school_name','Juste Debout School '||g.campus,'campus',g.campus,'address',CASE WHEN g.campus='CORE' THEN '3 rue de l’Est, 75020 Paris' ELSE '27 boulevard de la Somme, 75017 Paris' END,'class_name',g.name,'season',g.season,'term',target_term,'student_name',student_name,'rows',rows,'cc_average20',cc_mean,'evaluation_average20',eval_mean,'justified_absences',d.justified_absences,'unjustified_absences',d.unjustified_absences,'summary',d.summary);
END $$;
CREATE FUNCTION public.jds_preview_bulletin(student_member uuid,target_term integer) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT school_private.bulletin_snapshot(student_member,target_term) $$;
CREATE FUNCTION public.jds_publish_bulletin(student_member uuid,target_term integer,expected_version integer DEFAULT 0,correction_reason text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.jds_training_groups;payload jsonb;latest integer;report_id uuid;student_profile uuid;publisher text;
BEGIN
 SELECT gr.* INTO g FROM public.jds_training_members m JOIN public.jds_training_groups gr ON gr.id=m.group_id WHERE m.id=student_member;
 PERFORM 1 FROM public.jds_training_groups WHERE id=g.id FOR UPDATE;
 IF auth.uid() IS NULL OR g.id IS NULL OR NOT school_private.bulletin_can_publish(g.campus) THEN RAISE EXCEPTION 'Publication réservée à la direction de cette école.';END IF;
 SELECT coalesce(max(version),0) INTO latest FROM public.jds_bulletin_reports WHERE member_id=student_member AND term=target_term;
 IF latest<>expected_version THEN RAISE EXCEPTION 'Une autre version a été publiée. Actualise avant de continuer.';END IF;
 IF correction_reason IS NULL OR length(correction_reason)>1000 OR (latest>0 AND nullif(btrim(correction_reason),'') IS NULL) THEN RAISE EXCEPTION 'Indique le motif de correction pour publier une nouvelle version.';END IF;
 payload:=school_private.bulletin_snapshot(student_member,target_term);
 SELECT coalesce(nullif(full_name,''),alias,'Direction School') INTO publisher FROM public.profiles WHERE id=auth.uid();
 payload:=payload||jsonb_build_object('version',latest+1,'published_at',now(),'published_by',publisher,'correction_reason',btrim(correction_reason));
 INSERT INTO public.jds_bulletin_reports(member_id,term,version,snapshot,published_by) VALUES(student_member,target_term,latest+1,payload,auth.uid()) RETURNING id INTO report_id;
 SELECT profile_id INTO student_profile FROM public.jds_training_members WHERE id=student_member;
 IF student_profile IS NOT NULL THEN INSERT INTO public.jds_bulletin_notices(profile_id,report_id) VALUES(student_profile,report_id);END IF;
 RETURN report_id;
END $$;
CREATE FUNCTION public.jds_read_bulletin_notice(target_report uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ UPDATE public.jds_bulletin_notices SET read_at=now() WHERE profile_id=auth.uid() AND report_id=target_report AND auth.uid() IS NOT NULL $$;
-- Minimal authenticated RPC surface; all writes and decisions are checked server-side.
DO $$DECLARE f record;BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname IN ('jds_bulletin_context','jds_bulletin_group','jds_save_bulletin_subject','jds_save_bulletin_grade','jds_save_bulletin_draft','jds_preview_bulletin','jds_publish_bulletin','jds_read_bulletin_notice')) OR(n.nspname='school_private' AND p.proname IN ('bulletin_can_publish','bulletin_can_grade','bulletin_snapshot')) LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public,anon',f.signature);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION school_private.bulletin_audit_change(),school_private.bulletin_immutable() FROM public,anon,authenticated;
