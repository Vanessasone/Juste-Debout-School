begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('school-avatars','school-avatars',false,5242880,array['image/jpeg','image/png']);
create policy school_avatar_read on storage.objects for select to authenticated using (
bucket_id='school-avatars' and (name=(select auth.uid())::text || '/avatar' or public.is_admin()));
create policy school_avatar_insert on storage.objects for insert to authenticated with check (
bucket_id='school-avatars' and name=(select auth.uid())::text || '/avatar');
create policy school_avatar_update on storage.objects for update to authenticated using (
bucket_id='school-avatars' and name=(select auth.uid())::text || '/avatar')
with check (bucket_id='school-avatars' and name=(select auth.uid())::text || '/avatar');
commit;
