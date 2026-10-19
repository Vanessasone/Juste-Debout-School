-- School uniquement : disponibilité personnelle, sous la RLS profiles_own_update existante.
-- Aucun droit sur roles, school_note, official_photo_url ni sur les autres profils.
grant update (available_for_school) on public.profiles to authenticated;
