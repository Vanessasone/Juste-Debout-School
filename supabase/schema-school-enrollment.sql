-- Admission is a director decision. Links never grant a role or activate a student account.
create table public.jds_enrollment_rules(
 group_id uuid primary key references public.jds_training_groups(id),
 training_title text not null default '' check(length(training_title)<=200),
 starts_on date,ends_on date,reference_price_cents integer check(reference_price_cents>=0),
 payment_terms text not null default '' check(length(payment_terms)<=10000),
 school_terms text not null default '' check(length(school_terms)<=10000),
 requirements jsonb not null default '[]' check(jsonb_typeof(requirements)='array' and jsonb_array_length(requirements)<=20),
 ready boolean not null default false,revision integer not null default 1,
 updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now(),
 check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create table public.jds_enrollments(
 id uuid primary key default gen_random_uuid(),member_id uuid not null unique references public.jds_training_members(id),
 target_email text not null check(target_email=lower(btrim(target_email)) and length(target_email)<=320),
 profile_id uuid references public.profiles(id),
 status text not null default 'draft' check(status in ('draft','invited','in_progress','submitted','changes_requested','validated','cancelled')),
 rules_snapshot jsonb not null default '{}',token_hash text,token_expires_at timestamptz,
 admitted_by uuid references public.profiles(id),admitted_at timestamptz,
 phone text not null default '' check(length(phone)<=100),
 acknowledged boolean not null default false,submitted_at timestamptz,submitted_finance_hash text,
 review_note text not null default '' check(length(review_note)<=1000),
 validated_by uuid references public.profiles(id),validated_at timestamptz,
 revision integer not null default 1,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index enrollment_token_unique on public.jds_enrollments(token_hash) where token_hash is not null;
create index enrollment_profile on public.jds_enrollments(profile_id);
create table public.jds_enrollment_documents(
 id uuid primary key default gen_random_uuid(),enrollment_id uuid not null references public.jds_enrollments(id),requirement_id uuid not null,
 storage_path text not null unique,active boolean not null default true,
 status text not null default 'pending' check(status in ('pending','accepted','changes_requested')),
 review_note text not null default '' check(length(review_note)<=500),
 uploaded_by uuid not null references public.profiles(id),uploaded_at timestamptz not null default now(),
 reviewed_by uuid references public.profiles(id),reviewed_at timestamptz
);
create unique index enrollment_document_current on public.jds_enrollment_documents(enrollment_id,requirement_id) where active;
create table public.jds_enrollment_events(
 id bigint generated always as identity primary key,enrollment_id uuid references public.jds_enrollments(id),
 group_id uuid references public.jds_training_groups(id),actor_id uuid not null references public.profiles(id),recorded_at timestamptz not null default now(),
 kind text not null,snapshot jsonb not null
);
do $$declare t text;begin foreach t in array array['jds_enrollment_rules','jds_enrollments','jds_enrollment_documents','jds_enrollment_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy %I on public.%I for select to authenticated using((select school_private.finance_allowed()))',t||'_direction',t);
end loop;end $$;
-- Student reads are deliberately projected through a guarded RPC: no invitation hashes or private notes.

create function school_private.enrollment_finance(member_key uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('base_cents',a.base_cents,'discount_cents',a.discount_cents,'school_aid_cents',a.school_aid_cents,'funding',a.funding,
 'terms_confirmed',a.terms_confirmed,'schedule_confirmed',a.schedule_confirmed,'installments',a.installments,'agreed_cents',s.agreed_cents,'student_share_cents',s.student_share_cents,'external_cents',s.external_cents,'received_cents',s.received_cents,'balance_cents',s.balance_cents,'qonto_payment_url',a.qonto_payment_url)
 from public.jds_tuition_accounts a join public.jds_tuition_account_summary s on s.id=a.id where a.member_id=member_key and a.state='active'
$$;
revoke all on function school_private.enrollment_finance(uuid) from public,anon,authenticated;
create function school_private.enrollment_finance_hash(member_key uuid) returns text language sql stable security definer set search_path='' as $$
 select md5((school_private.enrollment_finance(member_key)-array['received_cents','balance_cents','qonto_payment_url'])::text)
$$;
revoke all on function school_private.enrollment_finance_hash(uuid) from public,anon,authenticated;

create function school_private.enrollment_action(action text,record_key uuid,expected_revision integer,details jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.jds_enrollments; r public.jds_enrollment_rules; g public.jds_training_groups; m public.jds_training_members; d public.jds_private_directory;
 doc public.jds_enrollment_documents; item jsonb; ids uuid[]:='{}'; reqs jsonb:='[]'; iid uuid; raw_token text; destination_email text; finance jsonb; result jsonb; key uuid;
begin
 if not school_private.finance_allowed() then raise exception 'Accès réservé aux quatre directeurs School activés.';end if;
 if action='group' then
  if btrim(coalesce(details->>'name',''))='' or length(details->>'name')>100 or btrim(coalesce(details->>'season',''))='' or length(details->>'season')>100 or coalesce(details->>'campus','') not in ('CORE','INDUSTRY') then raise exception 'École, promotion et saison requises.';end if;
  if record_key is null then
   insert into public.jds_training_groups(campus,name,season) values(details->>'campus',btrim(details->>'name'),btrim(details->>'season')) returning * into g;
  else
   select * into g from public.jds_training_groups where id=record_key for update;
   if not found then raise exception 'Formation introuvable.';end if;
   if g.created_at is distinct from (details->>'expected_created_at')::timestamptz or g.name is distinct from details->>'expected_name' or g.season is distinct from details->>'expected_season' or g.campus is distinct from details->>'expected_campus' then raise exception 'La formation a changé. Actualise avant de modifier.';end if;
   if (g.campus<>details->>'campus' or g.season<>btrim(details->>'season')) and exists(select 1 from public.jds_training_members where group_id=g.id) then raise exception 'Une formation avec des élèves conserve son école et sa saison. Crée une nouvelle formation pour un transfert.';end if;
   update public.jds_training_groups set campus=details->>'campus',name=btrim(details->>'name'),season=btrim(details->>'season') where id=g.id returning * into g;
  end if;
  insert into public.jds_enrollment_events(group_id,actor_id,kind,snapshot) values(g.id,auth.uid(),'group',to_jsonb(g));return to_jsonb(g);
 elsif action='rules' then
  select * into g from public.jds_training_groups where id=record_key for update;
  if not found then raise exception 'Formation introuvable.';end if;
  select * into r from public.jds_enrollment_rules where group_id=record_key for update;
  if coalesce(expected_revision,0)<>coalesce(r.revision,0) then raise exception 'La configuration a changé. Actualise avant de modifier.';end if;
  if jsonb_typeof(details->'requirements') is distinct from 'array' or jsonb_array_length(details->'requirements')>20 then raise exception '20 pièces demandées maximum.';end if;
  for item in select value from jsonb_array_elements(details->'requirements') loop
   iid:=(item->>'id')::uuid;
   if iid is null or iid=any(ids) or length(btrim(coalesce(item->>'label',''))) not between 1 and 150 then raise exception 'Chaque pièce demandée requiert un libellé distinct.';end if;
   ids:=array_append(ids,iid);reqs:=reqs||jsonb_build_array(jsonb_build_object('id',iid,'label',btrim(item->>'label'),'required',coalesce((item->>'required')::boolean,true)));
  end loop;
  if coalesce((details->>'ready')::boolean,false) and (length(btrim(coalesce(details->>'payment_terms','')))<20 or length(btrim(coalesce(details->>'school_terms','')))<20 or length(btrim(coalesce(details->>'training_title','')))<3) then raise exception 'Complète l’intitulé, les modalités de paiement et les informations d’inscription avant de confirmer la configuration.';end if;
  insert into public.jds_enrollment_rules(group_id,training_title,starts_on,ends_on,reference_price_cents,payment_terms,school_terms,requirements,ready,updated_by)
  values(record_key,btrim(coalesce(details->>'training_title','')),nullif(details->>'starts_on','')::date,nullif(details->>'ends_on','')::date,nullif(details->>'reference_price_cents','')::integer,coalesce(details->>'payment_terms',''),coalesce(details->>'school_terms',''),reqs,coalesce((details->>'ready')::boolean,false),auth.uid())
  on conflict(group_id) do update set training_title=excluded.training_title,starts_on=excluded.starts_on,ends_on=excluded.ends_on,reference_price_cents=excluded.reference_price_cents,payment_terms=excluded.payment_terms,school_terms=excluded.school_terms,requirements=excluded.requirements,ready=excluded.ready,updated_by=auth.uid(),updated_at=now(),revision=jds_enrollment_rules.revision+1 returning * into r;
  insert into public.jds_enrollment_events(group_id,actor_id,kind,snapshot) values(record_key,auth.uid(),'rules',to_jsonb(r));return to_jsonb(r);
 elsif action='student' then
  if not coalesce((details->>'admission_approved')::boolean,false) then raise exception 'Confirme explicitement l’admission avant d’ajouter cet élève.';end if;
  select * into g from public.jds_training_groups where id=record_key;
  destination_email:=lower(btrim(details->>'email'));
  if g.id is null or length(btrim(coalesce(details->>'first_name',''))) not between 1 and 200 or length(btrim(coalesce(details->>'last_name',''))) not between 1 and 200 or destination_email is null or destination_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Formation, prénom, nom et email valide requis.';end if;
  if exists(select 1 from public.jds_training_members tm join public.jds_training_groups tg on tg.id=tm.group_id join public.jds_private_directory pd on pd.id=tm.person_id where lower(btrim(pd.email))=destination_email and tg.season=g.season) then raise exception 'Un élève utilise déjà cette adresse pour cette saison. Retrouve sa fiche existante.';end if;
  insert into public.jds_private_directory(external_key,campus,person_type,first_name,last_name,email,cohort,source_details) values('admission:'||gen_random_uuid(),g.campus,'student',btrim(details->>'first_name'),btrim(details->>'last_name'),destination_email,g.name,'{"source":"School director admission"}') returning * into d;
  insert into public.jds_training_members(group_id,person_id) values(g.id,d.id) returning * into m;
  insert into public.jds_enrollments(member_id,target_email,admitted_by,admitted_at,created_by) values(m.id,destination_email,auth.uid(),now(),auth.uid()) returning * into e;
  insert into public.jds_enrollment_events(enrollment_id,group_id,actor_id,kind,snapshot) values(e.id,g.id,auth.uid(),'admission',to_jsonb(e)-'token_hash');return to_jsonb(e)-'token_hash';
 elsif action='prepare' then
  select * into m from public.jds_training_members where id=record_key;
  select * into d from public.jds_private_directory where id=m.person_id;
  destination_email:=lower(btrim(d.email));
  if m.id is null or destination_email is null or destination_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Renseigne une adresse email valide dans l’annuaire avant de préparer le lien.';end if;
  insert into public.jds_enrollments(member_id,target_email,created_by) values(m.id,destination_email,auth.uid()) on conflict(member_id) do nothing;
  select * into e from public.jds_enrollments where member_id=m.id;return to_jsonb(e)-'token_hash';
 end if;
 select * into e from public.jds_enrollments where id=record_key for update;
 if not found then raise exception 'Dossier introuvable.';end if;
 if expected_revision is distinct from e.revision then raise exception 'Le dossier a changé. Actualise avant de modifier.';end if;
 select * into m from public.jds_training_members where id=e.member_id;
 if action='issue' then
  if e.status in ('validated','cancelled') then raise exception 'Ce dossier est clos. Réouvre-le explicitement avant de renouveler un lien.';end if;
  if not coalesce((details->>'admission_approved')::boolean,false) then raise exception 'Confirme explicitement que cet élève est admis.';end if;
  select * into r from public.jds_enrollment_rules where group_id=m.group_id;
  if not coalesce(r.ready,false) then raise exception 'Confirme la configuration de cette formation avant de créer un lien.';end if;
  finance:=school_private.enrollment_finance(e.member_id);
  if finance is null or not coalesce((finance->>'terms_confirmed')::boolean,false) or not coalesce((finance->>'schedule_confirmed')::boolean,false) then raise exception 'Confirme le tarif, les aides et l’échéancier individuel avant d’émettre le dossier.';end if;
  select * into d from public.jds_private_directory where id=m.person_id;
  destination_email:=lower(btrim(d.email));
  if destination_email is null or destination_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or (e.profile_id is not null and destination_email<>e.target_email) then raise exception 'Vérifie l’adresse de destination ; un dossier réclamé conserve son titulaire.';end if;
  raw_token:=encode(extensions.gen_random_bytes(32),'hex');
  update public.jds_enrollments set target_email=destination_email,token_hash=encode(extensions.digest(raw_token,'sha256'),'hex'),token_expires_at=now()+interval '14 days',rules_snapshot=to_jsonb(r)-array['updated_by','updated_at'],admitted_by=auth.uid(),admitted_at=coalesce(admitted_at,now()),status=case when profile_id is null then 'invited' else 'changes_requested' end,acknowledged=false,revision=revision+1,updated_at=now(),review_note='' where id=e.id returning * into e;
  result:=jsonb_build_object('id',e.id,'revision',e.revision,'token',raw_token,'email',e.target_email,'expires_at',e.token_expires_at);
 elsif action='document' then
  select * into doc from public.jds_enrollment_documents where id=(details->>'document_id')::uuid and enrollment_id=e.id and active for update;
  if doc.id is null or coalesce(details->>'status','') not in ('accepted','changes_requested') or length(coalesce(details->>'review_note',''))>500 or (details->>'status'='changes_requested' and length(btrim(coalesce(details->>'review_note','')))<5) then raise exception 'Document courant, décision et motif de correction requis.';end if;
  if e.status in ('validated','cancelled') then raise exception 'Réouvre le dossier avant de modifier les pièces.';end if;
  update public.jds_enrollment_documents set status=details->>'status',review_note=coalesce(details->>'review_note',''),reviewed_by=auth.uid(),reviewed_at=now() where id=doc.id;
  update public.jds_enrollments set status=case when details->>'status'='changes_requested' then 'changes_requested' else status end,revision=revision+1,updated_at=now() where id=e.id returning * into e;
  result:=to_jsonb(e)-'token_hash';
 elsif action='activate' then
  select * into d from public.jds_private_directory where id=m.person_id;
  if e.status<>'validated' or e.profile_id is null or d.review_status<>'verified' or not exists(select 1 from auth.users u where u.id=e.profile_id and u.email_confirmed_at is not null and lower(u.email)=e.target_email and (u.banned_until is null or u.banned_until<now())) then raise exception 'Dossier validé, identité vérifiée et compte confirmé requis avant rattachement.';end if;
  if m.profile_id is not null and m.profile_id<>e.profile_id then raise exception 'Un autre compte est déjà rattaché à cet élève.';end if;
  update public.jds_training_members set profile_id=e.profile_id where id=m.id;
  update public.jds_enrollments set revision=revision+1,updated_at=now() where id=e.id returning * into e;
  result:=to_jsonb(e)-'token_hash';
 elsif action='review' then
  if coalesce(details->>'status','') not in ('validated','changes_requested','cancelled') then raise exception 'Décision inconnue.';end if;
  if details->>'status'='validated' then
   if e.status<>'submitted' or not e.acknowledged or e.profile_id is null or e.submitted_finance_hash is distinct from school_private.enrollment_finance_hash(e.member_id) then raise exception 'Un dossier soumis avec ses conditions actuelles doit être examiné avant validation.';end if;
   if exists(select 1 from jsonb_array_elements(e.rules_snapshot->'requirements') req where (req->>'required')::boolean and not exists(select 1 from public.jds_enrollment_documents ed where ed.enrollment_id=e.id and ed.requirement_id=(req->>'id')::uuid and ed.active and ed.status='accepted')) then raise exception 'Valide toutes les pièces obligatoires avant de valider l’inscription.';end if;
   if m.profile_id is not null and m.profile_id<>e.profile_id then raise exception 'Le rattachement actuel doit être vérifié dans l’administration.';end if;
   -- Do not verify a directory identity or grant access as a side effect of financial review.
   update public.jds_enrollments set status='validated',validated_by=auth.uid(),validated_at=now() where id=e.id;
  elsif details->>'status'='changes_requested' and length(btrim(coalesce(details->>'review_note','')))<5 then raise exception 'Précise la correction attendue.';
  end if;
  update public.jds_enrollments set status=details->>'status',review_note=coalesce(details->>'review_note',''),token_hash=case when details->>'status'='cancelled' then null else token_hash end,revision=revision+1,updated_at=now() where id=e.id returning * into e;
  result:=to_jsonb(e)-'token_hash';
 else raise exception 'Action inconnue.';
 end if;
 insert into public.jds_enrollment_events(enrollment_id,group_id,actor_id,kind,snapshot) values(e.id,m.group_id,auth.uid(),action,jsonb_build_object('dossier',to_jsonb(e)-'token_hash','details',details));
 return result;
end $$;
revoke all on function school_private.enrollment_action(text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function school_private.enrollment_action(text,uuid,integer,jsonb) to authenticated;
create function public.jds_enrollment_admin_action(action text,record_key uuid default null,expected_revision integer default null,details jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select school_private.enrollment_action(action,record_key,expected_revision,details)$$;
revoke all on function public.jds_enrollment_admin_action(text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.jds_enrollment_admin_action(text,uuid,integer,jsonb) to authenticated;

create function school_private.enrollment_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not school_private.finance_allowed() then raise exception 'Accès réservé aux quatre directeurs School activés.';end if;
 return jsonb_build_object('groups',coalesce((select jsonb_agg(to_jsonb(g) order by g.campus,g.name,g.season) from public.jds_training_groups g where g.campus in ('CORE','INDUSTRY')),'[]'),
 'rules',coalesce((select jsonb_agg(to_jsonb(r)) from public.jds_enrollment_rules r),'[]'),
 'enrollments',coalesce((select jsonb_agg(to_jsonb(e)-'token_hash') from public.jds_enrollments e),'[]'),
 'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.jds_enrollment_documents d where d.active),'[]'),
 'roster',coalesce((select jsonb_agg(jsonb_build_object('member_id',m.id,'group_id',m.group_id,'student_name',concat_ws(' ',d.first_name,d.last_name),'email',d.email,'profile_linked',m.profile_id is not null,'directory_verified',d.review_status='verified')) from public.jds_training_members m join public.jds_private_directory d on d.id=m.person_id),'[]'),
 'finances',coalesce((select jsonb_agg(jsonb_build_object('member_id',a.member_id,'terms_confirmed',a.terms_confirmed,'schedule_confirmed',a.schedule_confirmed,'state',a.state)) from public.jds_tuition_accounts a),'[]'));
end $$;
revoke all on function school_private.enrollment_workspace() from public,anon,authenticated;
grant execute on function school_private.enrollment_workspace() to authenticated;
create function public.jds_enrollment_workspace() returns jsonb language sql stable security invoker set search_path='' as $$select school_private.enrollment_workspace()$$;
revoke all on function public.jds_enrollment_workspace() from public,anon,authenticated;
grant execute on function public.jds_enrollment_workspace() to authenticated;

create function school_private.enrollment_owned(enrollment_key uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.jds_enrollments e join auth.users u on u.id=e.profile_id where e.id=enrollment_key and e.profile_id=auth.uid() and e.status not in ('draft','cancelled') and lower(u.email)=e.target_email and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now()))
$$;
revoke all on function school_private.enrollment_owned(uuid) from public,anon,authenticated;
-- Used internally and by Storage policies, never exposes a dossier.
grant execute on function school_private.enrollment_owned(uuid) to authenticated;
create function school_private.enrollment_student(action text,enrollment_key uuid,expected_revision integer,details jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.jds_enrollments; m public.jds_training_members; g public.jds_training_groups; d public.jds_private_directory; u auth.users;
 doc public.jds_enrollment_documents; finance jsonb; p text; iid uuid;
begin
 if auth.uid() is null then raise exception 'Connexion School requise.';end if;
 select * into u from auth.users where id=auth.uid();
 if u.email_confirmed_at is null or u.banned_until>now() then raise exception 'Un compte School avec email confirmé est requis.';end if;
 if action='claim' then
  if coalesce(details->>'token','') !~ '^[a-f0-9]{64}$' then raise exception 'Lien d’inscription invalide ou expiré.';end if;
  select * into e from public.jds_enrollments where token_hash=encode(extensions.digest(details->>'token','sha256'),'hex') and token_expires_at>now() and status not in ('draft','cancelled') for update;
  if e.id is null or lower(u.email)<>e.target_email or (e.profile_id is not null and e.profile_id<>auth.uid()) then raise exception 'Lien invalide, expiré ou destiné à une autre adresse. Utilise le compte School correspondant à l’invitation.';end if;
  if e.profile_id is null then
   update public.jds_enrollments set profile_id=auth.uid(),status='in_progress',revision=revision+1,updated_at=now() where id=e.id returning * into e;
   insert into public.jds_enrollment_events(enrollment_id,actor_id,kind,snapshot) values(e.id,auth.uid(),'claim',jsonb_build_object('profile_id',auth.uid()));
  end if;
 else
  if enrollment_key is null then select * into e from public.jds_enrollments where profile_id=auth.uid() and status not in ('draft','cancelled') order by created_at desc limit 1 for update;
  else select * into e from public.jds_enrollments where id=enrollment_key for update;end if;
  if e.id is null or not school_private.enrollment_owned(e.id) then raise exception 'Aucun dossier d’inscription accessible. Utilise le lien personnel transmis par la direction.';end if;
 end if;
 if action not in ('claim','read') then
  if expected_revision is distinct from e.revision then raise exception 'Le dossier a changé. Actualise avant de modifier.';end if;
  if action='withdraw' then
   if e.status<>'submitted' then raise exception 'Ce dossier n’est pas en attente de vérification.';end if;
   update public.jds_enrollments set status='in_progress',acknowledged=false,revision=revision+1,updated_at=now() where id=e.id returning * into e;
  elsif action='document' then
   if e.status not in ('in_progress','changes_requested','invited') then raise exception 'Réouvre ton dossier avant de remplacer une pièce.';end if;
   iid:=(details->>'requirement_id')::uuid;p:=details->>'storage_path';
   if not exists(select 1 from jsonb_array_elements(e.rules_snapshot->'requirements') x where x->>'id'=iid::text) or p is null or p !~ ('^'||e.id::text||'/'||iid::text||'/[a-f0-9-]+[.](pdf|jpg|jpeg|png)$') or not exists(select 1 from storage.objects o where o.bucket_id='school-enrollment' and o.name=p) then raise exception 'Pièce demandée et fichier privé valide requis.';end if;
   update public.jds_enrollment_documents set active=false where enrollment_id=e.id and requirement_id=iid and active;
   insert into public.jds_enrollment_documents(enrollment_id,requirement_id,storage_path,uploaded_by) values(e.id,iid,p,auth.uid()) returning * into doc;
   update public.jds_enrollments set status='in_progress',acknowledged=false,revision=revision+1,updated_at=now() where id=e.id returning * into e;
  elsif action='submit' then
   if e.status not in ('in_progress','changes_requested','invited') then raise exception 'Ce dossier n’est pas modifiable actuellement.';end if;
   if not coalesce((details->>'acknowledged')::boolean,false) or length(coalesce(details->>'phone',''))>100 then raise exception 'Confirme la lecture des modalités et vérifie ton numéro de téléphone.';end if;
   finance:=school_private.enrollment_finance(e.member_id);
   if finance is null or not coalesce((finance->>'terms_confirmed')::boolean,false) or not coalesce((finance->>'schedule_confirmed')::boolean,false) or details->>'finance_hash' is distinct from school_private.enrollment_finance_hash(e.member_id) then raise exception 'Les modalités financières ont changé. Actualise et relis ton dossier.';end if;
   if exists(select 1 from jsonb_array_elements(e.rules_snapshot->'requirements') req where (req->>'required')::boolean and not exists(select 1 from public.jds_enrollment_documents ed where ed.enrollment_id=e.id and ed.requirement_id=(req->>'id')::uuid and ed.active and ed.status<>'changes_requested')) then raise exception 'Ajoute ou remplace toutes les pièces obligatoires avant de soumettre le dossier.';end if;
   update public.jds_enrollments set status='submitted',phone=btrim(coalesce(details->>'phone','')),acknowledged=true,submitted_at=now(),submitted_finance_hash=school_private.enrollment_finance_hash(e.member_id),revision=revision+1,updated_at=now() where id=e.id returning * into e;
  else raise exception 'Action inconnue.';end if;
  insert into public.jds_enrollment_events(enrollment_id,actor_id,kind,snapshot) values(e.id,auth.uid(),action,jsonb_build_object('revision',e.revision,'status',e.status,'document_id',doc.id));
 end if;
 select * into m from public.jds_training_members where id=e.member_id;select * into g from public.jds_training_groups where id=m.group_id;select * into d from public.jds_private_directory where id=m.person_id;
 return jsonb_build_object('id',e.id,'revision',e.revision,'status',e.status,'name',concat_ws(' ',d.first_name,d.last_name),'email',e.target_email,'campus',g.campus,'promotion',g.name,'season',g.season,'phone',e.phone,'review_note',e.review_note,'rules',e.rules_snapshot,
 'finance',school_private.enrollment_finance(e.member_id),'finance_hash',school_private.enrollment_finance_hash(e.member_id),
 'documents',coalesce((select jsonb_agg(jsonb_build_object('id',ed.id,'requirement_id',ed.requirement_id,'storage_path',ed.storage_path,'status',ed.status,'review_note',ed.review_note,'uploaded_at',ed.uploaded_at)) from public.jds_enrollment_documents ed where ed.enrollment_id=e.id and ed.active),'[]'),
 'dossiers',coalesce((select jsonb_agg(jsonb_build_object('id',en.id,'campus',tg.campus,'promotion',tg.name,'season',tg.season)) from public.jds_enrollments en join public.jds_training_members tm on tm.id=en.member_id join public.jds_training_groups tg on tg.id=tm.group_id where en.profile_id=auth.uid() and en.status not in ('draft','cancelled')),'[]'));
end $$;
revoke all on function school_private.enrollment_student(text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function school_private.enrollment_student(text,uuid,integer,jsonb) to authenticated;
create function public.jds_enrollment_student_action(action text default 'read',enrollment_key uuid default null,expected_revision integer default null,details jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select school_private.enrollment_student(action,enrollment_key,expected_revision,details)$$;
revoke all on function public.jds_enrollment_student_action(text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.jds_enrollment_student_action(text,uuid,integer,jsonb) to authenticated;

create function school_private.enrollment_storage_allowed(path text,writing boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare enrollment_key uuid; requirement_key uuid;
begin
 if path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]+[.](pdf|jpg|jpeg|png)$' then return false;end if;
 enrollment_key:=split_part(path,'/',1)::uuid;requirement_key:=split_part(path,'/',2)::uuid;
 if not writing and school_private.finance_allowed() then return true;end if;
 return school_private.enrollment_owned(enrollment_key) and exists(select 1 from public.jds_enrollments e where e.id=enrollment_key and (not writing or e.status in ('in_progress','invited','changes_requested')) and exists(select 1 from jsonb_array_elements(e.rules_snapshot->'requirements') x where x->>'id'=requirement_key::text));
exception when invalid_text_representation then return false;
end $$;
revoke all on function school_private.enrollment_storage_allowed(text,boolean) from public,anon,authenticated;
grant execute on function school_private.enrollment_storage_allowed(text,boolean) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('school-enrollment','school-enrollment',false,10485760,array['application/pdf','image/jpeg','image/png']);
create policy enrollment_file_insert on storage.objects for insert to authenticated with check(bucket_id='school-enrollment' and school_private.enrollment_storage_allowed(name,true));
create policy enrollment_file_read on storage.objects for select to authenticated using(bucket_id='school-enrollment' and school_private.enrollment_storage_allowed(name,false));
-- Financial amendments require renewed reading; recording a receipt does not reopen an enrollment.
create function school_private.enrollment_finance_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare e public.jds_enrollments;
begin
 if (to_jsonb(new)-array['receipts','revision','updated_at','updated_by','note','invoice_reference','qonto_payment_url']) is distinct from (to_jsonb(old)-array['receipts','revision','updated_at','updated_by','note','invoice_reference','qonto_payment_url']) then
  update public.jds_enrollments set status='changes_requested',acknowledged=false,review_note='Les modalités financières ont été modifiées. Relis les conditions actualisées puis soumets à nouveau ton dossier.',validated_at=null,validated_by=null,revision=revision+1,updated_at=now() where member_id=new.member_id and status in ('submitted','validated') returning * into e;
  if found then insert into public.jds_enrollment_events(enrollment_id,actor_id,kind,snapshot) values(e.id,auth.uid(),'finance_changed',jsonb_build_object('revision',e.revision));end if;
 end if;return new;
end $$;
revoke all on function school_private.enrollment_finance_changed() from public,anon,authenticated;
create trigger enrollment_finance_changed after update on public.jds_tuition_accounts for each row execute function school_private.enrollment_finance_changed();
notify pgrst,'reload schema';
