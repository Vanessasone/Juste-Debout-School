/**
 * Couche données FICHES profs / danseurs (table jds_teachers) — VIVIER UNIQUE.
 * Chaque fiche a une population (prof open / prof formation / élève formation)
 * et une école (CORE / INDUSTRY / null = réseau). Sert de : candidats de vote,
 * profs de cours, sujets de classement. Repli démo en mémoire.
 */
import type { CampusCode } from '@/constants/brand';
import type { Population } from '@/lib/rankings';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Teacher = {
  id: string;
  name: string;
  styles: string[];
  photoUrl: string | null;
  instagram: string | null;
  population: Population;
  schoolId: string | null;
  schoolCode: CampusCode | null;
};

let MOCK: Teacher[] = [
  { id: 'p1', name: 'Soulz', styles: ['House'], photoUrl: null, instagram: null, population: 'open_teacher', schoolId: 'core', schoolCode: 'CORE' },
  { id: 'p2', name: 'Nelson', styles: ['Popping'], photoUrl: null, instagram: null, population: 'open_teacher', schoolId: 'core', schoolCode: 'CORE' },
  { id: 'p3', name: 'Malika', styles: ['Waacking', 'Dancehall'], photoUrl: null, instagram: null, population: 'open_teacher', schoolId: 'industry', schoolCode: 'INDUSTRY' },
  { id: 'p4', name: 'Diablo', styles: ['Popping'], photoUrl: null, instagram: null, population: 'formation_teacher', schoolId: 'core', schoolCode: 'CORE' },
  { id: 'p5', name: 'Yugson', styles: ['House'], photoUrl: null, instagram: null, population: 'formation_teacher', schoolId: 'core', schoolCode: 'CORE' },
];

export async function getTeachers(opts?: { population?: Population; schoolId?: string }): Promise<Teacher[]> {
  if (!isSupabaseConfigured) {
    return MOCK.filter(
      (t) => (!opts?.population || t.population === opts.population) && (!opts?.schoolId || t.schoolId === opts.schoolId),
    ).map((t) => ({ ...t }));
  }
  let q = supabase
    .from('jds_teachers')
    .select('id, name, styles, photo_url, instagram, population, school_id, jds_schools(code)')
    .order('name');
  if (opts?.population) q = q.eq('population', opts.population);
  if (opts?.schoolId) q = q.eq('school_id', opts.schoolId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    name: r.name,
    styles: r.styles ?? [],
    photoUrl: r.photo_url,
    instagram: r.instagram,
    population: (r.population ?? 'open_teacher') as Population,
    schoolId: r.school_id,
    schoolCode: (r.jds_schools?.code ?? null) as CampusCode | null,
  }));
}

/** Créer une fiche. Renvoie l'id (réel) ou l'id mock en démo. */
export async function createTeacher(input: {
  name: string;
  styles: string[];
  instagram?: string;
  population: Population;
  schoolId?: string | null;
}): Promise<string | null> {
  if (!isSupabaseConfigured) {
    const id = `p${MOCK.length + 1}`;
    MOCK = [...MOCK, {
      id, name: input.name, styles: input.styles, photoUrl: null, instagram: input.instagram ?? null,
      population: input.population, schoolId: input.schoolId ?? null, schoolCode: null,
    }];
    return id;
  }
  const { data, error } = await supabase
    .from('jds_teachers')
    .insert({
      name: input.name,
      styles: input.styles,
      instagram: input.instagram ?? null,
      population: input.population,
      school_id: input.schoolId ?? null,
    })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('création impossible');
  return (data as any).id;
}

export async function updateTeacherPhoto(id: string, url: string): Promise<void> {
  if (!isSupabaseConfigured) {
    MOCK = MOCK.map((t) => (t.id === id ? { ...t, photoUrl: url } : t));
    return;
  }
  const { error } = await supabase.from('jds_teachers').update({ photo_url: url }).eq('id', id);
  if (error) throw error;
}
