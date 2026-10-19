-- School dedicated project only. Private contacts are not authentication accounts.
create table public.jds_private_directory (
 id uuid primary key default gen_random_uuid(),
 external_key text not null unique check(length(external_key) between 1 and 800),
 campus text not null check(campus in ('CORE','INDUSTRY')),
 person_type text not null check(person_type in ('student','teacher')),
 first_name text not null check(length(trim(first_name)) between 1 and 200),
 last_name text not null check(length(trim(last_name)) between 1 and 200),
 email text check(email is null or length(email)<=320),
 phone text check(phone is null or length(phone)<=100),
 cohort text check(cohort is null or length(cohort)<=100),
 file_code text check(file_code is null or length(file_code)<=100),
 review_status text not null default 'pending' check(review_status in ('pending','verified')),
 created_at timestamptz not null default now()
);
alter table public.jds_private_directory enable row level security;
revoke all on public.jds_private_directory from anon,authenticated;
grant select,insert,update on public.jds_private_directory to authenticated;
create policy private_directory_admin_select on public.jds_private_directory for select to authenticated using(public.is_admin());
create policy private_directory_admin_insert on public.jds_private_directory for insert to authenticated with check(public.is_admin());
create policy private_directory_admin_update on public.jds_private_directory for update to authenticated using(public.is_admin()) with check(public.is_admin());
create index private_directory_names_idx on public.jds_private_directory(first_name,last_name);
