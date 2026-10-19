create function public.jds_training_no_overlap() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='published' and exists(
  select 1 from public.jds_training_lessons l
  join public.jds_training_groups g on g.id=l.group_id
  join public.jds_training_groups ng on ng.id=new.group_id
  where l.id<>new.id and l.status='published' and l.starts_at<new.ends_at and l.ends_at>new.starts_at
   and (l.group_id=new.group_id
    or (length(trim(new.teacher))>0 and lower(trim(l.teacher))=lower(trim(new.teacher)))
    or (g.campus=ng.campus and length(trim(new.room))>0 and lower(trim(l.room))=lower(trim(new.room)))))
 then raise exception 'Chevauchement : promotion, intervenant ou salle déjà occupés sur ce créneau.';end if;
 return new;
end $$;
revoke all on function public.jds_training_no_overlap() from public;
create trigger training_lesson_overlap before insert or update on public.jds_training_lessons for each row execute function public.jds_training_no_overlap();
