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
