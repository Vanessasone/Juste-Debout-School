-- Vanessa's instruction, 23 October 2026: CORE fundamentals coefficient 4.
-- Existing bulletin model has independent CC and evaluation coefficient columns.
-- Apply 4 to both; leave other subjects and INDUSTRY untouched pending the full grid.
-- Exact names deliberately exclude HIP HOP CHOREO and COMMERCIAL HIP HOP.
begin;
update public.jds_bulletin_subjects s
set cc_coefficient=4,evaluation_coefficient=4,updated_at=now()
from public.jds_training_groups g
where g.id=s.group_id and g.campus='CORE' and s.active
and upper(trim(s.subject)) in ('POPPING','LOCKING','HIP HOP','HOUSE')
and (s.cc_coefficient is distinct from 4 or s.evaluation_coefficient is distinct from 4);
commit;
