-- ============================================================================
-- MOTEUR JD COINS — attribution automatique des coins (app Juste Debout School)
-- Des triggers de confiance créditent le portefeuille partagé (jd_points_ledger)
-- quand un événement « gagnant » a lieu. L'élève n'insère jamais directement.
-- Prérequis : jd_points_ledger + jds_checkins + jds_class_ratings existent.
-- À exécuter APRÈS les autres migrations. Idempotent.
-- ============================================================================

-- Helper : créditer des coins (SECURITY DEFINER → contourne la RLS d'insert).
create or replace function public.jd_award(p_profile uuid, p_delta int, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_profile is null then return; end if;
  insert into public.jd_points_ledger (profile_id, delta, reason, source_app)
  values (p_profile, p_delta, p_reason, 'school');
end;
$$;

-- Présence validée à la borne → +5 (suivre un cours).
create or replace function public.jd_on_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.jd_award(NEW.member_id, 5, 'class');
  return NEW;
end;
$$;
drop trigger if exists jd_checkin_award on public.jds_checkins;
create trigger jd_checkin_award
  after insert on public.jds_checkins
  for each row execute function public.jd_on_checkin();

-- Note de cours donnée → +5 (noter) à l'élève.
create or replace function public.jd_on_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.jd_award(NEW.student_id, 5, 'rating');
  return NEW;
end;
$$;
drop trigger if exists jd_rating_award on public.jds_class_ratings;
create trigger jd_rating_award
  after insert on public.jds_class_ratings
  for each row execute function public.jd_on_rating();
