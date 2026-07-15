-- ============================================================
-- Locations de salles (tarifs par créneau) + données CORE & INDUSTRY.
-- + correction adresse INDUSTRY, studios INDUSTRY, cartes INDUSTRY,
--   prix du cours par école. Idempotent.
-- ============================================================

-- 0) École : prix du cours à l'unité par campus (Core 15€, Industry 17€)
alter table public.jds_schools add column if not exists default_class_price_cents int not null default 1500;
update public.jds_schools set default_class_price_cents = 1500 where code = 'CORE';
update public.jds_schools set default_class_price_cents = 1700 where code = 'INDUSTRY';

-- Correction adresse INDUSTRY
update public.jds_schools
  set address = '27 Boulevard de la Somme, 75017 Paris'
  where code = 'INDUSTRY';

-- Studios INDUSTRY (3 salles modulables)
insert into public.jds_studios (school_id, name, area_m2, sort_order) values
  ('a0000000-0000-0000-0000-0000000000d0','Salle 1',98,1),
  ('a0000000-0000-0000-0000-0000000000d0','Salle 2',61,2),
  ('a0000000-0000-0000-0000-0000000000d0','Salle 3',53,3)
on conflict do nothing;

-- Cartes INDUSTRY (mêmes tarifs que Core ; carte KIDS à définir avec Bruce → non insérée)
insert into public.jds_card_types (school_id, name, credits, price_cents, audience, includes_workshops, sort_order) values
  ('a0000000-0000-0000-0000-0000000000d0','Carte 5 cours',   5, 7500,'adult', false, 1),
  ('a0000000-0000-0000-0000-0000000000d0','Carte 10 cours', 10,13500,'adult', false, 2),
  ('a0000000-0000-0000-0000-0000000000d0','Carte 20 cours', 20,24500,'adult', true,  3),
  ('a0000000-0000-0000-0000-0000000000d0','Carte 50 cours', 50,55500,'adult', true,  4)
on conflict do nothing;

-- ============================================================
-- 1) TARIFS DE LOCATION — une config de salle + ses prix par créneau
-- ============================================================
create table if not exists public.jds_rental_rates (
  id uuid primary key,
  school_id uuid not null references public.jds_schools(id) on delete cascade,
  label text not null,          -- 'Salle 1', 'Salles 2 + 3'…
  area_m2 int,
  combo text,                   -- ex '1+2+3' (null = salle simple)
  sort_order int not null default 0
);
create index if not exists idx_jds_rental_rates_school on public.jds_rental_rates(school_id);

create table if not exists public.jds_rental_prices (
  id uuid primary key default gen_random_uuid(),
  rate_id uuid not null references public.jds_rental_rates(id) on delete cascade,
  slot_label text not null,     -- '9h-18h30', 'Soir (18h30-23h)'…
  slot_order int not null default 0,
  price_cents int not null,     -- TTC
  unique (rate_id, slot_label)
);

