-- ============================================================================
-- COURS DE DÉMO (planning à venir) — app Juste Debout School
-- Crée ~15 cours CORE sur les 12 prochains jours (soir), reliés aux vraies
-- fiches profs. Fait revenir le défilement de l'accueil + remplit le planning.
-- Idempotent : ne recrée pas un cours identique (même école/heure/style).
-- Prérequis : fiches profs (schema-teachers-seed). À lancer dans le SQL Editor.
-- ============================================================================

insert into public.jds_sessions (school_id, teacher_id, style, level, kind, starts_at, duration_min, capacity, price_cents, status)
select
  (select id from public.jds_schools where code = 'CORE'),
  (select id from public.jds_teachers where name = v.teacher limit 1),
  v.style, v.level, 'open',
  date_trunc('day', now()) + (v.dayoff || ' days')::interval + v.tm::interval,
  75, 25, 1500, 'scheduled'
from (values
  (1,  '19:00', 'House',     'inter',    'Ulijen'),
  (1,  '20:30', 'Popping',   'all',      'Creesto'),
  (2,  '19:00', 'Hip-Hop',   'beginner', 'Choupi'),
  (2,  '20:30', 'Locking',   'all',      'Jimmysoul'),
  (3,  '19:00', 'Dancehall', 'all',      'Lindsey'),
  (4,  '19:00', 'House',     'advanced', 'Rabah'),
  (4,  '20:30', 'Bboying',   'all',      'François Kaleka'),
  (5,  '19:00', 'Amapiano',  'all',      'Andy Dlamini'),
  (6,  '19:00', 'Popping',   'inter',    'Sonia'),
  (7,  '19:00', 'Hip-Hop',   'all',      'Krissy'),
  (7,  '20:30', 'House',     'all',      'Rickysoul'),
  (8,  '19:00', 'Locking',   'inter',    'Kota'),
  (9,  '19:00', 'Dancehall', 'inter',    'Queensy'),
  (10, '19:00', 'House',     'beginner', 'Jihene Grae'),
  (10, '20:30', 'Popping',   'advanced', 'Ness'),
  (12, '19:00', 'Hip-Hop',   'inter',    'Paul Ereck')
) as v(dayoff, tm, style, level, teacher)
where not exists (
  select 1 from public.jds_sessions s
  where s.school_id = (select id from public.jds_schools where code = 'CORE')
    and s.starts_at = date_trunc('day', now()) + (v.dayoff || ' days')::interval + v.tm::interval
    and s.style = v.style
);
