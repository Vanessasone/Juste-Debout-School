-- ============================================================================
-- JUSTE DEBOUT SCHOOL — PHASE B (tout le back-end restant, hors paiement Stripe)
-- À lancer dans le SQL Editor du projet Supabase partagé, EN UNE FOIS.
-- Idempotent : relançable sans risque (même si une partie a déjà été passée).
-- Contenu : borne check-in · notes de cours · moteur JD Coins · parrainage ·
--           jetons push · réservations enfant.
-- ============================================================================


-- ############################################################################
-- ### 1/6 · Borne check-in
-- ############################################################################

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


-- ############################################################################
-- ### 2/6 · Notes de cours (→ classement)
-- ############################################################################

-- ============================================================================
-- NOTES DE COURS (élève → prof) — « post-class rating » (app Juste Debout School)
-- Après un cours, l'élève note son prof (1–5 étoiles) + commentaire. Un trigger
-- SECURITY DEFINER reporte la note dans ranking_points (kind='rating') → le
-- classement du prof se met à jour automatiquement (l'élève n'écrit pas
-- directement dans les classements).
-- À exécuter dans le SQL Editor du projet Supabase partagé. Idempotent.
-- ============================================================================

create table if not exists public.jds_class_ratings (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  teacher_id  uuid not null references public.jds_teachers(id) on delete cascade,
  session_id  uuid references public.jds_sessions(id) on delete set null,
  stars       int  not null check (stars between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  unique (student_id, session_id)   -- une note par élève et par cours
);

alter table public.jds_class_ratings enable row level security;

-- L'élève crée et lit SES notes ; le staff/admin lit tout.
drop policy if exists jds_ratings_own on public.jds_class_ratings;
create policy jds_ratings_own on public.jds_class_ratings
  for all
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid());

create index if not exists jds_ratings_teacher_idx on public.jds_class_ratings(teacher_id);

-- Report automatique de la note dans le classement du prof.
create or replace function public.jds_rating_to_ranking()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.ranking_points (subject_id, kind, points, note, created_by)
  values (NEW.teacher_id, 'rating', NEW.stars, 'Note élève', NEW.student_id);
  return NEW;
end;
$$;

drop trigger if exists jds_rating_after_insert on public.jds_class_ratings;
create trigger jds_rating_after_insert
  after insert on public.jds_class_ratings
  for each row execute function public.jds_rating_to_ranking();


-- ############################################################################
-- ### 3/6 · Moteur JD Coins (attribution auto)
-- ############################################################################

-- ============================================================================
-- MOTEUR JD COINS — attribution automatique des coins (app Juste Debout School)
-- Des triggers de confiance créditent le portefeuille partagé (jd_points_ledger)
-- quand un événement « gagnant » a lieu. L'élève n'insère jamais directement.
-- Prérequis : jd_points_ledger + jds_checkins + jds_class_ratings existent.
-- À exécuter APRÈS les autres migrations. Idempotent.
-- ============================================================================

-- Helper : créditer des coins (SECURITY DEFINER → contourne la RLS d'insert).
create or replace function public.jd_award(p_profile uuid, p_delta int, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_profile is null then return; end if;
  insert into public.jd_points_ledger (profile_id, delta, reason, source_app)
  values (p_profile, p_delta, p_reason, 'school');
end;
$$;

-- Présence validée à la borne → +5 (suivre un cours).
create or replace function public.jd_on_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.jd_award(NEW.member_id, 5, 'class');
  return NEW;
end;
$$;
drop trigger if exists jd_checkin_award on public.jds_checkins;
create trigger jd_checkin_award
  after insert on public.jds_checkins
  for each row execute function public.jd_on_checkin();

-- Note de cours donnée → +5 (noter) à l'élève.
create or replace function public.jd_on_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.jd_award(NEW.student_id, 5, 'rating');
  return NEW;
end;
$$;
drop trigger if exists jd_rating_award on public.jds_class_ratings;
create trigger jd_rating_award
  after insert on public.jds_class_ratings
  for each row execute function public.jd_on_rating();


-- ############################################################################
-- ### 4/6 · Parrainage réel (codes + validation)
-- ############################################################################

-- ============================================================================
-- PARRAINAGE RÉEL — codes + validation (app Juste Debout School)
-- Chaque membre a un code unique. À l'inscription, le filleul saisit le code du
-- parrain → +10 JD Coins au parrain, +5 au filleul, et le parrainage est compté
-- (pour débloquer t-shirt / hoodie / carte). Écritures via RPC de confiance.
-- Prérequis : jd_award() (moteur JD Coins). À exécuter après. Idempotent.
-- ============================================================================

create table if not exists public.jds_referral_codes (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  code       text unique not null,
  created_at timestamptz default now()
);
alter table public.jds_referral_codes enable row level security;
drop policy if exists jds_refcode_own on public.jds_referral_codes;
create policy jds_refcode_own on public.jds_referral_codes
  for select using (profile_id = auth.uid() or public.is_admin());

create table if not exists public.jds_referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (referred_id)   -- on n'est parrainé qu'une fois
);
alter table public.jds_referrals enable row level security;
drop policy if exists jds_referrals_read on public.jds_referrals;
create policy jds_referrals_read on public.jds_referrals
  for select using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

create index if not exists jds_referrals_referrer_idx on public.jds_referrals(referrer_id);

-- Code du membre courant (créé à la première demande).
create or replace function public.jds_my_referral_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  existing text;
  base text;
  gen text;
begin
  select code into existing from public.jds_referral_codes where profile_id = auth.uid();
  if existing is not null then return existing; end if;

  select upper(substring(regexp_replace(coalesce(alias, full_name, 'MEMBRE'), '[^A-Za-z0-9]', '', 'g') from 1 for 6))
    into base from public.profiles where id = auth.uid();
  if base is null or base = '' then base := 'MEMBRE'; end if;

  loop
    gen := base || '-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    exit when not exists (select 1 from public.jds_referral_codes where code = gen);
  end loop;

  insert into public.jds_referral_codes (profile_id, code) values (auth.uid(), gen);
  return gen;
end;
$$;

-- Le filleul (utilisateur courant) valide le code de son parrain.
create or replace function public.jds_redeem_referral(p_code text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_referrer uuid;
begin
  if p_code is null or btrim(p_code) = '' then return 'empty'; end if;
  select profile_id into v_referrer from public.jds_referral_codes where code = upper(btrim(p_code));
  if v_referrer is null then return 'not_found'; end if;
  if v_referrer = auth.uid() then return 'self'; end if;
  if exists (select 1 from public.jds_referrals where referred_id = auth.uid()) then return 'already'; end if;

  insert into public.jds_referrals (referrer_id, referred_id) values (v_referrer, auth.uid());
  perform public.jd_award(v_referrer, 10, 'referral');  -- parrain
  perform public.jd_award(auth.uid(), 5, 'referral');   -- filleul
  return 'ok';
end;
$$;


-- ############################################################################
-- ### 5/6 · Jetons push (notifications)
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
-- ### 6/6 · Réservations enfant
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
