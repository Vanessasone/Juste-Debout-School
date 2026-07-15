-- ============================================================================
-- JUSTE DEBOUT SCHOOL — ACTIVATION 2 (migrations récentes + moteur JD Coins)
-- À lancer dans le SQL Editor du projet Supabase partagé, en UNE fois.
-- Idempotent : relançable sans risque.
-- Contient : borne check-in + notes de cours + attribution auto des JD Coins.
-- ============================================================================


-- ############################################################################
-- ### 1/3 · schema-checkin (borne accueil)
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
-- ### 2/3 · schema-ratings (notes de cours + report auto au classement)
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
-- ### 3/3 · schema-coins-engine (attribution auto des JD Coins)
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
