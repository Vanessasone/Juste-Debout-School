-- School-only signup profile initialization. Never trust metadata for authorization.
CREATE OR REPLACE FUNCTION public.school_create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, nullif(btrim(NEW.raw_user_meta_data->>'full_name'), ''));
  RETURN NEW;
END;
$function$;

-- Preserve names already edited in the profile.
UPDATE public.profiles AS p
SET full_name = nullif(btrim(u.raw_user_meta_data->>'full_name'), '')
FROM auth.users AS u
WHERE u.id = p.id
  AND nullif(btrim(p.full_name), '') IS NULL
  AND nullif(btrim(u.raw_user_meta_data->>'full_name'), '') IS NOT NULL;
