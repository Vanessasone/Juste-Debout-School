ALTER TABLE public.jds_access_requests DROP CONSTRAINT jds_access_requests_kind_check;
ALTER TABLE public.jds_access_requests ADD CONSTRAINT jds_access_requests_kind_check CHECK(kind IN ('teacher','team','student','open'));
ALTER TABLE public.jds_access_requests ADD COLUMN group_id uuid REFERENCES public.jds_training_groups(id), ADD COLUMN linked_person_id uuid REFERENCES public.jds_private_directory(id);
ALTER TABLE public.jds_access_requests ADD CONSTRAINT student_request_group CHECK((kind='student' AND group_id IS NOT NULL) OR (kind<>'student' AND group_id IS NULL));
CREATE INDEX access_request_group ON public.jds_access_requests(group_id);
CREATE INDEX access_request_person ON public.jds_access_requests(linked_person_id);
CREATE OR REPLACE FUNCTION school_private.can_review_access(school text,request_kind text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_admin()
 OR (request_kind IN ('student','open') AND public.jds_can_manage_school(school))
 OR EXISTS(SELECT 1 FROM public.jds_school_responsibilities r WHERE r.profile_id=auth.uid() AND r.enabled AND (r.campus IS NULL OR r.campus=school)
 AND (r.email IN ('nicolas@juste-debout.com','bruceykanji1@gmail.com') OR (request_kind='teacher' AND r.email IN ('loic@juste-debout.com','rabah@juste-debout.com')))))
