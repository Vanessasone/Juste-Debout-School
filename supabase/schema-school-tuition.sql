-- School tuition ledger: manual evidence, no banking call, no student-facing access.
create function school_private.finance_allowed() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from auth.users u join public.jds_school_responsibilities r on r.profile_id=u.id
  where u.id=auth.uid() and r.enabled and r.campus is null and u.email_confirmed_at is not null
   and (u.banned_until is null or u.banned_until<now()) and lower(u.email)=r.email
   and r.email in ('nicolas@juste-debout.com','bruceykanji1@gmail.com','rabah@juste-debout.com','loic@juste-debout.com'))
$$;
revoke all on function school_private.finance_allowed() from public,anon,authenticated;
grant execute on function school_private.finance_allowed() to authenticated;
create function public.jds_school_finance_access() returns boolean language sql stable security invoker set search_path='' as $$select school_private.finance_allowed()$$;
revoke all on function public.jds_school_finance_access() from public,anon,authenticated;
grant execute on function public.jds_school_finance_access() to authenticated;

create table public.jds_tuition_accounts(
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null unique references public.jds_training_members(id),
 reference text not null unique default ('PRO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 base_cents integer check(base_cents>=0), discount_cents integer not null default 0 check(discount_cents>=0),
 school_aid_cents integer not null default 0 check(school_aid_cents>=0),
 funding jsonb not null default '[]' check(jsonb_typeof(funding)='array' and jsonb_array_length(funding)<=20),
 terms_confirmed boolean not null default false, schedule_confirmed boolean not null default false,
 payer_name text not null default '' check(length(payer_name)<=160),
 payer_kind text not null default 'student' check(payer_kind in ('student','parent','organization','other')),
 invoice_reference text not null default '' check(length(invoice_reference)<=200),
 qonto_payment_url text not null default '' check(qonto_payment_url='' or (length(qonto_payment_url)<=1500 and qonto_payment_url ~ '^https://pay[.]qonto[.]com/[A-Za-z0-9_/?&=%.-]+$')),
 installments jsonb not null default '[]' check(jsonb_typeof(installments)='array' and jsonb_array_length(installments)<=60),
 receipts jsonb not null default '[]' check(jsonb_typeof(receipts)='array' and jsonb_array_length(receipts)<=200),
 note text not null default '' check(length(note)<=1000),
 state text not null default 'active' check(state in ('active','cancelled')),
 revision integer not null default 1,
 created_by uuid not null references public.profiles(id), updated_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((base_cents is null and discount_cents=0 and school_aid_cents=0 and not terms_confirmed) or (base_cents is not null and discount_cents::bigint+school_aid_cents<=base_cents)),
 check(not schedule_confirmed or terms_confirmed)
);
create table public.jds_tuition_events(
 id bigint generated always as identity primary key,
 account_id uuid not null references public.jds_tuition_accounts(id),
 actor_id uuid not null references public.profiles(id), recorded_at timestamptz not null default now(),
 revision integer not null, snapshot jsonb not null, unique(account_id,revision)
);
create index tuition_account_recent on public.jds_tuition_accounts(updated_at desc);
alter table public.jds_tuition_accounts enable row level security;
alter table public.jds_tuition_events enable row level security;
revoke all on public.jds_tuition_accounts,public.jds_tuition_events from public,anon,authenticated;
grant select on public.jds_tuition_accounts,public.jds_tuition_events to authenticated;
create policy tuition_director_read on public.jds_tuition_accounts for select to authenticated using((select school_private.finance_allowed()));
create policy tuition_event_director_read on public.jds_tuition_events for select to authenticated using((select school_private.finance_allowed()));

create function school_private.save_tuition_account(account_key uuid,expected_revision integer,details jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.jds_tuition_accounts; saved public.jds_tuition_accounts;
 member_key uuid; price integer; discount integer; aid integer; terms boolean; schedule boolean;
 item jsonb; old_item jsonb; iid uuid; ids uuid[]; schedules jsonb:='[]'; payments jsonb:='[]';
 amount integer; total bigint:=0; receipts_total bigint:=0; funding_total bigint:=0; funders jsonb:='[]'; day date; stamp date:=(now() at time zone 'Europe/Paris')::date;
begin
 if not school_private.finance_allowed() then raise exception 'Accès réservé aux quatre directeurs School activés.';end if;
 if jsonb_typeof(details) is distinct from 'object' then raise exception 'Dossier invalide.';end if;
 if account_key is not null then
  select * into prior from public.jds_tuition_accounts where id=account_key for update;
  if not found then raise exception 'Dossier introuvable.';end if;
  if expected_revision is distinct from prior.revision then raise exception 'Le dossier a changé. Actualise avant de réenregistrer.';end if;
 end if;
 member_key:=(details->>'member_id')::uuid;
 if member_key is null or not exists(select 1 from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id where m.id=member_key and g.campus in ('CORE','INDUSTRY')) then raise exception 'Élève de formation School introuvable.';end if;
 if account_key is not null and member_key<>prior.member_id then raise exception 'Le rattachement élève ne peut pas être modifié.';end if;
 price:=nullif(details->>'base_cents','')::integer;discount:=coalesce((details->>'discount_cents')::integer,0);aid:=coalesce((details->>'school_aid_cents')::integer,0);
 terms:=coalesce((details->>'terms_confirmed')::boolean,false);schedule:=coalesce((details->>'schedule_confirmed')::boolean,false);
 if price<0 or discount<0 or aid<0 or (price is null and (discount<>0 or aid<>0 or terms)) or discount::bigint+aid>price or (schedule and not terms) then raise exception 'Vérifie le tarif, les aides, la remise et la confirmation des conditions.';end if;
 if jsonb_typeof(coalesce(details->'funding','[]')) is distinct from 'array' or jsonb_array_length(coalesce(details->'funding','[]'))>20 then raise exception 'Financements invalides (20 lignes maximum).';end if;
 ids:='{}';
 for item in select value from jsonb_array_elements(coalesce(details->'funding','[]')) loop
  iid:=(item->>'id')::uuid;amount:=(item->>'amount_cents')::integer;
  if iid is null or iid=any(ids) or amount is null or amount<=0 or length(btrim(coalesce(item->>'organization',''))) not between 1 and 160 or coalesce(item->>'kind','') not in ('scholarship','subsidy','other') or coalesce(item->>'status','') not in ('pending','confirmed','refused') then raise exception 'Chaque financement requiert un organisme, un montant, un type et un statut.';end if;
  ids:=array_append(ids,iid);if item->>'status'='confirmed' then funding_total:=funding_total+amount;end if;
  funders:=funders||jsonb_build_array(jsonb_build_object('id',iid,'organization',btrim(item->>'organization'),'kind',item->>'kind','amount_cents',amount,'status',item->>'status'));
 end loop;
 if funding_total>coalesce(price-discount-aid,0) then raise exception 'Les financements externes confirmés dépassent le tarif net.';end if;
 if jsonb_typeof(details->'installments') is distinct from 'array' or jsonb_array_length(details->'installments')>60 then raise exception 'Échéancier invalide (60 lignes maximum).';end if;
 ids:='{}';
 for item in select value from jsonb_array_elements(details->'installments') loop
  iid:=(item->>'id')::uuid;amount:=(item->>'amount_cents')::integer;day:=(item->>'due_on')::date;
  if iid is null or iid=any(ids) or amount is null or amount<=0 or day is null or day<'1900-01-01' or day>'2200-12-31' or length(coalesce(item->>'label','')) not between 1 and 100 then raise exception 'Chaque échéance requiert un libellé, une date valide et un montant positif.';end if;
  ids:=array_append(ids,iid);total:=total+amount;
  schedules:=schedules||jsonb_build_array(jsonb_build_object('id',iid,'label',item->>'label','due_on',day,'amount_cents',amount));
 end loop;
 if total>coalesce(price-discount-aid,0) or (schedule and total<>price-discount-aid) then raise exception 'Le total de l’échéancier confirmé doit correspondre au tarif après remise et bourse interne.';end if;
 if jsonb_typeof(details->'receipts') is distinct from 'array' or jsonb_array_length(details->'receipts')>200 then raise exception 'Liste de règlements invalide (200 lignes maximum).';end if;
 ids:='{}';
 for item in select value from jsonb_array_elements(details->'receipts') loop
  iid:=(item->>'id')::uuid;amount:=(item->>'amount_cents')::integer;day:=(item->>'paid_on')::date;
  if iid is null or iid=any(ids) or amount is null or amount<=0 or day is null or day>stamp or day<'1900-01-01'
   or coalesce(item->>'method','') not in ('transfer','card','cheque','cash','other')
   or length(btrim(coalesce(item->>'reference',''))) not between 3 and 200
   or length(coalesce(item->>'payer_name',''))>160 or coalesce(item->>'payer_kind','') not in ('student','parent','organization','other')
   or coalesce(item->>'status','') not in ('recorded','void') then raise exception 'Chaque règlement requiert une date passée ou du jour, un montant positif, un mode et une référence de contrôle.';end if;
  ids:=array_append(ids,iid);
  select value into old_item from jsonb_array_elements(coalesce(prior.receipts,'[]')) where value->>'id'=iid::text;
  if old_item is not null then
   if (item-array['status','void_reason','recorded_at','recorded_by']) is distinct from (old_item-array['status','void_reason','recorded_at','recorded_by']) then raise exception 'Un règlement enregistré est immuable : annule la saisie avec un motif puis crée une nouvelle ligne.';end if;
   if old_item->>'status'='void' and item is distinct from old_item then raise exception 'Une saisie annulée ne peut pas être réactivée ou modifiée.';end if;
   item:=item||jsonb_build_object('recorded_at',old_item->'recorded_at','recorded_by',old_item->'recorded_by');
  else
   if item->>'status'<>'recorded' then raise exception 'Un nouveau règlement doit être enregistré avant correction.';end if;
   item:=jsonb_build_object('id',iid,'amount_cents',amount,'paid_on',day,'method',item->>'method','reference',btrim(item->>'reference'),'payer_name',coalesce(item->>'payer_name',''),'payer_kind',item->>'payer_kind','status','recorded','void_reason','','recorded_at',now(),'recorded_by',auth.uid());
  end if;
  if item->>'status'='void' and length(btrim(coalesce(item->>'void_reason',''))) not between 5 and 300 then raise exception 'Un motif de correction de 5 à 300 caractères est requis.';end if;
  if item->>'status'='recorded' then receipts_total:=receipts_total+amount;end if;
  payments:=payments||jsonb_build_array(item);
 end loop;
 if exists(select 1 from jsonb_array_elements(coalesce(prior.receipts,'[]')) old where not (old->>'id')::uuid=any(ids)) then raise exception 'Un règlement ne peut pas être supprimé : utilise l’annulation de saisie.';end if;
 if receipts_total>2147483647 or (receipts_total>0 and not terms) then raise exception 'Confirme le tarif convenu avant de constater les encaissements.';end if;
 if account_key is null then
  insert into public.jds_tuition_accounts(member_id,base_cents,discount_cents,school_aid_cents,funding,terms_confirmed,schedule_confirmed,payer_name,payer_kind,invoice_reference,qonto_payment_url,installments,receipts,note,state,created_by,updated_by)
  values(member_key,price,discount,aid,funders,terms,schedule,coalesce(details->>'payer_name',''),coalesce(details->>'payer_kind','student'),coalesce(details->>'invoice_reference',''),coalesce(details->>'qonto_payment_url',''),schedules,payments,coalesce(details->>'note',''),coalesce(details->>'state','active'),auth.uid(),auth.uid()) returning * into saved;
 else
  update public.jds_tuition_accounts set base_cents=price,discount_cents=discount,school_aid_cents=aid,funding=funders,terms_confirmed=terms,schedule_confirmed=schedule,payer_name=coalesce(details->>'payer_name',''),payer_kind=coalesce(details->>'payer_kind','student'),invoice_reference=coalesce(details->>'invoice_reference',''),qonto_payment_url=coalesce(details->>'qonto_payment_url',''),installments=schedules,receipts=payments,note=coalesce(details->>'note',''),state=coalesce(details->>'state','active'),revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=account_key returning * into saved;
 end if;
 insert into public.jds_tuition_events(account_id,actor_id,revision,snapshot) values(saved.id,auth.uid(),saved.revision,to_jsonb(saved));
 return saved.id;
end $$;
revoke all on function school_private.save_tuition_account(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function school_private.save_tuition_account(uuid,integer,jsonb) to authenticated;
create function public.jds_save_tuition_account(account_key uuid default null,expected_revision integer default null,details jsonb default '{}') returns uuid
language sql security invoker set search_path='' as $$select school_private.save_tuition_account(account_key,expected_revision,details)$$;
revoke all on function public.jds_save_tuition_account(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.jds_save_tuition_account(uuid,integer,jsonb) to authenticated;

create view public.jds_tuition_account_summary with(security_invoker=true) as
select a.id,a.member_id,g.campus,g.name promotion,g.season,a.state,a.terms_confirmed,a.schedule_confirmed,
 a.base_cents-a.discount_cents-a.school_aid_cents agreed_cents, r.received_cents,
 f.external_cents, case when a.terms_confirmed then a.base_cents-a.discount_cents-a.school_aid_cents-f.external_cents end student_share_cents,
 r.organization_received_cents,
 case when a.terms_confirmed then greatest(a.base_cents-a.discount_cents-a.school_aid_cents-r.received_cents,0) end balance_cents,
 case when a.terms_confirmed then greatest(r.received_cents-(a.base_cents-a.discount_cents-a.school_aid_cents),0) else 0 end surplus_cents,
 case when a.terms_confirmed and a.schedule_confirmed then greatest(s.past_cents-r.received_cents,0) else 0 end overdue_cents,
 case when a.terms_confirmed and a.schedule_confirmed then greatest(s.through_month_cents-r.received_cents,0)-greatest(s.past_cents-r.received_cents,0) else 0 end upcoming_cents
from public.jds_tuition_accounts a join public.jds_training_members m on m.id=a.member_id join public.jds_training_groups g on g.id=m.group_id
cross join lateral(select coalesce(sum((x->>'amount_cents')::bigint) filter(where x->>'status'='recorded'),0)::bigint received_cents,coalesce(sum((x->>'amount_cents')::bigint) filter(where x->>'status'='recorded' and x->>'payer_kind'='organization'),0)::bigint organization_received_cents from jsonb_array_elements(a.receipts) x) r
cross join lateral(select coalesce(sum((x->>'amount_cents')::bigint) filter(where x->>'status'='confirmed'),0)::bigint external_cents from jsonb_array_elements(a.funding) x) f
cross join lateral(select
 coalesce(sum((x->>'amount_cents')::bigint) filter(where (x->>'due_on')::date<(now() at time zone 'Europe/Paris')::date),0)::bigint past_cents,
 coalesce(sum((x->>'amount_cents')::bigint) filter(where (x->>'due_on')::date<=(now() at time zone 'Europe/Paris')::date+30),0)::bigint through_month_cents
 from jsonb_array_elements(a.installments) x) s;
revoke all on public.jds_tuition_account_summary from public,anon,authenticated;
grant select on public.jds_tuition_account_summary to authenticated;

create function school_private.tuition_data() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not school_private.finance_allowed() then raise exception 'Accès réservé aux quatre directeurs School activés.';end if;
 return jsonb_build_object('today',(now() at time zone 'Europe/Paris')::date,'generated_at',now(),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('group_id',g.id,'campus',g.campus,'promotion',g.name,'season',g.season) order by g.campus,g.name,g.season) from public.jds_training_groups g where g.campus in ('CORE','INDUSTRY')),'[]'),
 'roster',coalesce((select jsonb_agg(jsonb_build_object('member_id',m.id,'group_id',g.id,'campus',g.campus,'promotion',g.name,'season',g.season,
 'student_name',coalesce(nullif(btrim(concat_ws(' ',d.first_name,d.last_name)),''),nullif(btrim(p.full_name),''),'Nom à compléter')) order by g.campus,g.name,d.last_name,d.first_name,m.id)
 from public.jds_training_members m join public.jds_training_groups g on g.id=m.group_id left join public.jds_private_directory d on d.id=m.person_id left join public.profiles p on p.id=m.profile_id where g.campus in ('CORE','INDUSTRY')),'[]'),
 'accounts',coalesce((select jsonb_agg(to_jsonb(a) order by a.updated_at desc,a.id) from public.jds_tuition_accounts a),'[]'),
 'summary',coalesce((select jsonb_agg(to_jsonb(s)) from public.jds_tuition_account_summary s),'[]'));
end $$;
revoke all on function school_private.tuition_data() from public,anon,authenticated;
grant execute on function school_private.tuition_data() to authenticated;
create function public.jds_tuition_data() returns jsonb language sql stable security invoker set search_path='' as $$select school_private.tuition_data()$$;
revoke all on function public.jds_tuition_data() from public,anon,authenticated;
grant execute on function public.jds_tuition_data() to authenticated;
notify pgrst,'reload schema';
