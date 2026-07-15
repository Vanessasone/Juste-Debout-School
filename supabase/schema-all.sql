-- ============================================================
-- Juste Debout School — SCHÉMA COMPLET (à lancer dans le projet Juste Debout)
-- 3 modules enchaînés : socle écoles, votes, classements. Idempotent.
-- ============================================================

-- ============ 1/3 · SOCLE (écoles, cours, cartes) ============
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
   'Programme danse & musique', 'Square du Caporal Peugeot, 75017 Paris','17e','#2A3CC0', false, '2026-10-01', 2)
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

-- ============ 2/3 · VOTES ============
-- ============================================================
-- Juste Debout — Système de VOTE communautaire (partagé école + événement)
-- À exécuter dans le MÊME projet Supabase (après schema-jds.sql). Idempotent.
--
-- Ex. « Qui veux-tu voir en stage à la Juste Debout School ? »
-- Comme le compte est partagé entre l'app école et l'app événement,
-- un même utilisateur ne vote QU'UNE FOIS (dédup par profile_id).
-- Distinct du vote officiel des JUGES de l'événement (passages/votes).
-- ============================================================

-- 1) SONDAGES
--    scope : 'school' (apps école) | 'event' (app événement) | 'both' (les deux)
--    school_id : campus concerné (null = tout le réseau école)
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'both',           -- school | event | both
  school_id uuid references public.jds_schools(id) on delete set null,
  question text not null,
  subtitle text,
  status text not null default 'open',          -- draft | open | closed
  results_visibility text not null default 'live', -- live | after_close
  multi_choice boolean not null default false,
  max_choices int not null default 1,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_polls_scope on public.polls(scope, status);

-- 2) CANDIDATS (danseurs sélectionnés — curés par l'admin)
--    profile_id : lien optionnel vers un vrai profil danseur (école OU événement)
create table if not exists public.poll_candidates (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  subtitle text,                                -- styles / origine
  photo_url text,
  instagram text,
  vote_count int not null default 0,            -- dénormalisé (lecture O(1) à grande échelle)
  sort_order int not null default 0
);
create index if not exists idx_poll_candidates_poll on public.poll_candidates(poll_id);

-- 3) VOTES (un enregistrement par (sondage, votant, candidat))
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  candidate_id uuid not null references public.poll_candidates(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, profile_id, candidate_id)
);
create index if not exists idx_poll_votes_poll on public.poll_votes(poll_id);
create index if not exists idx_poll_votes_profile on public.poll_votes(poll_id, profile_id);

-- Maintien du compteur dénormalisé (insert / delete)
create or replace function public.poll_vote_count_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.poll_candidates set vote_count = vote_count + 1 where id = new.candidate_id;
  elsif tg_op = 'DELETE' then
    update public.poll_candidates set vote_count = greatest(0, vote_count - 1) where id = old.candidate_id;
  end if;
  return null;
end; $$;
drop trigger if exists trg_poll_vote_count on public.poll_votes;
create trigger trg_poll_vote_count
  after insert or delete on public.poll_votes
  for each row execute function public.poll_vote_count_sync();

