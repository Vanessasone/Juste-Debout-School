-- ============================================================
-- Fiches profs / danseurs — autoriser la création/édition par le staff/admin.
-- (La table jds_teachers et sa lecture existent déjà via schema-jds.sql ;
--  il manquait juste la policy d'écriture.) Idempotent.
-- ============================================================
drop policy if exists jds_teachers_admin on public.jds_teachers;
create policy jds_teachers_admin on public.jds_teachers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
