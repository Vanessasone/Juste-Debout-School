-- ============================================================================
-- CHECK-IN ACCUEIL — présences validées à la borne (app Juste Debout School)
-- Chaque passage à la réception crée une ligne. Alimentera JD Coins / classements
-- / suivi « Mes enfants » via des hooks (Phase B). Staff/admin écrivent ; chacun
-- lit ses propres présences.
-- À exécuter dans le SQL Editor du projet Supabase partagé. Idempotent.
-- ============================================================================

create table if not exists public.jds_checkins (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.profiles(id) on delete cascade,
  session_id  uuid references public.jds_sessions(id) on delete set null,
  school_id   uuid references public.jds_schools(id),
  checked_at  timestamptz default now(),
  by_staff    uuid references public.profiles(id)
);

alter table public.jds_checkins enable row level security;

-- Le staff/admin enregistre les présences (la borne tourne sur un compte staff).
drop policy if exists jds_checkins_staff_write on public.jds_checkins;
create policy jds_checkins_staff_write on public.jds_checkins
  for insert
  with check (public.is_admin() or (school_id is not null and public.jds_is_school_staff(school_id)));

-- Chacun lit ses propres présences ; le staff/admin lit tout.
drop policy if exists jds_checkins_read on public.jds_checkins;
create policy jds_checkins_read on public.jds_checkins
  for select
  using (member_id = auth.uid() or public.is_admin() or (school_id is not null and public.jds_is_school_staff(school_id)));

create index if not exists jds_checkins_member_idx on public.jds_checkins(member_id);
create index if not exists jds_checkins_session_idx on public.jds_checkins(session_id);
