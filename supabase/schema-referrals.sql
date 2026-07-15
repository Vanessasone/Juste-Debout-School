-- ============================================================================
-- PARRAINAGE RÉEL — codes + validation (app Juste Debout School)
-- Chaque membre a un code unique. À l'inscription, le filleul saisit le code du
-- parrain → +10 JD Coins au parrain, +5 au filleul, et le parrainage est compté
-- (pour débloquer t-shirt / hoodie / carte). Écritures via RPC de confiance.
-- Prérequis : jd_award() (moteur JD Coins). À exécuter après. Idempotent.
-- ============================================================================

create table if not exists public.jds_referral_codes (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  code       text unique not null,
  created_at timestamptz default now()
);
alter table public.jds_referral_codes enable row level security;
drop policy if exists jds_refcode_own on public.jds_referral_codes;
create policy jds_refcode_own on public.jds_referral_codes
  for select using (profile_id = auth.uid() or public.is_admin());

create table if not exists public.jds_referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (referred_id)   -- on n'est parrainé qu'une fois
);
alter table public.jds_referrals enable row level security;
drop policy if exists jds_referrals_read on public.jds_referrals;
create policy jds_referrals_read on public.jds_referrals
  for select using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

create index if not exists jds_referrals_referrer_idx on public.jds_referrals(referrer_id);

-- Code du membre courant (créé à la première demande).
create or replace function public.jds_my_referral_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  existing text;
  base text;
  gen text;
begin
  select code into existing from public.jds_referral_codes where profile_id = auth.uid();
  if existing is not null then return existing; end if;

  select upper(substring(regexp_replace(coalesce(alias, full_name, 'MEMBRE'), '[^A-Za-z0-9]', '', 'g') from 1 for 6))
    into base from public.profiles where id = auth.uid();
  if base is null or base = '' then base := 'MEMBRE'; end if;

  loop
    gen := base || '-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    exit when not exists (select 1 from public.jds_referral_codes where code = gen);
  end loop;

  insert into public.jds_referral_codes (profile_id, code) values (auth.uid(), gen);
  return gen;
end;
$$;

-- Le filleul (utilisateur courant) valide le code de son parrain.
create or replace function public.jds_redeem_referral(p_code text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_referrer uuid;
begin
  if p_code is null or btrim(p_code) = '' then return 'empty'; end if;
  select profile_id into v_referrer from public.jds_referral_codes where code = upper(btrim(p_code));
  if v_referrer is null then return 'not_found'; end if;
  if v_referrer = auth.uid() then return 'self'; end if;
  if exists (select 1 from public.jds_referrals where referred_id = auth.uid()) then return 'already'; end if;

  insert into public.jds_referrals (referrer_id, referred_id) values (v_referrer, auth.uid());
  perform public.jd_award(v_referrer, 10, 'referral');  -- parrain
  perform public.jd_award(auth.uid(), 5, 'referral');   -- filleul
  return 'ok';
end;
$$;