alter table public.jds_rental_rates  enable row level security;
alter table public.jds_rental_prices enable row level security;
drop policy if exists jds_rental_rates_read on public.jds_rental_rates;
create policy jds_rental_rates_read on public.jds_rental_rates for select to authenticated using (true);
drop policy if exists jds_rental_prices_read on public.jds_rental_prices;
create policy jds_rental_prices_read on public.jds_rental_prices for select to authenticated using (true);
drop policy if exists jds_rental_rates_admin on public.jds_rental_rates;
create policy jds_rental_rates_admin on public.jds_rental_rates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists jds_rental_prices_admin on public.jds_rental_prices;
create policy jds_rental_prices_admin on public.jds_rental_prices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- CORE (3 rue de l'Est) : Journée / Soir sem. / Week-end ----------
insert into public.jds_rental_rates (id, school_id, label, area_m2, combo, sort_order) values
  ('e0000000-0000-0000-0000-0000000000c1','a0000000-0000-0000-0000-0000000000c0','Salle 1',132,null,1),
  ('e0000000-0000-0000-0000-0000000000c2','a0000000-0000-0000-0000-0000000000c0','Salle 2',75, null,2),
  ('e0000000-0000-0000-0000-0000000000c3','a0000000-0000-0000-0000-0000000000c0','Salle 3',50, null,3)
on conflict (id) do nothing;

insert into public.jds_rental_prices (rate_id, slot_label, slot_order, price_cents)
select r.id, s.slot, s.ord, s.price from (values
  ('e0000000-0000-0000-0000-0000000000c1'::uuid,'Journée sem. (10h-19h)',1,4000),
  ('e0000000-0000-0000-0000-0000000000c1'::uuid,'Soir sem. (19h-22h)',   2,7000),
  ('e0000000-0000-0000-0000-0000000000c1'::uuid,'Week-end (avant 19h)',  3,4000),
  ('e0000000-0000-0000-0000-0000000000c2'::uuid,'Journée sem. (10h-19h)',1,3500),
  ('e0000000-0000-0000-0000-0000000000c2'::uuid,'Soir sem. (19h-22h)',   2,5000),
  ('e0000000-0000-0000-0000-0000000000c2'::uuid,'Week-end (avant 19h)',  3,3500),
  ('e0000000-0000-0000-0000-0000000000c3'::uuid,'Journée sem. (10h-19h)',1,3000),
  ('e0000000-0000-0000-0000-0000000000c3'::uuid,'Soir sem. (19h-22h)',   2,4500),
  ('e0000000-0000-0000-0000-0000000000c3'::uuid,'Week-end (avant 19h)',  3,3000)
) as s(rid, slot, ord, price)
join public.jds_rental_rates r on r.id = s.rid
on conflict (rate_id, slot_label) do nothing;

-- ---------- INDUSTRY (27 Bd de la Somme) : 9h-18h30 / 18h30-23h / après 23h ----------
insert into public.jds_rental_rates (id, school_id, label, area_m2, combo, sort_order) values
  ('e0000000-0000-0000-0000-0000000000d1','a0000000-0000-0000-0000-0000000000d0','Salle 1',98, null,1),
  ('e0000000-0000-0000-0000-0000000000d2','a0000000-0000-0000-0000-0000000000d0','Salle 2',61, null,2),
  ('e0000000-0000-0000-0000-0000000000d3','a0000000-0000-0000-0000-0000000000d0','Salle 3',53, null,3),
  ('e0000000-0000-0000-0000-00000000d123','a0000000-0000-0000-0000-0000000000d0','Salles 1 + 2 + 3',210,'1+2+3',4),
  ('e0000000-0000-0000-0000-00000000d023','a0000000-0000-0000-0000-0000000000d0','Salles 2 + 3',110,'2+3',5),
  ('e0000000-0000-0000-0000-00000000d013','a0000000-0000-0000-0000-0000000000d0','Salles 1 + 3',150,'1+3',6)
on conflict (id) do nothing;

insert into public.jds_rental_prices (rate_id, slot_label, slot_order, price_cents)
select r.id, s.slot, s.ord, s.price from (values
  ('e0000000-0000-0000-0000-0000000000d1'::uuid,'9h-18h30',1, 5000),
  ('e0000000-0000-0000-0000-0000000000d1'::uuid,'18h30-23h',2,8000),
  ('e0000000-0000-0000-0000-0000000000d1'::uuid,'Après 23h',3,11000),
  ('e0000000-0000-0000-0000-0000000000d2'::uuid,'9h-18h30',1, 4500),
  ('e0000000-0000-0000-0000-0000000000d2'::uuid,'18h30-23h',2,6000),
  ('e0000000-0000-0000-0000-0000000000d2'::uuid,'Après 23h',3,9500),
  ('e0000000-0000-0000-0000-0000000000d3'::uuid,'9h-18h30',1, 4000),
  ('e0000000-0000-0000-0000-0000000000d3'::uuid,'18h30-23h',2,5500),
  ('e0000000-0000-0000-0000-0000000000d3'::uuid,'Après 23h',3,8500),
  ('e0000000-0000-0000-0000-00000000d123'::uuid,'9h-18h30',1,15000),
  ('e0000000-0000-0000-0000-00000000d123'::uuid,'18h30-23h',2,22000),
  ('e0000000-0000-0000-0000-00000000d123'::uuid,'Après 23h',3,25000),
  ('e0000000-0000-0000-0000-00000000d023'::uuid,'9h-18h30',1, 8500),
  ('e0000000-0000-0000-0000-00000000d023'::uuid,'18h30-23h',2,11500),
  ('e0000000-0000-0000-0000-00000000d023'::uuid,'Après 23h',3,14500),
  ('e0000000-0000-0000-0000-00000000d013'::uuid,'9h-18h30',1, 9000),
  ('e0000000-0000-0000-0000-00000000d013'::uuid,'18h30-23h',2,13500),
  ('e0000000-0000-0000-0000-00000000d013'::uuid,'Après 23h',3,16500)
) as s(rid, slot, ord, price)
join public.jds_rental_rates r on r.id = s.rid
on conflict (rate_id, slot_label) do nothing;
