-- ============================================================
-- Juste Debout School (JDS) — Schéma « socle » multi-écoles · Phase 1
-- À exécuter dans le MÊME projet Supabase que l'app événement
-- (Supabase → SQL Editor → New query → Run). Idempotent : relançable.
--
-- Principe : l'app JDS partage le compte / l'auth de l'app événement.
-- On RÉUTILISE donc public.profiles (auth.users) et les helpers existants
-- (public.is_admin()). On AJOUTE ici des tables préfixées « jds_ »,
-- toutes scopées par école (school_id) → multi-tenant dès la ligne 1.
-- ============================================================

-- Filet de sécurité : is_admin() existe déjà (app événement). On le (re)crée
-- au cas où le schéma JDS serait exécuté sur un projet neuf.
create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and 'admin' = any(roles)
  );
$$;

-- ============================================================
-- 1) ÉCOLES (tenants) — CORE, INDUSTRY, … et les suivantes
-- ============================================================
create table if not exists public.jds_schools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- 'CORE' | 'INDUSTRY' | …
  name text not null,
  tagline text,
  city text not null default 'Paris',
  address text,
  arrondissement text,
  lat double precision,
  lng double precision,
  accent_color text not null default '#DE7A1A', -- couleur signature du campus
  is_open boolean not null default true,        -- false tant que « Coming Soon »
  opens_on date,                                -- date d'ouverture prévue
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2) STUDIOS (salles) d'une école
-- ============================================================
create table if not exists public.jds_studios (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.jds_schools(id) on delete cascade,
  name text not null,
  area_m2 int,
  sort_order int not null default 0
);
create index if not exists idx_jds_studios_school on public.jds_studios(school_id);

-- ============================================================
-- 3) PROFESSEURS / INTERVENANTS
--    Optionnellement reliés à un compte (profiles) s'ils sont sur l'app.
-- ============================================================
create table if not exists public.jds_teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  styles text[] not null default '{}',
  photo_url text,
  instagram text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4) STAFF PAR ÉCOLE — qui administre quel campus (back-office)
-- ============================================================
create table if not exists public.jds_school_staff (
  school_id uuid not null references public.jds_schools(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'staff',        -- 'staff' | 'manager'
  primary key (school_id, profile_id)
);

-- Vrai si l'utilisateur courant est admin global OU staff de cette école.
create or replace function public.jds_is_school_staff(p_school uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.jds_school_staff s
    where s.school_id = p_school and s.profile_id = auth.uid()
  );
$$;

-- ============================================================
-- 5) SÉANCES (créneaux de cours) — le cœur du planning
--    kind : open (open class) | workshop (stage) | private | kids
-- ============================================================
create table if not exists public.jds_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.jds_schools(id) on delete cascade,
  studio_id uuid references public.jds_studios(id) on delete set null,
  teacher_id uuid references public.jds_teachers(id) on delete set null,
  style text not null,                       -- 'House' | 'Popping' | …
  level text not null default 'all',         -- all | beginner | inter | advanced
  kind text not null default 'open',         -- open | workshop | private | kids
  title text,
  starts_at timestamptz not null,
  duration_min int not null default 90,
  capacity int not null default 25,
  price_cents int not null default 1500,     -- prix à l'unité (défaut 15€)
  status text not null default 'scheduled',  -- scheduled | cancelled
  created_at timestamptz not null default now()
);
create index if not exists idx_jds_sessions_school on public.jds_sessions(school_id);
create index if not exists idx_jds_sessions_start  on public.jds_sessions(starts_at);
create index if not exists idx_jds_sessions_style  on public.jds_sessions(style);

-- ============================================================
-- 6) TYPES DE CARTES (prépayées) — dégressives
--    school_id NULL  = carte VALABLE SUR TOUT LE RÉSEAU
--    school_id renseigné = carte propre à un campus
--    → le modèle supporte les deux ; le seed ci-dessous crée des cartes
--      PAR CAMPUS (choix par défaut ; à trancher avec JDS).
-- ============================================================
create table if not exists public.jds_card_types (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.jds_schools(id) on delete cascade,
  name text not null,
  credits int not null,                      -- nb de cours (0 = illimité/abonnement)
  price_cents int not null,
  audience text not null default 'adult',    -- adult | kids
  includes_workshops boolean not null default false,
  validity_days int not null default 365,
  sort_order int not null default 0
);

-- ============================================================
-- 7) CARTES DES ÉLÈVES (achetées) + 8) RÉSERVATIONS
-- ============================================================
create table if not exists public.jds_user_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  card_type_id uuid not null references public.jds_card_types(id) on delete restrict,
  school_id uuid references public.jds_schools(id) on delete set null, -- portée (null = réseau)
  credits_total int not null,
  credits_left int not null,
  purchased_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active'      -- active | expired | empty
);
create index if not exists idx_jds_user_cards_profile on public.jds_user_cards(profile_id);

