/**
 * Couche données CLASSEMENTS — lit le classement agrégé (view
 * v_ranking_leaderboard) alimenté par le registre de points ranking_points.
 * Repli sur des données d'exemple en mode démo.
 */
import type { CampusCode } from '@/constants/brand';
import { getTeachers } from '@/lib/people';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Population = 'open_teacher' | 'formation_teacher' | 'formation_student';

export type LeaderRow = {
  subjectId: string;
  name: string;
  subtitle: string | null;
  score: number;
  rank: number;
};

const MOCK: Record<Population, Omit<LeaderRow, 'rank'>[]> = {
  open_teacher: [
    { subjectId: 't1', name: 'Soulz', subtitle: 'House', score: 86 },
    { subjectId: 't2', name: 'Nelson', subtitle: 'Popping · Boogaloo', score: 55 },
    { subjectId: 't3', name: 'Malika', subtitle: 'Waacking · Dancehall', score: 20 },
  ],
  formation_teacher: [
    { subjectId: 'f1', name: 'Diablo', subtitle: 'Popping — formation', score: 45 },
    { subjectId: 'f2', name: 'Yugson', subtitle: 'House — formation', score: 38 },
  ],
  formation_student: [
    { subjectId: 's3', name: 'Awa', subtitle: 'Promo 2026', score: 46 },
    { subjectId: 's1', name: 'Naïma', subtitle: 'Promo 2026', score: 45 },
    { subjectId: 's2', name: 'Kenji', subtitle: 'Promo 2026', score: 11 },
  ],
};

function ranked(rows: Omit<LeaderRow, 'rank'>[]): LeaderRow[] {
  return [...rows]
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export type Subject = {
  id: string;
  name: string;
  subtitle: string | null;
  population: Population;
  schoolCode: CampusCode | null;
  photoUrl: string | null;
};

/** Roster d'une population (les fiches) — à qui attribuer des points. */
export async function getSubjects(population: Population, schoolId?: string): Promise<Subject[]> {
  const teachers = await getTeachers({ population, schoolId });
  return teachers.map((t) => ({
    id: t.id,
    name: t.name,
    subtitle: t.styles.join(' · ') || null,
    population,
    schoolCode: t.schoolCode,
    photoUrl: t.photoUrl ?? null,
  }));
}

export type PointKind = 'attendance' | 'lateness' | 'absence' | 'rating' | 'vote' | 'jury' | 'challenge' | 'bonus';

/** Attribuer des points (staff/admin) — assiduité, retards, absences, jury, défis, bonus. */
export async function addPoints(
  subjectId: string,
  kind: PointKind,
  points: number,
  note?: string,
  season = '2026-T1',
): Promise<void> {
  if (!isSupabaseConfigured) return; // démo : no-op (afficher confirmation côté écran)
  const { error } = await supabase.rpc('ranking_add', {
    p_subject: subjectId,
    p_kind: kind,
    p_points: points,
    p_season: season,
    p_note: note ?? null,
  });
  if (error) throw error;
}

export async function getLeaderboard(
  population: Population,
  opts?: { season?: string; schoolId?: string },
): Promise<LeaderRow[]> {
  if (!isSupabaseConfigured) return ranked(MOCK[population]);

  let q = supabase
    .from('v_ranking_leaderboard')
    .select('subject_id, name, subtitle, score')
    .eq('population', population)
    .eq('season', opts?.season ?? '2026-T1')
    .order('score', { ascending: false });
  if (opts?.schoolId) q = q.eq('school_id', opts.schoolId);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r: any, i: number) => ({
    subjectId: r.subject_id,
    name: r.name,
    subtitle: r.subtitle,
    score: r.score ?? 0,
    rank: i + 1,
  }));
}
