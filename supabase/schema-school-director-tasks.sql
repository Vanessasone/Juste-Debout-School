-- Shared Nicolas workspace. Existing director authorization; no business validations.
create table school_private.director_tasks (
 id uuid primary key default gen_random_uuid(), seed_key text unique,
 title text not null check(length(title) between 1 and 180),
 detail text not null default '' check(length(detail)<=1600),
 destination text not null default 'admin' check(destination in ('admin','enrollments.html','finance-import.html','tuition.html','bulletins.html','admin-training','admin-responsibilities','rental-accounts.html')),
 priority integer not null default 2 check(priority between 1 and 3),
 status text not null default 'todo' check(status in ('todo','progress','waiting','done')),
 note text not null default '' check(length(note)<=2000),
 revision integer not null default 1, updated_at timestamptz not null default now(), updated_by uuid
);
alter table school_private.director_tasks enable row level security;
revoke all on school_private.director_tasks from public,anon,authenticated;
create table school_private.director_task_events (
 id bigint generated always as identity primary key, task_id uuid not null references school_private.director_tasks(id),
 snapshot jsonb not null, recorded_at timestamptz not null default now(), actor uuid not null
);
alter table school_private.director_task_events enable row level security;
revoke all on school_private.director_task_events from public,anon,authenticated;
create function school_private.director_tasks_read() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not school_private.finance_allowed() then raise exception 'Accès réservé aux directeurs School activés.'; end if;
 return coalesce((select jsonb_agg(to_jsonb(t) - 'seed_key' order by t.priority,t.updated_at,t.id) from school_private.director_tasks t),'[]');
end $$;
create function school_private.director_task_save(task_id uuid,expected_revision integer,new_title text,new_status text,new_note text) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved school_private.director_tasks;
begin
 if not school_private.finance_allowed() then raise exception 'Accès réservé aux directeurs School activés.'; end if;
 if new_status is null or new_status not in ('todo','progress','waiting','done') or new_note is null or length(new_note)>2000 then raise exception 'Statut ou note invalide.'; end if;
 if task_id is null then
  if new_title is null or length(btrim(new_title)) not between 1 and 180 then raise exception 'Titre requis (180 caractères maximum).'; end if;
  insert into school_private.director_tasks(title,status,note,updated_by) values(btrim(new_title),new_status,new_note,auth.uid()) returning * into saved;
 else
  update school_private.director_tasks set status=new_status,note=new_note,revision=revision+1,updated_at=now(),updated_by=auth.uid()
   where id=task_id and revision=expected_revision returning * into saved;
  if not found then raise exception 'Cette tâche a changé. Actualise la page avant de réessayer.'; end if;
 end if;
 insert into school_private.director_task_events(task_id,snapshot,actor) values(saved.id,to_jsonb(saved),auth.uid());
 return to_jsonb(saved)-'seed_key';
end $$;
revoke all on function school_private.director_tasks_read() from public,anon,authenticated;
revoke all on function school_private.director_task_save(uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function school_private.director_tasks_read(),school_private.director_task_save(uuid,integer,text,text,text) to authenticated;
create function public.jds_director_tasks() returns jsonb language sql stable security invoker set search_path='' as $$ select school_private.director_tasks_read() $$;
create function public.jds_save_director_task(task_id uuid,expected_revision integer,new_title text,new_status text,new_note text) returns jsonb language sql security invoker set search_path='' as $$ select school_private.director_task_save(task_id,expected_revision,new_title,new_status,new_note) $$;
revoke all on function public.jds_director_tasks(),public.jds_save_director_task(uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.jds_director_tasks(),public.jds_save_director_task(uuid,integer,text,text,text) to authenticated;
insert into school_private.director_tasks(seed_key,title,detail,destination,priority) values
 ('pilot','Commencer par CORE · P1','Reprendre une première promotion : modalités d’inscription, dossier élève et suivi financier. Vérifier un premier dossier complet avant de généraliser.','enrollments.html',1),
 ('finance','Reprendre les tarifs, aides et paiements existants','Saisir à la main ou importer le suivi réel. Relire les lignes proposées, confirmer les conditions et vérifier chaque règlement sur sa pièce source.','finance-import.html',1),
 ('rules','Confirmer les modalités d’inscription des formations','Vérifier les documents attendus, les tarifs de référence et les règles avant de préparer les invitations personnelles.','enrollments.html',1),
 ('students','Vérifier les comptes et rattachements élèves','Contrôler les promotions et les identités avant de rattacher les comptes.','admin-training',2),
 ('bulletins','Vérifier matières, professeurs et cours réellement dispensés','Compléter les catégories et le nombre de cours effectivement dispensés pour la période avant toute publication de bulletin.','bulletins.html',2),
 ('calendar','Confirmer les prochaines périodes du calendrier','Relire les dates prévisionnelles, les horaires et les salles dans le planning.','admin-training',2),
 ('rentals','Vérifier les locations et règlements repris','Contrôler les créneaux, les tarifs convenus et les règlements sur les documents réels.','rental-accounts.html',2),
 ('access','Contrôler les accès des responsables','Vérifier que chaque responsable possède son compte et le bon périmètre School.','admin-responsibilities',2),
 ('qonto','Préparer la connexion Qonto','Définir avec Vanessa les besoins et les accès nécessaires. Le suivi actuel est manuel. Conserver les identifiants et clés hors des notes de cet espace.','tuition.html',3);
notify pgrst,'reload schema';
