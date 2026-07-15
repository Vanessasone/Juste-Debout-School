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
