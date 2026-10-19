begin;
create or replace function public.jds_book_session(p_session uuid,p_card uuid)
returns text language plpgsql security definer set search_path=public as $$
declare v_school uuid; v_capacity int; v_card record; v_status text;
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 select school_id,capacity into v_school,v_capacity from public.jds_sessions
 where id=p_session and status='scheduled' for update;
 if not found then raise exception 'session introuvable'; end if;
 select status into v_status from public.jds_bookings
 where session_id=p_session and profile_id=auth.uid() for update;
 if v_status in ('booked','attended') then return 'booked'; end if;
 select * into v_card from public.jds_user_cards
 where id=p_card and profile_id=auth.uid() for update;
 if not found then raise exception 'carte invalide'; end if;
 if v_card.status<>'active' or v_card.credits_left<1 then raise exception 'carte sans crédit'; end if;
 if v_card.expires_at<now() then raise exception 'carte expirée'; end if;
 if v_card.school_id is not null and v_card.school_id<>v_school then raise exception 'carte non valable sur ce campus'; end if;
 if public.jds_session_booked(p_session)>=v_capacity then
  insert into public.jds_bookings(session_id,profile_id,status)
  values(p_session,auth.uid(),'waitlist')
  on conflict(session_id,profile_id) do update set status='waitlist';
  return 'waitlist';
 end if;
 update public.jds_user_cards set credits_left=credits_left-1,
 status=case when credits_left-1<=0 then 'empty' else 'active' end where id=p_card;
 insert into public.jds_bookings(session_id,profile_id,user_card_id,status)
 values(p_session,auth.uid(),p_card,'booked')
 on conflict(session_id,profile_id) do update set status='booked',user_card_id=excluded.user_card_id;
 return 'booked';
end $$;
-- Booking mutations must go through the checked RPC; the app has no cancellation workflow.
drop policy if exists jds_bookings_cancel on public.jds_bookings;
revoke update on public.jds_bookings from authenticated;
create or replace function public.ranking_add(p_subject uuid,p_kind text,p_points numeric,p_season text default '2026-T1',p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_school uuid; v_code text;
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 select s.school_id,c.code into v_school,v_code from public.ranking_subjects s
 left join public.jds_schools c on c.id=s.school_id where s.id=p_subject;
 if not found then raise exception 'sujet introuvable'; end if;
 if not (public.is_admin() or coalesce(public.jds_is_school_staff(v_school),false)
 or coalesce(public.jds_can_manage_school(v_code),false)) then raise exception 'réservé au staff du campus'; end if;
 insert into public.ranking_points(subject_id,season,kind,points,note,created_by)
 values(p_subject,p_season,p_kind,p_points,p_note,auth.uid());
end $$;
drop policy if exists ranking_subjects_read on public.ranking_subjects;
create policy ranking_subjects_read on public.ranking_subjects for select to authenticated using (
 population in ('open_teacher','formation_teacher') or public.is_admin()
 or public.jds_is_school_staff(school_id)
 or public.jds_can_manage_school((select code from public.jds_schools where id=school_id)));
drop policy if exists ranking_points_read on public.ranking_points;
create policy ranking_points_read on public.ranking_points for select to authenticated using (
 exists(select 1 from public.ranking_subjects s where s.id=subject_id));
revoke all on function public.jds_book_session(uuid,uuid) from public,anon;
revoke all on function public.ranking_add(uuid,text,numeric,text,text) from public,anon;
grant execute on function public.jds_book_session(uuid,uuid),public.ranking_add(uuid,text,numeric,text,text) to authenticated;
commit;