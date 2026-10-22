CREATE FUNCTION public.jds_access_review_queue() RETURNS TABLE(id uuid,applicant_name text,kind text,campus text,disciplines text,status text,requested_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.id,coalesce(nullif(p.full_name,''),nullif(p.alias,''),'Profil School'),r.kind,r.campus,r.disciplines,r.status,r.requested_at FROM public.jds_access_requests r JOIN public.profiles p ON p.id=r.profile_id
 WHERE r.status='pending' AND r.profile_id<>auth.uid() AND school_private.can_review_access(r.campus,r.kind) ORDER BY r.requested_at
$$;
REVOKE ALL ON FUNCTION public.jds_access_review_queue() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.jds_access_review_queue() TO authenticated;
