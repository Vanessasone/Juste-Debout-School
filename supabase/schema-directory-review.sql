-- Applied to the dedicated School project. Preserve verification provenance.
alter table public.jds_private_directory add column if not exists updated_at timestamptz not null default now(), add column if not exists reviewed_at timestamptz, add column if not exists reviewed_by uuid references auth.users(id);
create or replace function public.jds_stamp_directory_review() returns trigger language plpgsql set search_path='' as $$
begin
 new.updated_at=now();
 if (to_jsonb(new)-array['updated_at','review_status','reviewed_at','reviewed_by']) is distinct from (to_jsonb(old)-array['updated_at','review_status','reviewed_at','reviewed_by']) then
  new.review_status='pending';new.reviewed_at=null;new.reviewed_by=null;
 elsif new.review_status='verified' and old.review_status is distinct from 'verified' then
  new.reviewed_at=now();new.reviewed_by=auth.uid();
 elsif new.review_status='pending' then
  new.reviewed_at=null;new.reviewed_by=null;
 else
  new.reviewed_at=old.reviewed_at;new.reviewed_by=old.reviewed_by;
 end if;
 return new;
end $$;
revoke all on function public.jds_stamp_directory_review() from public;
-- Trigger directory_review_stamp is already installed by the migration.
