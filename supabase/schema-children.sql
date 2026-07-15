-- ============================================================================
-- MES ENFANTS — espace parent (app Juste Debout School)
-- Un parent (public.profiles) rattache ses enfants mineurs. Le parent gère ses
-- propres enfants ; le staff/admin peut les lire (listes de cours kids).
-- À exécuter dans le SQL Editor du projet Supabase partagé.
-- ============================================================================

create table if not exists public.jds_children (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles(id) on delete cascade,
  first_name  text not null,
  birth_year  int,
  school_code text default 'CORE',
  school_id   uuid references public.jds_schools(id),
  level       text,
  styles      text[] default '{}',
  photo_url   text,
  created_at  timestamptz default now()
);

alter table public.jds_children enable row level security;

-- Le parent gère (lit/crée/modifie/supprime) uniquement SES enfants.
drop policy if exists jds_children_parent_all on public.jds_children;
create policy jds_children_parent_all on public.jds_children
  for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- Le staff/admin peut lire tous les enfants (pour les cours kids).
drop policy if exists jds_children_staff_read on public.jds_children;
create policy jds_children_staff_read on public.jds_children
  for select
  using (public.is_admin());

create index if not exists jds_children_parent_idx on public.jds_children(parent_id);
