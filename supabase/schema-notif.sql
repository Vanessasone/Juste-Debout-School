-- ============================================================
-- Notifications in-app (broadcast). À exécuter dans le même projet. Idempotent.
-- ============================================================
create table if not exists public.jds_notifications (
  id uuid primary key default gen_random_uuid(),
  scope_school_id uuid references public.jds_schools(id) on delete cascade, -- null = toutes les écoles
  kind text not null default 'info',   -- info | absence | replacement | reminder
  title text not null,
  body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_jds_notif_created on public.jds_notifications(created_at desc);

alter table public.jds_notifications enable row level security;

drop policy if exists jds_notif_read on public.jds_notifications;
create policy jds_notif_read on public.jds_notifications for select to authenticated using (true);

drop policy if exists jds_notif_staff on public.jds_notifications;
create policy jds_notif_staff on public.jds_notifications for all to authenticated
  using (public.is_admin() or exists (select 1 from public.jds_school_staff s where s.profile_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.jds_school_staff s where s.profile_id = auth.uid()));
