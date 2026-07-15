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
