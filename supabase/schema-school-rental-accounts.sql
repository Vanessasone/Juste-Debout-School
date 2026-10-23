-- Private, manual rental accounting. No bank connection or external payment is performed.
create table public.jds_rental_accounts (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique default ('LOC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 client_name text not null check(length(btrim(client_name)) between 1 and 160),
 description text not null default '' check(length(description)<=1000),
 block_id uuid references public.jds_rental_calendar_blocks(id),
 amount_due_cents integer check(amount_due_cents>=0),
 amount_received_cents integer not null default 0 check(amount_received_cents>=0),
 invoice_reference text not null default '' check(length(invoice_reference)<=200),
 qonto_payment_url text not null default '' check(qonto_payment_url='' or (length(qonto_payment_url)<=1500 and qonto_payment_url ~ '^https://pay[.]qonto[.]com/[A-Za-z0-9_/?&=%.-]+$')),
 payment_reference text not null default '' check(length(payment_reference)<=300),
 state text not null default 'active' check(state in ('active','cancelled')),
 revision integer not null default 1,
 created_by uuid not null references public.profiles(id), updated_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(amount_received_cents=0 or (amount_due_cents is not null and amount_received_cents<=amount_due_cents and length(btrim(payment_reference))>=3))
);
create table public.jds_rental_account_events (
 id bigint generated always as identity primary key,
 account_id uuid not null references public.jds_rental_accounts(id),
 actor_id uuid not null references public.profiles(id),
 recorded_at timestamptz not null default now(),
 revision integer not null,
 snapshot jsonb not null,
 unique(account_id,revision)
);
create index rental_account_recent on public.jds_rental_accounts(updated_at desc);
alter table public.jds_rental_accounts enable row level security;
alter table public.jds_rental_account_events enable row level security;
revoke all on public.jds_rental_accounts,public.jds_rental_account_events from public,anon,authenticated;
grant select on public.jds_rental_accounts,public.jds_rental_account_events to authenticated;
create policy rental_account_manager_read on public.jds_rental_accounts for select to authenticated using(public.jds_can_manage_school('CORE'));
create policy rental_account_event_manager_read on public.jds_rental_account_events for select to authenticated using(public.jds_can_manage_school('CORE'));

create function school_private.save_rental_account(account_key uuid,expected_revision integer,details jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.jds_rental_accounts; saved public.jds_rental_accounts;
 due integer;received integer;block_key uuid;
begin
 if auth.uid() is null or not public.jds_can_manage_school('CORE') then raise exception 'Accès gestion CORE requis.';end if;
 if jsonb_typeof(details) is distinct from 'object' then raise exception 'Dossier invalide.';end if;
 if account_key is not null then
  select * into prior from public.jds_rental_accounts where id=account_key for update;
  if not found then raise exception 'Dossier introuvable.';end if;
  if expected_revision is distinct from prior.revision then raise exception 'Ce dossier a changé. Actualise avant de réenregistrer.';end if;
 end if;
 due:=nullif(details->>'amount_due_cents','')::integer;
 received:=coalesce(nullif(details->>'amount_received_cents','')::integer,0);
 block_key:=nullif(details->>'block_id','')::uuid;
 if block_key is not null and not exists(select 1 from public.jds_rental_calendar_blocks where id=block_key) then raise exception 'Occupation introuvable.';end if;
 if due<0 or received<0 or (received>0 and (due is null or received>due or length(btrim(coalesce(details->>'payment_reference','')))<3)) then raise exception 'Vérifie les montants et la référence du règlement constaté.';end if;
 if account_key is null then
  insert into public.jds_rental_accounts(client_name,description,block_id,amount_due_cents,amount_received_cents,invoice_reference,qonto_payment_url,payment_reference,state,created_by,updated_by)
  values(btrim(details->>'client_name'),coalesce(details->>'description',''),block_key,due,received,coalesce(details->>'invoice_reference',''),coalesce(details->>'qonto_payment_url',''),coalesce(details->>'payment_reference',''),coalesce(details->>'state','active'),auth.uid(),auth.uid()) returning * into saved;
 else
  update public.jds_rental_accounts set client_name=btrim(details->>'client_name'),description=coalesce(details->>'description',''),block_id=block_key,
   amount_due_cents=due,amount_received_cents=received,invoice_reference=coalesce(details->>'invoice_reference',''),qonto_payment_url=coalesce(details->>'qonto_payment_url',''),
   payment_reference=coalesce(details->>'payment_reference',''),state=coalesce(details->>'state','active'),revision=revision+1,updated_by=auth.uid(),updated_at=now()
   where id=account_key returning * into saved;
 end if;
 insert into public.jds_rental_account_events(account_id,actor_id,revision,snapshot) values(saved.id,auth.uid(),saved.revision,to_jsonb(saved));
 return saved.id;
end $$;
revoke all on function school_private.save_rental_account(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function school_private.save_rental_account(uuid,integer,jsonb) to authenticated;
create function public.jds_save_rental_account(account_key uuid default null,expected_revision integer default null,details jsonb default '{}') returns uuid
language sql security invoker set search_path='' as $$select school_private.save_rental_account(account_key,expected_revision,details)$$;
revoke all on function public.jds_save_rental_account(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.jds_save_rental_account(uuid,integer,jsonb) to authenticated;
notify pgrst,'reload schema';