create table if not exists public.jds_bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.jds_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_card_id uuid references public.jds_user_cards(id) on delete set null,
  status text not null default 'booked',     -- booked | waitlist | attended | cancelled
  created_at timestamptz not null default now(),
  unique (session_id, profile_id)
);
create index if not exists idx_jds_bookings_session on public.jds_bookings(session_id);
create index if not exists idx_jds_bookings_profile on public.jds_bookings(profile_id);

-- Nombre de places déjà réservées sur une séance (booked + attended).
create or replace function public.jds_session_booked(p_session uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.jds_bookings
  where session_id = p_session and status in ('booked','attended');
$$;

-- ============================================================
-- 9) RÉSERVER UNE SÉANCE (atomique, côté serveur)
--    - vérifie que la carte appartient à l'élève, est valide, non expirée,
--      a du crédit, et couvre l'école de la séance (réseau ou même campus) ;
--    - place en « waitlist » si la séance est complète (sans débiter) ;
--    - sinon débite 1 crédit et crée la réservation « booked ».
--    Renvoie le statut ('booked' | 'waitlist').
-- ============================================================
create or replace function public.jds_book_session(p_session uuid, p_card uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid; v_capacity int; v_booked int;
  v_card record; v_status text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select school_id, capacity into v_school, v_capacity
    from public.jds_sessions where id = p_session and status = 'scheduled';
  if not found then raise exception 'session introuvable'; end if;

  -- Carte : doit appartenir à l'élève, être active, avoir du crédit,
  -- et couvrir l'école (portée réseau = school_id null, ou même campus).
  select * into v_card from public.jds_user_cards
    where id = p_card and profile_id = auth.uid();
  if not found then raise exception 'carte invalide'; end if;
  if v_card.status <> 'active' or v_card.credits_left < 1 then
    raise exception 'carte sans crédit'; end if;
  if v_card.expires_at < now() then raise exception 'carte expirée'; end if;
  if v_card.school_id is not null and v_card.school_id <> v_school then
    raise exception 'carte non valable sur ce campus'; end if;

  v_booked := public.jds_session_booked(p_session);

  if v_booked >= v_capacity then
    -- Complet → liste d'attente, sans débit.
    insert into public.jds_bookings (session_id, profile_id, status)
      values (p_session, auth.uid(), 'waitlist')
      on conflict (session_id, profile_id) do update set status = 'waitlist';
    return 'waitlist';
  end if;

  -- Place dispo → on débite et on réserve.
  update public.jds_user_cards
    set credits_left = credits_left - 1,
        status = case when credits_left - 1 <= 0 then 'empty' else 'active' end
    where id = p_card;

  insert into public.jds_bookings (session_id, profile_id, user_card_id, status)
    values (p_session, auth.uid(), p_card, 'booked')
    on conflict (session_id, profile_id)
      do update set status = 'booked', user_card_id = excluded.user_card_id;

  return 'booked';
end; $$;

-- ============================================================
-- SÉCURITÉ (Row Level Security)
-- ============================================================
alter table public.jds_schools      enable row level security;
alter table public.jds_studios      enable row level security;
alter table public.jds_teachers     enable row level security;
alter table public.jds_school_staff enable row level security;
alter table public.jds_sessions     enable row level security;
alter table public.jds_card_types   enable row level security;
alter table public.jds_user_cards   enable row level security;
alter table public.jds_bookings     enable row level security;

-- Catalogue public (élèves connectés) : écoles, studios, profs, séances, cartes.
drop policy if exists jds_schools_read on public.jds_schools;
create policy jds_schools_read on public.jds_schools for select to authenticated using (true);
drop policy if exists jds_studios_read on public.jds_studios;
create policy jds_studios_read on public.jds_studios for select to authenticated using (true);
drop policy if exists jds_teachers_read on public.jds_teachers;
create policy jds_teachers_read on public.jds_teachers for select to authenticated using (true);
drop policy if exists jds_sessions_read on public.jds_sessions;
create policy jds_sessions_read on public.jds_sessions for select to authenticated using (true);
drop policy if exists jds_card_types_read on public.jds_card_types;
create policy jds_card_types_read on public.jds_card_types for select to authenticated using (true);

-- Écriture du catalogue : réservée au staff de l'école (ou admin).
drop policy if exists jds_schools_admin on public.jds_schools;
create policy jds_schools_admin on public.jds_schools for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists jds_sessions_staff on public.jds_sessions;
create policy jds_sessions_staff on public.jds_sessions for all to authenticated
  using (public.jds_is_school_staff(school_id))
  with check (public.jds_is_school_staff(school_id));
drop policy if exists jds_studios_staff on public.jds_studios;
create policy jds_studios_staff on public.jds_studios for all to authenticated
  using (public.jds_is_school_staff(school_id))
  with check (public.jds_is_school_staff(school_id));

-- Staff d'école : lisible par le staff/admin.
drop policy if exists jds_staff_read on public.jds_school_staff;
create policy jds_staff_read on public.jds_school_staff for select to authenticated
  using (public.jds_is_school_staff(school_id));

-- Cartes & réservations : chacun les siennes ; staff du campus + admin en lecture.
drop policy if exists jds_cards_own on public.jds_user_cards;
create policy jds_cards_own on public.jds_user_cards for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
drop policy if exists jds_bookings_own on public.jds_bookings;
create policy jds_bookings_own on public.jds_bookings for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.jds_sessions s
      where s.id = session_id and public.jds_is_school_staff(s.school_id)
    )
  );
