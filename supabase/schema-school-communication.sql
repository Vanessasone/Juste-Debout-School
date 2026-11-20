BEGIN;
ALTER TABLE school_private.schedule_editors ADD COLUMN communication_only boolean NOT NULL DEFAULT false;

UPDATE school_private.schedule_editors SET communication_only=true
WHERE email='jay@juste-debout.com' AND profile_id IS NULL;

INSERT INTO school_private.schedule_editors(email,profile_id,communication_only)
SELECT lower(u.email),u.id,true FROM auth.users u
JOIN public.profiles p ON p.id=u.id
WHERE u.id='f17882ab-55a8-4ced-ac6b-e15069612d15' AND split_part(lower(u.email),'@',2)='juste-debout.com'
AND u.email_confirmed_at IS NOT NULL
AND EXISTS(SELECT 1 FROM public.jds_access_requests a WHERE a.profile_id=u.id AND a.kind='team' AND a.status='approved')
ON CONFLICT(email) DO NOTHING;

CREATE OR REPLACE FUNCTION school_private.jds_schedule_editor_access() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_admin() OR EXISTS(
 SELECT 1 FROM school_private.schedule_editors WHERE profile_id=auth.uid() AND NOT communication_only));
$$;

CREATE FUNCTION public.jds_communication_access() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_admin() OR EXISTS(
 SELECT 1 FROM school_private.schedule_editors WHERE profile_id=auth.uid()));
$$;
CREATE FUNCTION public.jds_training_schedule_access() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT school_private.jds_schedule_editor_access();
$$;
REVOKE ALL ON FUNCTION public.jds_communication_access(),public.jds_training_schedule_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_communication_access(),public.jds_training_schedule_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.jds_activate_schedule_editor() RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM school_private.jds_activate_schedule_editor();
 RETURN public.jds_communication_access();
END $$;

ALTER POLICY schedule_editor_read ON public.jds_public_schedule USING ((SELECT public.jds_communication_access()));
ALTER POLICY schedule_editor_create ON public.jds_public_schedule WITH CHECK ((SELECT public.jds_communication_access()));
ALTER POLICY schedule_editor_update ON public.jds_public_schedule USING ((SELECT public.jds_communication_access()))
 WITH CHECK ((SELECT public.jds_communication_access()));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('jds-communication','jds-communication',false,8388608,ARRAY['image/jpeg','image/png','image/webp']);
ALTER TABLE public.jds_public_schedule ADD COLUMN visual_path text CHECK(visual_path ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$');
ALTER TABLE public.jds_public_schedule DROP CONSTRAINT jds_public_schedule_kind_check;
ALTER TABLE public.jds_public_schedule ADD CHECK(kind IN('weekly','open','workshop','camp','spectacle','event','teacher','news'));

CREATE POLICY jds_communication_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='jds-communication' AND public.jds_communication_access() AND name ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$');
CREATE POLICY jds_communication_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='jds-communication' AND public.jds_communication_access());
CREATE POLICY jds_communication_published_media ON storage.objects FOR SELECT TO anon,authenticated
USING(bucket_id='jds-communication' AND EXISTS(SELECT 1 FROM public.jds_public_schedule s
 WHERE s.visual_path=storage.objects.name AND s.status='published'));
-- Keep the editable calendar aligned with the already published public corrections.
UPDATE public.jds_public_schedule SET teacher='RUBIA'
WHERE campus='CORE' AND kind='weekly' AND weekday=3 AND title='Hip-Hop Kids' AND teacher='CAMILLA';
INSERT INTO public.jds_public_schedule(campus,kind,title,starts_on,ends_on,hours,status)
SELECT 'CORE','event',v.title,v.starts_on,v.ends_on,'—','published'
FROM (VALUES ('Battle Locking',DATE '2027-01-08',DATE '2027-01-08'),
 ('JD Week',DATE '2027-03-08',DATE '2027-03-15')) v(title,starts_on,ends_on)
WHERE NOT EXISTS(SELECT 1 FROM public.jds_public_schedule s WHERE s.campus='CORE' AND s.title=v.title AND s.starts_on=v.starts_on);
COMMIT;
