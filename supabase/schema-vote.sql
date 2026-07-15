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
