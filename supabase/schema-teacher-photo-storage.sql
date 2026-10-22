-- Public teacher portraits only; personal avatars remain in private school-avatars.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('photos','photos',true,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY school_teacher_photo_read ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id='photos' AND name ~ '^teachers/[0-9a-f-]{36}\.jpg$' AND (SELECT public.is_admin()));

CREATE POLICY school_teacher_photo_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='photos' AND name ~ '^teachers/[0-9a-f-]{36}\.jpg$' AND (SELECT public.is_admin()));

CREATE POLICY school_teacher_photo_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id='photos' AND name ~ '^teachers/[0-9a-f-]{36}\.jpg$' AND (SELECT public.is_admin()))
WITH CHECK (bucket_id='photos' AND name ~ '^teachers/[0-9a-f-]{36}\.jpg$' AND (SELECT public.is_admin()));
