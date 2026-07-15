-- ============================================================
-- Champs profil « disponible pour donner des stages à la JD School ».
-- S'ajoutent à la table profiles PARTAGÉE (bénéficie aux deux apps). Idempotent.
-- ============================================================
alter table public.profiles add column if not exists available_for_school boolean not null default false;
alter table public.profiles add column if not exists school_note text;
create index if not exists idx_profiles_available_school
  on public.profiles(available_for_school) where available_for_school;
