-- School-only access for the public timetable and private training lessons.
create table school_private.schedule_editors (
  email text primary key check (email = lower(trim(email))),
  profile_id uuid unique references public.profiles(id) on delete restrict
);
revoke all on school_private.schedule_editors from public, anon, authenticated;
insert into school_private.schedule_editors(email) values ('jay@juste-debout.com');

create function public.jds_schedule_editor_access() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    public.is_admin() or exists (
      select 1 from school_private.schedule_editors e where e.profile_id = auth.uid()
    )
  )
$$;

-- A pending grant binds once, after School has verified the exact email.
create function public.jds_activate_schedule_editor() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update school_private.schedule_editors e
  set profile_id = auth.uid()
  where e.profile_id is null
    and exists (
      select 1 from auth.users u join public.profiles p on p.id = u.id
      where u.id = auth.uid() and lower(u.email) = e.email and u.email_confirmed_at is not null and u.confirmation_sent_at is not null
        and (u.banned_until is null or u.banned_until <= now())
    );
  return public.jds_schedule_editor_access();
end
$$;
revoke all on function public.jds_schedule_editor_access(), public.jds_activate_schedule_editor() from public, anon;
grant execute on function public.jds_schedule_editor_access(), public.jds_activate_schedule_editor() to authenticated;

create table public.jds_public_schedule (
  id uuid primary key default gen_random_uuid(),
  campus text not null check (campus in ('CORE','INDUSTRY')),
  kind text not null check (kind in ('weekly','open','workshop','camp','spectacle')),
  title text not null check (length(trim(title)) between 1 and 200),
  teacher text not null default '' check (length(teacher)<=200),
  room text not null default '' check (length(room)<=200),
  weekday integer,
  starts_on date,
  ends_on date,
  hours text not null check (length(trim(hours)) between 1 and 160),
  notes text not null default '' check (length(notes)<=2000),
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  check (
    (kind = 'weekly' and weekday is not null and weekday between 1 and 7 and starts_on is null and ends_on is null)
    or (kind <> 'weekly' and weekday is null and starts_on is not null and ends_on is not null and ends_on >= starts_on)
  )
);
alter table public.jds_public_schedule enable row level security;
revoke all on public.jds_public_schedule from public, anon, authenticated;
grant select on public.jds_public_schedule to anon, authenticated;
grant insert, update on public.jds_public_schedule to authenticated;
create policy schedule_public_read on public.jds_public_schedule for select to anon, authenticated
  using (status = 'published');
create policy schedule_editor_read on public.jds_public_schedule for select to authenticated
  using ((select public.jds_schedule_editor_access()));
create policy schedule_editor_create on public.jds_public_schedule for insert to authenticated
  with check ((select public.jds_schedule_editor_access()));
create policy schedule_editor_update on public.jds_public_schedule for update to authenticated
  using ((select public.jds_schedule_editor_access()))
  with check ((select public.jds_schedule_editor_access()));

-- Grant calendar access independently of enrolment, attendance, documents and finances.
create policy schedule_editor_group_read on public.jds_training_groups for select to authenticated
  using ((select public.jds_schedule_editor_access()));
create policy schedule_editor_lesson_read on public.jds_training_lessons for select to authenticated
  using ((select public.jds_schedule_editor_access()));
create policy schedule_editor_lesson_create on public.jds_training_lessons for insert to authenticated
  with check ((select public.jds_schedule_editor_access()));
create policy schedule_editor_lesson_update on public.jds_training_lessons for update to authenticated
  using ((select public.jds_schedule_editor_access()))
  with check ((select public.jds_schedule_editor_access()));

