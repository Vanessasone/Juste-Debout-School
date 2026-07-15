/**
 * NOTES DE COURS (élève → prof) — « post-class rating ».
 * Après un cours suivi, l'élève note son prof (1–5 étoiles). La note est écrite
 * dans jds_class_ratings ; un trigger la reporte dans le classement du prof.
 * Démo : dérive quelques cours récents depuis les fiches ; « à noter » local.
 */
import { getTeachers } from '@/lib/people';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type RateItem = {
  key: string;
  sessionId: string | null;
  teacherId: string;
  teacherName: string;
  teacherPhoto: string | null;
  style: string;
};

const RATED = new Set<string>(); // démo : cours déjà notés (disparaissent de la liste)

export async function getClassesToRate(): Promise<RateItem[]> {
  const teachers = await getTeachers({ population: 'open_teacher' }).catch(() => []);
  return teachers
    .map((t) => ({
      key: t.id,
      sessionId: null,
      teacherId: t.id,
      teacherName: t.name,
      teacherPhoto: t.photoUrl,
      style: t.styles[0] ?? 'Cours',
    }))
    .filter((it) => !RATED.has(it.key))
    .slice(0, 2);
}

export async function rateClass(item: RateItem, stars: number, comment?: string): Promise<void> {
  RATED.add(item.key);
  if (!isSupabaseConfigured) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('jds_class_ratings').insert({
    student_id: user.id,
    teacher_id: item.teacherId,
    session_id: item.sessionId,
    stars,
    comment: comment || null,
  });
}