-- ============================================================
-- 4) VOTER (atomique, côté serveur)
--    - vérifie que le sondage est ouvert et dans sa fenêtre ;
--    - vérifie que le candidat appartient au sondage ;
--    - mono-choix : remplace le vote précédent (l'utilisateur peut changer d'avis) ;
--    - multi-choix : ajoute jusqu'à max_choices, ignore un candidat déjà voté.
-- ============================================================
create or replace function public.cast_vote(p_poll uuid, p_candidate uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_multi boolean; v_max int; v_ends timestamptz; v_status text; v_count int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select multi_choice, max_choices, ends_at, status
    into v_multi, v_max, v_ends, v_status
    from public.polls where id = p_poll;
  if not found then raise exception 'sondage introuvable'; end if;
  if v_status <> 'open' then raise exception 'sondage fermé'; end if;
  if v_ends is not null and v_ends < now() then raise exception 'sondage expiré'; end if;

  if not exists (select 1 from public.poll_candidates where id = p_candidate and poll_id = p_poll) then
    raise exception 'candidat invalide';
  end if;

  if v_multi then
    select count(*) into v_count from public.poll_votes
      where poll_id = p_poll and profile_id = auth.uid();
    if v_count >= v_max then raise exception 'nombre de voix atteint'; end if;
    insert into public.poll_votes (poll_id, candidate_id, profile_id)
      values (p_poll, p_candidate, auth.uid())
      on conflict (poll_id, profile_id, candidate_id) do nothing;
  else
    -- mono-choix : on retire l'ancien vote puis on pose le nouveau
    delete from public.poll_votes where poll_id = p_poll and profile_id = auth.uid();
    insert into public.poll_votes (poll_id, candidate_id, profile_id)
      values (p_poll, p_candidate, auth.uid());
  end if;
end; $$;

-- ============================================================
-- SÉCURITÉ (RLS)
-- ============================================================
alter table public.polls           enable row level security;
alter table public.poll_candidates enable row level security;
alter table public.poll_votes      enable row level security;

-- Sondages & candidats : lecture pour tous les connectés (les deux apps).
drop policy if exists polls_read on public.polls;
create policy polls_read on public.polls for select to authenticated
  using (status in ('open','closed'));
drop policy if exists poll_candidates_read on public.poll_candidates;
create policy poll_candidates_read on public.poll_candidates for select to authenticated using (true);

-- Administration des sondages : admin global.
drop policy if exists polls_admin on public.polls;
create policy polls_admin on public.polls for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists poll_candidates_admin on public.poll_candidates;
create policy poll_candidates_admin on public.poll_candidates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Votes : chacun lit les SIENS (pour afficher son choix). L'écriture passe par
-- la RPC cast_vote (SECURITY DEFINER) — pas d'INSERT direct exposé.
drop policy if exists poll_votes_read_own on public.poll_votes;
create policy poll_votes_read_own on public.poll_votes for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- ============================================================
-- DONNÉES DE DÉPART — un sondage de démo, école + événement
-- ============================================================
insert into public.polls (id, scope, question, subtitle, status, results_visibility)
values (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'both',
  'Qui veux-tu voir en stage à la Juste Debout School ?',
  'Le/la gagnant·e donnera un stage exceptionnel au prochain trimestre.',
  'open',
  'live'
)
on conflict (id) do update set question = excluded.question, subtitle = excluded.subtitle;

insert into public.poll_candidates (poll_id, name, subtitle, sort_order)
select 'b0000000-0000-0000-0000-000000000001'::uuid, c.name, c.styles, c.ord
from (values
  ('Diablo',  'Popping', 1),
  ('Nelson',  'Popping · Boogaloo', 2),
  ('Yugson',  'House', 3),
  ('Soulz',  'House', 4),
  ('Malika',  'Waacking · Dancehall', 5)
) as c(name, styles, ord)
where not exists (
  select 1 from public.poll_candidates x
  where x.poll_id = 'b0000000-0000-0000-0000-000000000001'::uuid and x.name = c.name
);

-- ============ 3/3 · CLASSEMENTS ============
-- ============================================================
-- Juste Debout School — CLASSEMENTS (ranking) · registre de points
-- À exécuter dans le même projet Supabase (après schema-jds.sql). Idempotent.
--
-- Trois populations : profs open, profs formation, élèves formation.
-- Principe : un LEDGER de points événementiel (append-only). Chaque signal
-- devient une ligne (présence, retard, absence, note élève, vote, éval jury,
-- défi, bonus/malus admin…). Le classement = somme des points par saison.
-- Avantage : on ajoute n'importe quelle métrique future SANS changer le schéma.
-- ============================================================

-- Filet : is_admin() (déjà défini par les autres schémas)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and 'admin' = any(roles));
$$;

