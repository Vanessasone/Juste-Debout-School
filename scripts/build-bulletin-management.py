from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]
schema=(root/'supabase/schema-bulletins.sql').read_text()
def fn(name):
 m=re.search(r'CREATE FUNCTION '+re.escape(name)+r'\(.*?\$\$;',schema,re.S)
 assert m,name
 return m[0].replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION',1)
parts=['''-- Reversible subject removal and multiple teachers per discipline.
ALTER TABLE public.jds_bulletin_subjects ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE public.jds_bulletin_subjects DROP CONSTRAINT jds_bulletin_subjects_group_id_term_subject_key;
ALTER TABLE public.jds_bulletin_subjects ADD CONSTRAINT bulletin_subject_teacher_unique UNIQUE(group_id,term,subject,teacher_name);
''']
parts.append(fn('school_private.bulletin_can_grade').replace('WHERE s.id=subject_key AND','WHERE s.id=subject_key AND s.active AND'))
group=fn('public.jds_bulletin_group')
group=group.replace("'members',coalesce", "'archived_subjects',CASE WHEN manager THEN coalesce((SELECT jsonb_agg(s ORDER BY s.sort_order,s.subject,s.teacher_name) FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND s.term=target_term AND NOT s.active),'[]'::jsonb) ELSE '[]'::jsonb END,\n 'members',coalesce")
parts.append(group)
snapshot=fn('school_private.bulletin_snapshot')
snapshot=snapshot.replace('WHERE group_id=g.id AND term=target_term','WHERE active AND group_id=g.id AND term=target_term').replace('WHERE s.group_id=g.id AND s.term=target_term','WHERE s.active AND s.group_id=g.id AND s.term=target_term')
parts.append(snapshot)
parts.append('''CREATE FUNCTION public.jds_set_bulletin_subject_active(subject_key uuid,enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE grp uuid; school text;
BEGIN
 SELECT s.group_id,g.campus INTO grp,school FROM public.jds_bulletin_subjects s JOIN public.jds_training_groups g ON g.id=s.group_id WHERE s.id=subject_key;
 IF auth.uid() IS NULL OR grp IS NULL OR NOT public.jds_can_manage_school(school) THEN RAISE EXCEPTION 'Modification réservée à l’administration de cette école.';END IF;
 IF enabled IS NULL THEN RAISE EXCEPTION 'Choisis activer ou retirer.';END IF;
 PERFORM 1 FROM public.jds_training_groups WHERE id=grp FOR UPDATE;
 UPDATE public.jds_bulletin_subjects SET active=enabled,updated_at=now() WHERE id=subject_key AND active IS DISTINCT FROM enabled;
END $$;
REVOKE ALL ON FUNCTION public.jds_set_bulletin_subject_active(uuid,boolean) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.jds_set_bulletin_subject_active(uuid,boolean) TO authenticated;
''')
(root/'supabase/schema-bulletin-management.sql').write_text('\n'.join(parts))
# Explicit known teacher/subject pairs. A default template, not a timetable claim.
core=json.loads((root/'web-access/core-subject-catalogue.json').read_text())
industry=[]
for p in json.loads((root/'docs/industry-planning-intake.json').read_text()):
 for line in p['body'].splitlines():
  if not re.match(r'^\d+h',line) or ' : ' not in line:continue
  label=line.split(' : ',1)[1]
  if ' · ' not in label or label.startswith('Entraînement'):continue
  subject,teacher=label.rsplit(' · ',1)
  if teacher!='Intervenant à venir':industry.append(dict(subject=subject,teacher=teacher))
rows=[]
for campus,catalogue in [('CORE',core),('INDUSTRY',industry)]:
 seen=set()
 for entry in catalogue:
  subject=' '.join(entry['subject'].split());teacher=entry['teacher'].strip()
  key=(subject.casefold(),teacher.casefold())
  if not teacher or key in seen:continue
  seen.add(key);rows.append((campus,subject,teacher))
def q(s):return "'"+s.replace("'","''")+"'"
values=',\n'.join('('+','.join(map(q,row))+')' for row in rows)
seed='''-- All known teachers per campus in every class/trimester of 2026-2027.
-- Existing names, weights, accounts, grades and removed rows remain untouched.
INSERT INTO public.jds_bulletin_subjects(group_id,term,subject,teacher_name,sort_order)
SELECT g.id,t.term,c.subject,c.teacher_name,1000+row_number() OVER(ORDER BY c.subject,c.teacher_name)::integer
FROM (VALUES\n'''+values+''') c(campus,subject,teacher_name)
JOIN public.jds_training_groups g ON g.campus=c.campus AND g.season='2026-2027'
CROSS JOIN generate_series(1,3) t(term)
WHERE NOT EXISTS(SELECT 1 FROM public.jds_bulletin_subjects s WHERE s.group_id=g.id AND s.term=t.term AND lower(s.subject)=lower(c.subject) AND lower(s.teacher_name)=lower(c.teacher_name))
ON CONFLICT(group_id,term,subject,teacher_name) DO NOTHING;
'''
(root/'supabase/seed-all-bulletin-teachers.sql').write_text(seed)
print({campus:sum(row[0]==campus for row in rows) for campus in ['CORE','INDUSTRY']})
