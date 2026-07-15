-- Donne les droits admin + staff au compte bruceykanji1@gmail.com.
-- (Le compte doit déjà exister — sinon crée-le d'abord via « Créer un compte ».)

insert into public.profiles (id)
select id from auth.users where email = 'bruceykanji1@gmail.com'
on conflict (id) do nothing;

update public.profiles
set roles = array(
  select distinct unnest(coalesce(roles, '{}'::text[]) || array['admin','staff'])
)
where id = (select id from auth.users where email = 'bruceykanji1@gmail.com');

select id, roles from public.profiles
where id = (select id from auth.users where email = 'bruceykanji1@gmail.com');
