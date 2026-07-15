-- ============================================================================
-- FICHES PROFS — base initiale (app Juste Debout School)
-- Source : professeurs listés sur juste-debout-school.com (page EN), juillet 2026.
-- ⚠️ À VÉRIFIER / CORRIGER : noms, styles, population et école sont une base de
-- départ. Rattachés à CORE (INDUSTRY ouvre en 2027). Photos à ajouter ensuite
-- via la fiche (Espace staff → Fiches profs/danseurs).
-- Idempotent : n'insère pas un prof déjà présent (par nom). Relançable.
-- À exécuter dans le SQL Editor du projet Supabase partagé.
-- ============================================================================

insert into public.jds_teachers (name, styles, population, school_id)
select v.name, v.styles, v.pop, (select id from public.jds_schools where code = 'CORE')
from (values
  -- Hip-Hop
  ('Choupi',          array['Hip-Hop']::text[],      'open_teacher'),
  ('Meech de France', array['Hip-Hop']::text[],      'open_teacher'),
  ('Paul Ereck',      array['Hip-Hop']::text[],      'open_teacher'),
  ('Krissy',          array['Hip-Hop']::text[],      'open_teacher'),
  ('Sophie May',      array['Hip-Hop']::text[],      'open_teacher'),
  ('Spider',          array['Hip-Hop']::text[],      'open_teacher'),
  ('Lumisow',         array['Hip-Hop']::text[],      'open_teacher'),
  -- House
  ('Ulijen',          array['House']::text[],        'open_teacher'),
  ('Jihene Grae',     array['House']::text[],        'open_teacher'),
  ('Rabah',           array['House']::text[],        'open_teacher'),
  ('Didier Firmin',   array['House']::text[],        'open_teacher'),
  ('Rickysoul',       array['House']::text[],        'open_teacher'),
  -- Popping
  ('Creesto',         array['Popping']::text[],      'open_teacher'),
  ('Sonia',           array['Popping']::text[],      'open_teacher'),
  ('Cintia Bandidas', array['Popping']::text[],      'open_teacher'),
  ('Ness',            array['Popping']::text[],      'open_teacher'),
  -- Locking
  ('Jimmysoul',       array['Locking']::text[],      'open_teacher'),
  ('Loïc Riou',       array['Locking']::text[],      'open_teacher'),
  ('Kota',            array['Locking']::text[],      'open_teacher'),
  -- Dancehall
  ('Lindsey',         array['Dancehall']::text[],    'open_teacher'),
  ('Queensy',         array['Dancehall']::text[],    'open_teacher'),
  -- Bboying
  ('François Kaleka', array['Bboying']::text[],       'open_teacher'),
  ('Dys Dys',         array['Bboying']::text[],       'open_teacher'),
  -- Autres styles
  ('Andy Dlamini',    array['Amapiano']::text[],      'open_teacher'),
  ('Leo Arrow',       array['Krump']::text[],         'open_teacher'),
  ('Petit Robert',    array['Jazz Rock']::text[],     'open_teacher'),
  ('Victoria Prevel', array['Modern Jazz']::text[],   'open_teacher'),
  ('Bastien Nozeran', array['Modern Jazz']::text[],   'open_teacher'),
  ('Roxane Butterfly',array['Claquettes']::text[],    'open_teacher'),
  -- Intervenants formation (complémentaires)
  ('Magali Duclos',   array['Yoga']::text[],                  'formation_teacher'),
  ('Regis',           array['Théâtre physique']::text[],      'formation_teacher'),
  ('JP Mano',         array['Histoire de la musique']::text[],'formation_teacher')
) as v(name, styles, pop)
where not exists (select 1 from public.jds_teachers t where lower(t.name) = lower(v.name));

-- Vérification : compte + aperçu
select population, count(*) from public.jds_teachers group by population;
