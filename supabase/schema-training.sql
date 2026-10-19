create table public.jds_training_groups(
 id uuid primary key default gen_random_uuid(),campus text not null check(campus in ('CORE','INDUSTRY')),
 name text not null check(length(trim(name)) between 1 and 100),season text not null default '2026-2027',
 created_at timestamptz not null default now(),unique(campus,name,season));
create table public.jds_training_members(
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.jds_training_groups(id),
 person_id uuid not null references public.jds_private_directory(id),profile_id uuid references public.profiles(id),
 created_at timestamptz not null default now(),unique(group_id,person_id));
create table public.jds_training_lessons(
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.jds_training_groups(id),
 title text not null check(length(trim(title)) between 1 and 200),teacher text not null default '' check(length(teacher)<=200),
 room text not null default '' check(length(room)<=200),starts_at timestamptz not null,ends_at timestamptz not null,
 status text not null default 'draft' check(status in ('draft','published','cancelled')),
 created_at timestamptz not null default now(),check(ends_at>starts_at and ends_at<=starts_at+interval '1 day'));
create table public.jds_training_attendance(
 id uuid primary key default gen_random_uuid(),lesson_id uuid not null references public.jds_training_lessons(id),
 member_id uuid not null references public.jds_training_members(id),
 status text not null check(status in ('present','absent','late','excused')),note text not null default '' check(length(note)<=1000),
 recorded_by uuid references public.profiles(id) default auth.uid(),recorded_at timestamptz not null default now(),
 unique(lesson_id,member_id));
create table public.jds_training_posts(
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.jds_training_groups(id),
 title text not null check(length(trim(title)) between 1 and 200),body text not null default '' check(length(body)<=5000),
 kind text not null check(kind in ('announcement','document')),storage_path text,
 status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now(),
 check((kind='document' and storage_path is not null and split_part(storage_path,'/',1)=group_id::text) or (kind='announcement' and storage_path is null)));
create table public.jds_training_periods(
 id uuid primary key default gen_random_uuid(),title text not null,starts_on date not null,ends_on date not null,
 source text not null default 'Calendrier prévisionnel School 2026-2027',published boolean not null default false,
 check(ends_on>=starts_on),unique(title,starts_on,ends_on));
create index training_members_profile on public.jds_training_members(profile_id,group_id);
create index training_lessons_group_start on public.jds_training_lessons(group_id,starts_at);
create index training_posts_group on public.jds_training_posts(group_id,created_at);
create index training_attendance_member on public.jds_training_attendance(member_id);
alter table public.jds_training_groups enable row level security;
alter table public.jds_training_members enable row level security;
alter table public.jds_training_lessons enable row level security;
alter table public.jds_training_attendance enable row level security;
alter table public.jds_training_posts enable row level security;
alter table public.jds_training_periods enable row level security;
revoke all on public.jds_training_groups,public.jds_training_members,public.jds_training_lessons,public.jds_training_attendance,public.jds_training_posts,public.jds_training_periods from anon,authenticated;
grant select,insert,update on public.jds_training_groups,public.jds_training_members,public.jds_training_lessons,public.jds_training_attendance,public.jds_training_posts,public.jds_training_periods to authenticated;
create policy training_members_read on public.jds_training_members for select to authenticated using(public.is_admin() or profile_id=auth.uid());
create policy training_groups_read on public.jds_training_groups for select to authenticated using(public.is_admin() or exists(select 1 from public.jds_training_members m where m.group_id=id and m.profile_id=auth.uid()));
create policy training_lessons_read on public.jds_training_lessons for select to authenticated using(public.is_admin() or (status in ('published','cancelled') and exists(select 1 from public.jds_training_members m where m.group_id=jds_training_lessons.group_id and m.profile_id=auth.uid())));
create policy training_attendance_read on public.jds_training_attendance for select to authenticated using(public.is_admin() or exists(select 1 from public.jds_training_members m where m.id=member_id and m.profile_id=auth.uid()));
create policy training_posts_read on public.jds_training_posts for select to authenticated using(public.is_admin() or (status='published' and exists(select 1 from public.jds_training_members m where m.group_id=jds_training_posts.group_id and m.profile_id=auth.uid())));
create policy training_periods_read on public.jds_training_periods for select to authenticated using(public.is_admin() or (published and exists(select 1 from public.jds_training_members m where m.profile_id=auth.uid())));
do $$declare t text;begin foreach t in array array['jds_training_groups','jds_training_members','jds_training_lessons','jds_training_attendance','jds_training_posts','jds_training_periods'] loop
 execute format('create policy %I on public.%I for insert to authenticated with check(public.is_admin())',t||'_insert',t);
 execute format('create policy %I on public.%I for update to authenticated using(public.is_admin()) with check(public.is_admin())',t||'_update',t);
end loop;end $$;
create function public.jds_validate_training_member() returns trigger language plpgsql set search_path='' as $$
declare school text; student_school text;ptype text;review text;begin
 select campus into school from public.jds_training_groups where id=new.group_id;
 select campus,person_type,review_status into student_school,ptype,review from public.jds_private_directory where id=new.person_id;
 if school is distinct from student_school or ptype is distinct from 'student' then raise exception 'École ou fiche élève incompatible.';end if;
 if new.profile_id is not null and review is distinct from 'verified' then raise exception 'Valide la fiche avant de rattacher un compte.';end if;
 return new;end $$;
revoke all on function public.jds_validate_training_member() from public;
create trigger training_member_check before insert or update on public.jds_training_members for each row execute function public.jds_validate_training_member();
create function public.jds_validate_training_attendance() returns trigger language plpgsql set search_path='' as $$
declare lg uuid;mg uuid;ls text;begin
 select group_id,status into lg,ls from public.jds_training_lessons where id=new.lesson_id;
 select group_id into mg from public.jds_training_members where id=new.member_id;
 if lg is distinct from mg then raise exception 'Cet élève ne fait pas partie de cette promotion.';end if;
 if ls is distinct from 'published' then raise exception 'L’appel est réservé aux cours publiés.';end if;
 new.recorded_by=auth.uid();new.recorded_at=now();return new;end $$;
revoke all on function public.jds_validate_training_attendance() from public;
create trigger training_attendance_check before insert or update on public.jds_training_attendance for each row execute function public.jds_validate_training_attendance();
insert into public.jds_training_groups(campus,name) select c,p from unnest(array['CORE','INDUSTRY']) c cross join unnest(array['P1','P2','P3']) p;
insert into public.jds_training_members(group_id,person_id)
 select g.id,d.id from public.jds_training_groups g join public.jds_private_directory d on d.campus=g.campus and d.cohort=g.name and d.person_type='student';
insert into public.jds_training_periods(title,starts_on,ends_on) values
 ('Rentrée prévisionnelle','2026-09-28','2026-09-28'),
 ('Vacances de la Toussaint','2026-10-24','2026-11-01'),
 ('Vacances de Noël','2026-12-19','2027-01-03'),
 ('Vacances d’hiver','2027-02-27','2027-03-14'),
 ('Vacances de printemps','2027-04-10','2027-04-25');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('school-training','school-training',false,20971520,array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
create policy training_files_read on storage.objects for select to authenticated using(bucket_id='school-training' and (public.is_admin() or exists(select 1 from public.jds_training_members m join public.jds_training_posts p on p.group_id=m.group_id where m.profile_id=auth.uid() and p.status='published' and p.storage_path=name)));
create policy training_files_insert on storage.objects for insert to authenticated with check(bucket_id='school-training' and public.is_admin());
create policy training_files_delete on storage.objects for delete to authenticated using(bucket_id='school-training' and public.is_admin());
