-- ============================================================================
-- JUSTE DEBOUT SCHOOL — PHASE B (3) : push + réservations enfant
-- À lancer dans le SQL Editor du projet Supabase partagé, en UNE fois. Idempotent.
-- ============================================================================


-- ############################################################################
-- ### 1/2 · schema-push (jetons de notifications)
-- ############################################################################

-- ============================================================================
-- PUSH TOKENS — jetons Expo pour notifications distantes (app Juste Debout School)
-- Un jeton par appareil. L'envoi réel se fait via l'Edge Function
-- push-on-notify (déclenchée à l'insertion d'une notification). Idempotent.
-- ============================================================================

create table if not exists public.jds_push_tokens (
  token       text primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  platform    text,
  updated_at  timestamptz default now()
);
alter table public.jds_push_tokens enable row level security;

-- Chacun gère SES jetons ; le staff/admin peut les lire (pour diffuser).
drop policy if exists jds_push_own on public.jds_push_tokens;
create policy jds_push_own on public.jds_push_tokens
  for all
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid());

create index if not exists jds_push_profile_idx on public.jds_push_tokens(profile_id);


-- ############################################################################
-- ### 2/2 · schema-child-bookings (réservations enfant)
-- ############################################################################

-- ============================================================================
-- RÉSERVATIONS ENFANT (app Juste Debout School)
-- Le parent inscrit son enfant à un cours. Le parent gère les réservations de
-- SES enfants uniquement (via jds_children.parent_id) ; le staff/admin lit tout.
-- Prérequis : jds_children + jds_sessions. À exécuter dans le SQL Editor. Idempotent.
-- ============================================================================

create table if not exists public.jds_child_bookings (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.jds_children(id) on delete cascade,
  session_id  uuid not null references public.jds_sessions(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (child_id, session_id)
);

alter table public.jds_child_bookings enable row level security;

drop policy if exists jds_child_bookings_parent on public.jds_child_bookings;
create policy jds_child_bookings_parent on public.jds_child_bookings
  for all
  using (
    exists (select 1 from public.jds_children c where c.id = child_id and c.parent_id = auth.uid())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.jds_children c where c.id = child_id and c.parent_id = auth.uid())
  );

create index if not exists jds_child_bookings_child_idx on public.jds_child_bookings(child_id);
create index if not exists jds_child_bookings_session_idx on public.jds_child_bookings(session_id);