-- 1) ROSTER — profs & élèves classés (optionnellement liés à un compte)
create table if not exists public.ranking_subjects (
  id uuid primary key default gen_random_uuid(),
  population text not null,          -- open_teacher | formation_teacher | formation_student
  name text not null,
  subtitle text,                     -- styles / promo
  profile_id uuid references public.profiles(id) on delete set null,
  school_id uuid references public.jds_schools(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_ranking_subjects_pop on public.ranking_subjects(population);

-- 2) LEDGER de points
create table if not exists public.ranking_points (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.ranking_subjects(id) on delete cascade,
  season text not null default '2026-T1',
  kind text not null,                -- attendance|lateness|absence|rating|vote|jury|challenge|bonus
  points numeric not null,           -- + ou - (retard/absence = négatif)
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ranking_points_subject on public.ranking_points(subject_id, season);

-- Visibilité : profs = tous les connectés ; élèves = staff/admin (défaut « privé »).
-- Pour ouvrir le classement élèves à la promo plus tard : élargir ce predicate.
create or replace function public.ranking_can_see(pop text)
returns boolean language sql security definer stable set search_path = public as $$
  select case
    when pop in ('open_teacher','formation_teacher') then true
    else public.is_admin()
      or exists (select 1 from public.jds_school_staff s where s.profile_id = auth.uid())
  end;
$$;

-- 3) CLASSEMENT agrégé (respecte la RLS de l'appelant : security_invoker)
create or replace view public.v_ranking_leaderboard
with (security_invoker = on) as
select
  s.population,
  rp.season,
  s.id           as subject_id,
  s.name,
  s.subtitle,
  s.school_id,
  sum(rp.points)::int as score,
  count(*)            as events
from public.ranking_points rp
join public.ranking_subjects s on s.id = rp.subject_id
where s.active
group by s.population, rp.season, s.id, s.name, s.subtitle, s.school_id;

-- 4) AJOUT DE POINTS (admin / staff) — la couche gamification interne
--    ex. retard = -5, absence = -15, présence = +2, défi = +10, bonus libre…
create or replace function public.ranking_add(
  p_subject uuid, p_kind text, p_points numeric, p_season text default '2026-T1', p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin()
      or exists (select 1 from public.jds_school_staff s where s.profile_id = auth.uid())) then
    raise exception 'réservé au staff';
  end if;
  insert into public.ranking_points (subject_id, season, kind, points, note, created_by)
  values (p_subject, p_season, p_kind, p_points, p_note, auth.uid());
end; $$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.ranking_subjects enable row level security;
alter table public.ranking_points   enable row level security;

drop policy if exists ranking_subjects_read on public.ranking_subjects;
create policy ranking_subjects_read on public.ranking_subjects for select to authenticated
  using (public.ranking_can_see(population));
drop policy if exists ranking_subjects_admin on public.ranking_subjects;
create policy ranking_subjects_admin on public.ranking_subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists ranking_points_read on public.ranking_points;
create policy ranking_points_read on public.ranking_points for select to authenticated
  using (exists (
    select 1 from public.ranking_subjects s
    where s.id = subject_id and public.ranking_can_see(s.population)
  ));
-- écriture uniquement via ranking_add (SECURITY DEFINER)

-- ============================================================
-- DONNÉES DE DÉPART — roster + points d'exemple (saison 2026-T1)
-- ============================================================
insert into public.ranking_subjects (id, population, name, subtitle) values
  ('d1000000-0000-0000-0000-000000000001','open_teacher','Soulz','House'),
  ('d1000000-0000-0000-0000-000000000002','open_teacher','Nelson','Popping · Boogaloo'),
  ('d1000000-0000-0000-0000-000000000003','open_teacher','Malika','Waacking · Dancehall'),
  ('d2000000-0000-0000-0000-000000000001','formation_teacher','Diablo','Popping — formation'),
  ('d2000000-0000-0000-0000-000000000002','formation_teacher','Yugson','House — formation'),
  ('d3000000-0000-0000-0000-000000000001','formation_student','Naïma','Promo 2026'),
  ('d3000000-0000-0000-0000-000000000002','formation_student','Kenji','Promo 2026'),
  ('d3000000-0000-0000-0000-000000000003','formation_student','Awa','Promo 2026')
on conflict (id) do nothing;

insert into public.ranking_points (subject_id, kind, points, note)
select s.id, v.kind, v.points, v.note
from (values
  ('d1000000-0000-0000-0000-000000000001'::uuid,'attendance', 40,'présences'),
  ('d1000000-0000-0000-0000-000000000001'::uuid,'rating',     28,'notes élèves'),
  ('d1000000-0000-0000-0000-000000000001'::uuid,'vote',       18,'votes communauté'),
  ('d1000000-0000-0000-0000-000000000002'::uuid,'attendance', 33,'présences'),
  ('d1000000-0000-0000-0000-000000000002'::uuid,'rating',     22,'notes élèves'),
  ('d1000000-0000-0000-0000-000000000003'::uuid,'attendance', 26,'présences'),
  ('d1000000-0000-0000-0000-000000000003'::uuid,'lateness',   -6,'retards'),
  ('d2000000-0000-0000-0000-000000000001'::uuid,'jury',       45,'éval jury'),
  ('d2000000-0000-0000-0000-000000000002'::uuid,'jury',       38,'éval jury'),
  ('d3000000-0000-0000-0000-000000000001'::uuid,'attendance', 30,'assiduité'),
  ('d3000000-0000-0000-0000-000000000001'::uuid,'challenge',  15,'défis'),
  ('d3000000-0000-0000-0000-000000000002'::uuid,'attendance', 26,'assiduité'),
  ('d3000000-0000-0000-0000-000000000002'::uuid,'absence',   -15,'absence'),
  ('d3000000-0000-0000-0000-000000000003'::uuid,'attendance', 34,'assiduité'),
  ('d3000000-0000-0000-0000-000000000003'::uuid,'jury',       12,'éval jury')
) as v(id, kind, points, note)
join public.ranking_subjects s on s.id = v.id
where not exists (
  select 1 from public.ranking_points rp where rp.subject_id = v.id and rp.kind = v.kind
);
