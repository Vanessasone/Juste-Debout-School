create table public.jds_absence_requests (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.jds_training_members(id),
 starts_on date not null,ends_on date not null,
 proof_path text not null unique,proof_name text not null check(length(proof_name) between 1 and 200),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 submitted_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),
 reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,review_note text not null default '',
 check(ends_on>=starts_on and ends_on<=starts_on+366),
 check((status='pending' and reviewed_by is null and reviewed_at is null) or (status<>'pending' and reviewed_by is not null and reviewed_at is not null))
);
create index absence_requests_member_dates on public.jds_absence_requests(member_id,starts_on,ends_on);
alter table public.jds_absence_requests enable row level security;
revoke all on public.jds_absence_requests from anon,authenticated;
grant select on public.jds_absence_requests to authenticated;

create function school_private.absence_member_access(member_key text,manager_only boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id
 where m.id::text=member_key and (public.jds_can_manage_school(g.campus) or (not manager_only and m.profile_id=auth.uid())));
$$;
revoke all on function school_private.absence_member_access(text,boolean) from public,anon;
grant execute on function school_private.absence_member_access(text,boolean) to authenticated;
create policy absence_requests_read on public.jds_absence_requests for select to authenticated
 using(school_private.absence_member_access(member_id::text,false));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('school-absence-proofs','school-absence-proofs',false,10485760,array['application/pdf','image/jpeg','image/png']);
create policy absence_proof_insert on storage.objects for insert to authenticated with check(
 bucket_id='school-absence-proofs' and split_part(name,'/',1)=auth.uid()::text
 and school_private.absence_member_access(split_part(name,'/',2),false)
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png)$');
create policy absence_proof_read on storage.objects for select to authenticated using(
 bucket_id='school-absence-proofs' and (exists(select 1 from public.jds_absence_requests a where a.proof_path=name) or (split_part(name,'/',1)=auth.uid()::text and school_private.absence_member_access(split_part(name,'/',2),false) and not exists(select 1 from public.jds_absence_requests a where a.proof_path=name))));
-- Submitted documents cannot be replaced or deleted by clients. Unsubmitted uploads may be cleaned up by their uploader.
create policy absence_proof_cleanup on storage.objects for delete to authenticated using(
 bucket_id='school-absence-proofs' and split_part(name,'/',1)=auth.uid()::text
 and not exists(select 1 from public.jds_absence_requests a where a.proof_path=name));

create function public.jds_submit_absence(target_member uuid,first_day date,last_day date,document_path text,document_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if auth.uid() is null or not school_private.absence_member_access(target_member::text,false) then raise exception 'Accès refusé.';end if;
 -- Lock membership to serialize duplicate submissions for this pupil.
 perform 1 from public.jds_training_members where id=target_member for update;
 if first_day is null or last_day is null or last_day<first_day or last_day>first_day+366 then raise exception 'Période invalide.';end if;
 if document_name is null or length(trim(document_name)) not between 1 and 200 then raise exception 'Nom du justificatif requis.';end if;
 if document_path is null or split_part(document_path,'/',1)<>auth.uid()::text or split_part(document_path,'/',2)<>target_member::text
 or not exists(select 1 from storage.objects o where o.bucket_id='school-absence-proofs' and o.name=document_path
 and o.owner_id=auth.uid()::text and o.metadata->>'mimetype' in ('application/pdf','image/jpeg','image/png')
 and (o.metadata->>'size')::bigint between 1 and 10485760)
 then raise exception 'Un justificatif privé valide est obligatoire. Dépose le fichier avant de transmettre.';end if;
 if exists(select 1 from public.jds_absence_requests where member_id=target_member and status in ('pending','approved') and starts_on<=last_day and ends_on>=first_day)
 then raise exception 'Une déclaration est déjà en attente ou validée sur cette période.';end if;
 insert into public.jds_absence_requests(member_id,starts_on,ends_on,proof_path,proof_name,submitted_by)
 values(target_member,first_day,last_day,document_path,trim(document_name),auth.uid()) returning id into result;
 return result;end $$;
revoke all on function public.jds_submit_absence(uuid,date,date,text,text) from public,anon;
grant execute on function public.jds_submit_absence(uuid,date,date,text,text) to authenticated;

create function public.jds_review_absence(request_id uuid,decision text,decision_note text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare row public.jds_absence_requests;begin
 select * into row from public.jds_absence_requests where id=request_id for update;
 if auth.uid() is null or row.id is null or not school_private.absence_member_access(row.member_id::text,true) then raise exception 'Accès responsable requis.';end if;
 if decision is null or decision not in ('approved','rejected') then raise exception 'Décision invalide.';end if;
 if row.submitted_by=auth.uid() then raise exception 'Une autre personne habilitée doit valider cette déclaration.';end if;
 if length(coalesce(decision_note,''))>1000 or (decision='rejected' and length(trim(coalesce(decision_note,'')))=0) then raise exception 'Explique le refus (1 000 caractères maximum).';end if;
 if row.status=decision then return row.id;end if;
 if row.status<>'pending' then raise exception 'Cette déclaration a déjà été traitée.';end if;
 update public.jds_absence_requests set status=decision,reviewed_by=auth.uid(),reviewed_at=now(),review_note=coalesce(decision_note,'') where id=row.id;
 return row.id;end $$;
revoke all on function public.jds_review_absence(uuid,text,text) from public,anon;
grant execute on function public.jds_review_absence(uuid,text,text) to authenticated;
