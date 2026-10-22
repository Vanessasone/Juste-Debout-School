-- Dedicated School: function choice is a preference, never an authorization claim.
CREATE TABLE public.jds_function_choices (
 profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 function text NOT NULL CHECK(function IN ('open','student','teacher','team')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jds_function_choices ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.jds_function_choices TO authenticated;
CREATE POLICY function_choice_read ON public.jds_function_choices FOR SELECT TO authenticated USING(profile_id=(SELECT auth.uid()));
CREATE POLICY function_choice_insert ON public.jds_function_choices FOR INSERT TO authenticated WITH CHECK(profile_id=(SELECT auth.uid()));
CREATE POLICY function_choice_update ON public.jds_function_choices FOR UPDATE TO authenticated USING(profile_id=(SELECT auth.uid())) WITH CHECK(profile_id=(SELECT auth.uid()));
CREATE TABLE public.jds_access_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('teacher','team')),
 campus text NOT NULL CHECK(campus IN ('CORE','INDUSTRY')),
 disciplines text NOT NULL DEFAULT '' CHECK(length(disciplines)<=500),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 reviewed_by uuid REFERENCES public.profiles(id),
 review_note text CHECK(length(review_note)<=1000),
 UNIQUE(profile_id,kind,campus)
);
CREATE INDEX school_access_pending ON public.jds_access_requests(campus,status);
CREATE FUNCTION school_private.can_review_access(school text,request_kind text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_admin() OR EXISTS(
 SELECT 1 FROM public.jds_school_responsibilities r
 WHERE r.profile_id=auth.uid() AND r.enabled
 AND (r.campus IS NULL OR r.campus=school)
 AND (r.email IN ('nicolas@juste-debout.com','bruceykanji1@gmail.com')
 OR (request_kind='teacher' AND r.email IN ('loic@juste-debout.com','rabah@juste-debout.com')))))
$$;
REVOKE ALL ON FUNCTION school_private.can_review_access(text,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION school_private.can_review_access(text,text) TO authenticated;
ALTER TABLE public.jds_access_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jds_access_requests FROM public,anon,authenticated;
GRANT SELECT ON public.jds_access_requests TO authenticated;
CREATE POLICY access_requests_read ON public.jds_access_requests FOR SELECT TO authenticated
USING(profile_id=(SELECT auth.uid()) OR school_private.can_review_access(campus,kind));
CREATE FUNCTION public.jds_submit_access_request(request_kind text,school text,subjects text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirme ton adresse email avant de faire une demande.'; END IF;
 IF request_kind NOT IN ('teacher','team') OR school NOT IN ('CORE','INDUSTRY') OR request_kind IS NULL OR school IS NULL THEN RAISE EXCEPTION 'Fonction ou école invalide.'; END IF;
 IF length(coalesce(subjects,''))>500 OR (request_kind='teacher' AND btrim(coalesce(subjects,''))='') THEN RAISE EXCEPTION 'Indique tes disciplines (500 caractères maximum).'; END IF;
 INSERT INTO public.jds_access_requests(profile_id,kind,campus,disciplines)
 VALUES(auth.uid(),request_kind,school,btrim(coalesce(subjects,'')))
 ON CONFLICT(profile_id,kind,campus) DO UPDATE SET
 disciplines=excluded.disciplines,status='pending',requested_at=now(),reviewed_at=NULL,reviewed_by=NULL,review_note=NULL
 WHERE jds_access_requests.status='rejected'
 RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM public.jds_access_requests WHERE profile_id=auth.uid() AND kind=request_kind AND campus=school; END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.jds_review_access_request(request_id uuid,decision text,note text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.jds_access_requests;
BEGIN
 SELECT * INTO r FROM public.jds_access_requests WHERE id=request_id FOR UPDATE;
 IF r.id IS NULL OR NOT school_private.can_review_access(r.campus,r.kind) THEN RAISE EXCEPTION 'Validation réservée aux responsables autorisés.'; END IF;
 IF r.profile_id=auth.uid() THEN RAISE EXCEPTION 'Tu ne peux pas valider ta propre demande.'; END IF;
 IF decision IS NULL OR decision NOT IN ('approved','rejected') OR length(coalesce(note,''))>1000 THEN RAISE EXCEPTION 'Décision invalide.'; END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'Cette demande a déjà été traitée.'; END IF;
 UPDATE public.jds_access_requests SET status=decision,review_note=btrim(coalesce(note,'')),reviewed_at=now(),reviewed_by=auth.uid() WHERE id=r.id;
 -- Teacher approval is scoped to the campus in this record. It grants no global admin role.
 -- Team permissions continue through the explicit responsibilities/account-link workflow.
END $$;
CREATE FUNCTION public.jds_access_reviewer_campuses() RETURNS text[] LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(array_agg(s),ARRAY[]::text[]) FROM unnest(ARRAY['CORE','INDUSTRY']) s WHERE school_private.can_review_access(s,'teacher')
$$;
REVOKE ALL ON FUNCTION public.jds_submit_access_request(text,text,text),public.jds_review_access_request(uuid,text,text),public.jds_access_reviewer_campuses() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.jds_submit_access_request(text,text,text),public.jds_review_access_request(uuid,text,text),public.jds_access_reviewer_campuses() TO authenticated;
