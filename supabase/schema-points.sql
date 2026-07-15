-- ============================================================
-- JD POINTS — ledger de fidélité PARTAGÉ (école + événement).
-- À exécuter dans le projet Supabase commun. Idempotent.
-- Un enregistrement = un gain/dépense de points pour une personne.
-- ============================================================
create table if not exists public.jd_points_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,                 -- + gagné / - dépensé
  reason text not null,               -- 'class' | 'rating' | 'card' | 'referral' | 'vote' | 'redeem' | 'bonus'
  source_app text not null default 'school', -- 'school' | 'event'
  created_at timestamptz not null default now()
);
create index if not exists idx_jd_points_profile on public.jd_points_ledger(profile_id);

alter table public.jd_points_ledger enable row level security;

-- Chacun lit SON solde. (L'attribution des points se fera par des RPC/triggers
--  de confiance côté serveur — pas d'INSERT direct exposé.)
drop policy if exists jd_points_read_own on public.jd_points_ledger;
create policy jd_points_read_own on public.jd_points_ledger for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
