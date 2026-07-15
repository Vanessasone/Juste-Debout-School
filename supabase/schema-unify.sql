-- ============================================================
-- Unification du VIVIER + école sur les fiches.
-- Les fiches (jds_teachers) deviennent la source UNIQUE : candidats de vote,
-- profs de cours ET sujets de classement — chacune rattachée à une population
-- et à une école. Idempotent.
-- ⚠️ Purge les points de classement de DÉMO (ils pointaient sur l'ancien vivier).
-- ============================================================

-- 1) École + population sur les fiches
alter table public.jds_teachers add column if not exists population text not null default 'open_teacher';
alter table public.jds_teachers add column if not exists school_id uuid references public.jds_schools(id) on delete set null;

-- 2) Repointer le registre de points vers les fiches
alter table public.ranking_points drop constraint if exists ranking_points_subject_id_fkey;
delete from public.ranking_points;  -- points de démo (ancien vivier ranking_subjects)
alter table public.ranking_points
  add constraint ranking_points_subject_id_fkey
  foreign key (subject_id) references public.jds_teachers(id) on delete cascade;

-- 3) Nouvelle vue classement, basée sur les fiches (population + école)
drop view if exists public.v_ranking_leaderboard;
create view public.v_ranking_leaderboard with (security_invoker = on) as
select
  t.population,
  rp.season,
  t.id as subject_id,
  t.name,
  array_to_string(t.styles, ' · ') as subtitle,
  t.school_id,
  sum(rp.points)::int as score,
  count(*) as events
from public.ranking_points rp
join public.jds_teachers t on t.id = rp.subject_id
group by t.population, rp.season, t.id, t.name, t.styles, t.school_id;

-- 4) La lecture des points suit la visibilité de la population de la fiche
drop policy if exists ranking_points_read on public.ranking_points;
create policy ranking_points_read on public.ranking_points for select to authenticated
  using (exists (
    select 1 from public.jds_teachers t
    where t.id = subject_id and public.ranking_can_see(t.population)
  ));

-- (L'ancienne table ranking_subjects n'est plus utilisée ; on la laisse en place,
--  sans risque. On pourra la supprimer plus tard.)