-- Preserve the already published public timetable, without the withdrawn Industry workshops.
insert into public.jds_public_schedule(campus,kind,title,teacher,room,weekday,starts_on,ends_on,hours,notes,status) values
  ('CORE', 'weekly', 'Hip-Hop', 'AYÉLÉ', '', 1, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'Locking', 'LA PETITE', '', 1, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop', 'BABYROC1', '', 1, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'House Dance', 'DANESHIRO', '', 1, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'Dancehall', 'QUEENSY', '', 1, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop', 'LA SALLE ROSE', '', 1, null, null, '20:30', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop', 'K.YOO', '', 2, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'House Dance', 'TARIK', '', 2, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'Locking', 'KOTA', '', 2, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'Popping', 'ASTON', '', 2, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop', 'SOYYMIMY', '', 2, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'House Dance', 'HPONE', '', 2, null, null, '20:30', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop Kids', 'CAMILLA', '', 3, null, null, '17:00', '7–10 ans', 'published'),
  ('CORE', 'weekly', 'Hip-Hop Kids', 'CAMILLA', '', 3, null, null, '18:00', '11–14 ans', 'published'),
  ('CORE', 'weekly', 'Bboying', 'DYSDYS', '', 3, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'House Dance', 'BOUSTESSE', '', 3, null, null, '20:30', '', 'published'),
  ('CORE', 'weekly', 'Voguing', 'AXOO', '', 4, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop', 'SPIDER', '', 4, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'Jazz Rock', 'DOMINIQUE LESDEMA', '', 4, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop', 'T20', '', 4, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'House Dance', 'RICKYSOUL', '', 4, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'Popping', 'KOTA', '', 4, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'House Dance', 'HENRIQUE', '', 5, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop', 'GIU', '', 5, null, null, '17:30', '', 'published'),
  ('CORE', 'weekly', 'Amapiano', 'ANDY', '', 5, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop', 'TRIX', '', 5, null, null, '19:00', '', 'published'),
  ('CORE', 'weekly', 'Hip-Hop Kids', 'IONY', '', 6, null, null, '11:30', '7–10 ans', 'published'),
  ('CORE', 'weekly', 'Hip-Hop Kids', 'IONY', '', 6, null, null, '12:30', '11–14 ans', 'published'),
  ('INDUSTRY', 'weekly', 'Afro', 'Gwendo', 'Salle 2', 1, null, null, '16:30–17:30', 'Enfants', 'published'),
  ('INDUSTRY', 'weekly', 'Afro', 'Gwendo', 'Salle 2', 1, null, null, '17:30–18:30', 'Ados', 'published'),
  ('INDUSTRY', 'weekly', 'Yoga', 'Mina', 'Salle 3', 1, null, null, '17:00–18:00', '', 'published'),
  ('INDUSTRY', 'weekly', 'Modern', 'Flavie', 'Salle 1', 2, null, null, '19:30–21:00', 'Date de début à confirmer après l’ouverture', 'published'),
  ('INDUSTRY', 'weekly', 'House choreo', 'Julien', 'Salle 2', 2, null, null, '20:00–21:30', 'Premier trimestre', 'published'),
  ('INDUSTRY', 'weekly', 'Dancehall choreo', 'Queensy', 'Salle 3', 2, null, null, '18:30–20:00', '', 'published'),
  ('INDUSTRY', 'weekly', 'Hip-hop', 'Tarik', 'Salle 2', 3, null, null, '16:30–17:30', 'Enfants · 10–12 ans', 'published'),
  ('INDUSTRY', 'weekly', 'House', 'Tarik', 'Salle 2', 3, null, null, '17:30–18:30', 'Ados · 13–16 ans', 'published'),
  ('INDUSTRY', 'weekly', 'Reggaeton choreo', 'Cristian', 'Salle 2', 3, null, null, '18:30–20:00', '', 'published'),
  ('INDUSTRY', 'weekly', 'Heels', 'Enzo', 'Salle 1', 4, null, null, 'Horaire à confirmer · 3 h', '2 h technique + 1 h chorégraphie', 'published'),
  ('INDUSTRY', 'weekly', 'Hip-hop choreo', 'Giulia', 'Salle 3', 4, null, null, '17:00–18:00', 'Ados · orthographe du nom à confirmer', 'published'),
  ('INDUSTRY', 'weekly', 'Hip-hop choreo', 'Giulia & Ayélé', 'Salle 3', 4, null, null, '18:00–19:30', '', 'published'),
  ('INDUSTRY', 'weekly', 'Danse enfants', 'Kaliana', 'Salle 2', 5, null, null, '16:30–17:30', 'Discipline à confirmer', 'published'),
  ('INDUSTRY', 'weekly', 'Danse ados', 'Kaliana', 'Salle 2', 5, null, null, '17:30–18:30', 'Discipline à confirmer', 'published'),
  ('INDUSTRY', 'weekly', 'K-pop', 'Djakka / Julien', 'Salle 2', 5, null, null, '18:30–20:00', 'Attribution à confirmer', 'published'),
  ('INDUSTRY', 'weekly', 'Reggaeton choreo', 'Samuel Solerr', 'Salle 2', 5, null, null, '20:00–22:00', '', 'published'),
  ('INDUSTRY', 'weekly', 'Yoga', 'Mina', 'Salle 3', 5, null, null, '17:00–18:00', '', 'published'),
  ('INDUSTRY', 'weekly', 'Salsa shine', 'Maeva Dancer', 'Salle 3', 5, null, null, '18:00–19:30', '', 'published'),
  ('CORE', 'workshop', 'DEEP HOUSE MISSION', '', '', null, '2026-10-23', '2026-10-23', '17h30 - 19h · heure de Paris', 'Programme prévisionnel · Accès, lieu, tarif et modalités à confirmer auprès de l’école.', 'published'),
  ('CORE', 'camp', 'Junior Dance Camp', '', '', null, '2026-12-21', '2026-12-23', '10h–12h et 14h–16h · heure de Paris', 'Hip-hop, House, Locking, Popping et Breaking au programme. Lieu, tarifs et modalités d’inscription à confirmer auprès de l’école.', 'published'),
  ('CORE', 'camp', 'Junior Dance Camp', '', '', null, '2027-02-15', '2027-02-19', '10h–12h et 14h–16h · heure de Paris', 'Programme prévisionnel · Accès, lieu, tarif et modalités à confirmer auprès de l’école.', 'published'),
  ('CORE', 'camp', 'Junior Dance Camp', '', '', null, '2027-04-12', '2027-04-16', '10h–12h et 14h–16h · heure de Paris', 'Programme prévisionnel · Accès, lieu, tarif et modalités à confirmer auprès de l’école.', 'published'),
  ('CORE', 'spectacle', 'JD School on Stage', '', '', null, '2027-06-13', '2027-06-13', '14h-15h30 / 16h-17h30 · heure de Paris', 'Programme prévisionnel · Accès, lieu, tarif et modalités à confirmer auprès de l’école.', 'published'),
  ('CORE', 'camp', 'Junior Dance Camp', '', '', null, '2027-07-05', '2027-07-09', '10h–12h et 14h–16h · heure de Paris', 'Programme prévisionnel · Accès, lieu, tarif et modalités à confirmer auprès de l’école.', 'published'),
  ('CORE', 'camp', 'Junior Dance Camp', '', '', null, '2027-07-12', '2027-07-16', '10h–12h et 14h–16h · heure de Paris', 'Programme prévisionnel · Accès, lieu, tarif et modalités à confirmer auprès de l’école.', 'published');