-- Annuler sa propre réservation.
drop policy if exists jds_bookings_cancel on public.jds_bookings;
create policy jds_bookings_cancel on public.jds_bookings for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
-- NB : la création de réservation passe par la RPC jds_book_session (SECURITY DEFINER),
-- et l'achat de carte par un flux paiement (à venir) — pas d'INSERT direct exposé.

-- ============================================================
-- DONNÉES DE DÉPART — les deux écoles réelles + catalogue d'exemple
-- ============================================================
insert into public.jds_schools (id, code, name, tagline, address, arrondissement, accent_color, is_open, opens_on, sort_order)
values
  ('a0000000-0000-0000-0000-0000000000c0','CORE','Juste Debout School — CORE',
   'La maison mère · open classes', '3 rue de l''Est, 75020 Paris','20e','#DE7A1A', true, '2014-01-01', 1),
  ('a0000000-0000-0000-0000-0000000000d0','INDUSTRY','Juste Debout School — INDUSTRY',
   'Programme danse & musique', '27 Boulevard de la Somme, 75017 Paris','17e','#2A3CC0', false, '2027-10-15', 2)
on conflict (code) do update
  set name = excluded.name, tagline = excluded.tagline, address = excluded.address,
      accent_color = excluded.accent_color, is_open = excluded.is_open, opens_on = excluded.opens_on;

-- Studios de CORE (132 / 75 / 50 m²)
insert into public.jds_studios (school_id, name, area_m2, sort_order) values
  ('a0000000-0000-0000-0000-0000000000c0','Studio 1',132,1),
  ('a0000000-0000-0000-0000-0000000000c0','Studio 2',75,2),
  ('a0000000-0000-0000-0000-0000000000c0','Studio 3',50,3)
on conflict do nothing;

-- Cartes prépayées PAR CAMPUS (grille CORE 2021-2022 — à reconfirmer avec JDS)
insert into public.jds_card_types (school_id, name, credits, price_cents, audience, includes_workshops, sort_order) values
  ('a0000000-0000-0000-0000-0000000000c0','Carte 5 cours',   5, 7500,'adult', false, 1),
  ('a0000000-0000-0000-0000-0000000000c0','Carte 10 cours', 10,13500,'adult', false, 2),
  ('a0000000-0000-0000-0000-0000000000c0','Carte 20 cours', 20,24500,'adult', true,  3),
  ('a0000000-0000-0000-0000-0000000000c0','Carte 50 cours', 50,55500,'adult', true,  4),
  ('a0000000-0000-0000-0000-0000000000c0','Carte annuelle KIDS', 0,35500,'kids', false, 5)
on conflict do nothing;

-- Quelques séances d'exemple sur les prochains jours (pour peupler le planning).
insert into public.jds_sessions (school_id, studio_id, style, level, kind, starts_at, duration_min, capacity, price_cents)
select s.school_id, s.studio_id, s.style, s.level, 'open',
       date_trunc('day', now()) + s.day_offset * interval '1 day' + s.hour * interval '1 hour',
       75, s.capacity, 1500
from (values
  ('a0000000-0000-0000-0000-0000000000c0'::uuid, (select id from public.jds_studios where area_m2=132 limit 1), 'House',   'inter',    0, 18.5, 25),
  ('a0000000-0000-0000-0000-0000000000c0'::uuid, (select id from public.jds_studios where area_m2=75  limit 1), 'Popping', 'all',      0, 19.0, 22),
  ('a0000000-0000-0000-0000-0000000000c0'::uuid, (select id from public.jds_studios where area_m2=132 limit 1), 'Hip-Hop', 'beginner', 0, 20.0, 25),
  ('a0000000-0000-0000-0000-0000000000c0'::uuid, (select id from public.jds_studios where area_m2=50  limit 1), 'Locking', 'inter',    1, 18.5, 20),
  ('a0000000-0000-0000-0000-0000000000c0'::uuid, (select id from public.jds_studios where area_m2=132 limit 1), 'House',   'advanced', 1, 20.0, 25),
  ('a0000000-0000-0000-0000-0000000000c0'::uuid, (select id from public.jds_studios where area_m2=75  limit 1), 'Dancehall','all',     2, 19.0, 22)
) as s(school_id, studio_id, style, level, day_offset, hour, capacity)
where not exists (
  select 1 from public.jds_sessions x
  where x.school_id = s.school_id and x.style = s.style
    and x.starts_at::date = (date_trunc('day', now()) + s.day_offset * interval '1 day')::date
);
