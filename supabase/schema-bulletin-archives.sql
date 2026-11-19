BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit)
VALUES('jds-school-archives','jds-school-archives',false,26214400);

CREATE FUNCTION public.jds_can_access_school_archive(group_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.jds_training_groups g
 WHERE g.id::text=group_key AND school_private.can_review_bulletin_sheet(g.campus));
$$;
REVOKE ALL ON FUNCTION public.jds_can_access_school_archive(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_can_access_school_archive(text) TO authenticated;

CREATE POLICY school_archive_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='jds-school-archives' AND public.jds_can_access_school_archive(split_part(name,'/',1)));
CREATE POLICY school_archive_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='jds-school-archives' AND public.jds_can_access_school_archive(split_part(name,'/',1))
 AND lower(name) ~ '\.(pdf|jpe?g|png|webp|heic|heif|tiff?|docx?|xlsx?|csv|odt|ods|txt|zip)$');

CREATE FUNCTION public.jds_list_school_archive(group_key uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.jds_can_access_school_archive(group_key::text) THEN RETURN NULL; END IF;
 RETURN coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM
   (SELECT o.name,o.created_at FROM storage.objects o
    WHERE o.bucket_id='jds-school-archives' AND split_part(o.name,'/',1)=group_key::text) x),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.jds_list_school_archive(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_list_school_archive(uuid) TO authenticated;
CREATE FUNCTION public.jds_archived_assessment_index(group_key uuid, trimester integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'subject_id',b.subject_id,'subject',s.subject,'teacher_name',s.teacher_name,'term',s.term,'lesson_date',b.lesson_date,'kind',b.kind)
 ORDER BY b.lesson_date DESC),'[]'::jsonb)
 FROM public.jds_bulletin_sheets b JOIN public.jds_bulletin_subjects s ON s.id=b.subject_id
 WHERE s.group_id=group_key AND s.term=trimester AND b.state='approved'
 AND public.jds_can_access_school_archive(group_key::text);
$$;
REVOKE ALL ON FUNCTION public.jds_archived_assessment_index(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_archived_assessment_index(uuid,integer) TO authenticated;
CREATE FUNCTION public.jds_get_archived_assessment(sheet_key uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT to_jsonb(b) - 'created_by' - 'reviewed_by'
 FROM public.jds_bulletin_sheets b JOIN public.jds_bulletin_subjects s ON s.id=b.subject_id
 WHERE b.id=sheet_key AND b.state='approved' AND public.jds_can_access_school_archive(s.group_id::text);
$$;
REVOKE ALL ON FUNCTION public.jds_get_archived_assessment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_get_archived_assessment(uuid) TO authenticated;
CREATE FUNCTION public.jds_archived_roll_calls(group_key uuid, trimester integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'subject',s.subject,'teacher_name',s.teacher_name,'term',s.term,
   'lesson_date',(l.starts_at AT TIME ZONE 'Europe/Paris')::date,'kind','roll','starts_at',l.starts_at) ORDER BY l.starts_at DESC),'[]'::jsonb)
 FROM public.jds_training_lessons l JOIN public.jds_bulletin_subjects s ON s.id=l.bulletin_subject_id
 WHERE l.group_id=group_key AND s.term=trimester AND l.status='published' AND public.jds_can_access_school_archive(group_key::text);
$$;
CREATE FUNCTION public.jds_get_archived_roll_call(lesson_key uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',l.id,'kind','roll','lesson_date',(l.starts_at AT TIME ZONE 'Europe/Paris')::date,
 'entries',coalesce((SELECT jsonb_agg(jsonb_build_object('member_id',a.member_id,'presence',a.status))
   FROM public.jds_training_attendance a WHERE a.lesson_id=l.id),'[]'::jsonb))
 FROM public.jds_training_lessons l WHERE l.id=lesson_key AND l.bulletin_subject_id IS NOT NULL AND l.status='published'
 AND public.jds_can_access_school_archive(l.group_id::text);
$$;
REVOKE ALL ON FUNCTION public.jds_archived_roll_calls(uuid,integer),public.jds_get_archived_roll_call(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_archived_roll_calls(uuid,integer),public.jds_get_archived_roll_call(uuid) TO authenticated;
COMMIT;
