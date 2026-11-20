CREATE FUNCTION public.jds_communication_campus() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE
   WHEN e.email='jay@juste-debout.com' THEN 'CORE'
   WHEN e.profile_id='f17882ab-55a8-4ced-ac6b-e15069612d15'::uuid THEN 'INDUSTRY'
 END
 FROM school_private.schedule_editors e WHERE e.profile_id=auth.uid();
$$;
REVOKE ALL ON FUNCTION public.jds_communication_campus() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jds_communication_campus() TO authenticated;