$$;
CREATE FUNCTION public.jds_enrollment_classes() RETURNS TABLE(id uuid,campus text,name text,season text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT id,campus,name,season FROM public.jds_training_groups WHERE auth.uid() IS NOT NULL ORDER BY season DESC,campus,name $$;
CREATE FUNCTION public.jds_submit_student_request(path text,school text,training_group uuid DEFAULT NULL,open_classes text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE request_kind text; class_description text; result uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirme ton adresse email avant de faire une demande.'; END IF;
 IF path IS NULL OR path NOT IN ('open','formation') OR school IS NULL OR school NOT IN ('CORE','INDUSTRY') THEN RAISE EXCEPTION 'Parcours ou école invalide.'; END IF;
 request_kind:=CASE WHEN path='formation' THEN 'student' ELSE 'open' END;
 IF path='formation' THEN
 SELECT name||' · '||season INTO class_description FROM public.jds_training_groups WHERE id=training_group AND campus=school;
 IF class_description IS NULL THEN RAISE EXCEPTION 'Choisis une classe de cette école.'; END IF;
 ELSE
 IF training_group IS NOT NULL OR nullif(btrim(open_classes),'') IS NULL OR length(open_classes)>500 THEN RAISE EXCEPTION 'Indique tes cours ou disciplines (500 caractères maximum).'; END IF;
 class_description:=btrim(open_classes);
 END IF;
 INSERT INTO public.jds_access_requests(profile_id,kind,campus,disciplines,group_id)
 VALUES(auth.uid(),request_kind,school,class_description,training_group)
 ON CONFLICT(profile_id,kind,campus) DO UPDATE SET disciplines=excluded.disciplines,group_id=excluded.group_id,status='pending',requested_at=now(),reviewed_at=NULL,reviewed_by=NULL,review_note=NULL,linked_person_id=NULL
 WHERE jds_access_requests.status='rejected' RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM public.jds_access_requests WHERE profile_id=auth.uid() AND kind=request_kind AND campus=school; END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.jds_student_request_candidates(request_id uuid) RETURNS TABLE(person_id uuid,student_name text,already_linked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT d.id,d.first_name||' '||d.last_name,m.profile_id IS NOT NULL AND m.profile_id<>r.profile_id
 FROM public.jds_access_requests r JOIN public.jds_training_members m ON m.group_id=r.group_id JOIN public.jds_private_directory d ON d.id=m.person_id
 WHERE r.id=request_id AND r.kind='student' AND r.status='pending' AND r.profile_id<>auth.uid() AND school_private.can_review_access(r.campus,r.kind)
 ORDER BY d.last_name,d.first_name
$$;
CREATE OR REPLACE FUNCTION public.jds_guard_training_account_link() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (tg_op='INSERT' AND new.profile_id IS NOT NULL) OR (tg_op='UPDATE' AND new.profile_id IS DISTINCT FROM old.profile_id) THEN
 IF NOT public.is_admin() AND NOT EXISTS(SELECT 1 FROM public.jds_access_requests r WHERE r.kind='student' AND r.status='approved' AND r.profile_id=new.profile_id AND r.group_id=new.group_id AND r.linked_person_id=new.person_id AND school_private.can_review_access(r.campus,'student')) THEN RAISE EXCEPTION 'Valide la demande de cet élève et sa fiche avant de rattacher le compte.'; END IF;
 END IF;
 RETURN new;
END $$;
CREATE FUNCTION public.jds_review_student_request(request_id uuid,decision text,person uuid DEFAULT NULL,note text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.jds_access_requests; m public.jds_training_members; requested_season text;
BEGIN
 SELECT * INTO r FROM public.jds_access_requests WHERE id=request_id FOR UPDATE;
 IF r.id IS NULL OR r.kind NOT IN ('student','open') OR NOT school_private.can_review_access(r.campus,r.kind) OR r.profile_id=auth.uid() THEN RAISE EXCEPTION 'Validation réservée à la team admin de cette école.'; END IF;
 IF decision IS NULL OR decision NOT IN ('approved','rejected') OR length(coalesce(note,''))>1000 OR r.status<>'pending' THEN RAISE EXCEPTION 'Décision invalide ou demande déjà traitée.'; END IF;
 IF decision='approved' AND r.kind='student' THEN
 -- Serialize concurrent approvals for the same account across classes.
 PERFORM 1 FROM public.profiles WHERE id=r.profile_id FOR UPDATE;
 SELECT * INTO m FROM public.jds_training_members WHERE group_id=r.group_id AND person_id=person FOR UPDATE;
 IF m.id IS NULL OR (m.profile_id IS NOT NULL AND m.profile_id<>r.profile_id) OR NOT EXISTS(SELECT 1 FROM public.jds_private_directory d WHERE d.id=person AND d.campus=r.campus AND d.person_type='student') THEN RAISE EXCEPTION 'Sélectionne la bonne fiche élève de cette classe ; un compte déjà rattaché ne peut pas être remplacé.'; END IF;
 SELECT season INTO requested_season FROM public.jds_training_groups WHERE id=r.group_id;
 IF EXISTS(SELECT 1 FROM public.jds_training_members other JOIN public.jds_training_groups g ON g.id=other.group_id WHERE other.profile_id=r.profile_id AND g.season=requested_season AND other.id<>m.id) THEN RAISE EXCEPTION 'Ce compte est déjà rattaché à une autre classe pour cette saison. Contacte l’administration.'; END IF;
 UPDATE public.jds_private_directory SET review_status='verified',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=person;
 END IF;
 UPDATE public.jds_access_requests SET status=decision,review_note=btrim(coalesce(note,'')),reviewed_at=now(),reviewed_by=auth.uid(),linked_person_id=CASE WHEN decision='approved' AND r.kind='student' THEN person ELSE NULL END WHERE id=r.id;
 IF decision='approved' AND r.kind='student' THEN UPDATE public.jds_training_members SET profile_id=r.profile_id WHERE id=m.id; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.jds_access_reviewer_campuses() RETURNS text[] LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(array_agg(s),ARRAY[]::text[]) FROM unnest(ARRAY['CORE','INDUSTRY']) s WHERE school_private.can_review_access(s,'teacher') OR school_private.can_review_access(s,'student')
$$;
REVOKE ALL ON FUNCTION public.jds_enrollment_classes(),public.jds_submit_student_request(text,text,uuid,text),public.jds_student_request_candidates(uuid),public.jds_review_student_request(uuid,text,uuid,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.jds_enrollment_classes(),public.jds_submit_student_request(text,text,uuid,text),public.jds_student_request_candidates(uuid),public.jds_review_student_request(uuid,text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.jds_review_access_request(request_id uuid,decision text,note text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.jds_access_requests;
BEGIN
 SELECT * INTO r FROM public.jds_access_requests WHERE id=request_id FOR UPDATE;
 IF r.id IS NULL OR NOT school_private.can_review_access(r.campus,r.kind) THEN RAISE EXCEPTION 'Validation réservée aux responsables autorisés.'; END IF;
 IF r.kind IN ('student','open') THEN RAISE EXCEPTION 'Utilise la validation des élèves.'; END IF;
 IF r.profile_id=auth.uid() THEN RAISE EXCEPTION 'Tu ne peux pas valider ta propre demande.'; END IF;
 IF decision IS NULL OR decision NOT IN ('approved','rejected') OR length(coalesce(note,''))>1000 THEN RAISE EXCEPTION 'Décision invalide.'; END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'Cette demande a déjà été traitée.'; END IF;
 UPDATE public.jds_access_requests SET status=decision,review_note=btrim(coalesce(note,'')),reviewed_at=now(),reviewed_by=auth.uid() WHERE id=r.id;
 -- Teacher approval is scoped to the campus in this record. It grants no global admin role.
 -- Team permissions continue through the explicit responsibilities/account-link workflow.
END $$;
