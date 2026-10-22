-- User-authorized full School access for the four directors. Confirmed accounts only.
CREATE OR REPLACE FUNCTION public.jds_activate_school_responsibility(responsibility_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.jds_school_responsibilities; account_id uuid; verified timestamptz; banned timestamptz;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Activation réservée à l’administration centrale.'; END IF;
 SELECT * INTO r FROM public.jds_school_responsibilities WHERE id=responsibility_id FOR UPDATE;
 IF r.id IS NULL OR r.email NOT IN ('nicolas@juste-debout.com','bruceykanji1@gmail.com','rabah@juste-debout.com','loic@juste-debout.com','jacky@juste-debout.com') THEN RAISE EXCEPTION 'Responsabilité non prévue pour cette activation.'; END IF;
 IF (r.email IN ('nicolas@juste-debout.com','bruceykanji1@gmail.com','rabah@juste-debout.com','loic@juste-debout.com') AND r.campus IS NOT NULL)
 OR (r.email='jacky@juste-debout.com' AND r.campus IS DISTINCT FROM 'INDUSTRY') THEN RAISE EXCEPTION 'Le périmètre de cette responsabilité doit être corrigé par l’administration.'; END IF;
 SELECT id,email_confirmed_at,banned_until INTO account_id,verified,banned FROM auth.users WHERE lower(email)=r.email;
 IF account_id IS NULL OR verified IS NULL OR banned>now() OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=account_id) THEN RAISE EXCEPTION 'Un compte School avec cette adresse email confirmée est nécessaire.'; END IF;
 IF r.profile_id IS NOT NULL AND r.profile_id<>account_id THEN RAISE EXCEPTION 'Cette responsabilité est déjà rattachée à un autre compte.'; END IF;
 IF r.email IN ('nicolas@juste-debout.com','bruceykanji1@gmail.com','rabah@juste-debout.com','loic@juste-debout.com') THEN
 UPDATE public.profiles SET roles=array_append(roles,'admin') WHERE id=account_id AND NOT ('admin'=ANY(roles));
 END IF;
 IF r.enabled THEN RETURN; END IF;
 UPDATE public.jds_school_responsibilities SET profile_id=account_id,enabled=true,activated_at=now(),activated_by=auth.uid() WHERE id=r.id;
END $$;
