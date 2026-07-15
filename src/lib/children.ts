/**
 * MES ENFANTS — espace parent (app JDS).
 * Un parent (profiles) rattache un ou plusieurs enfants mineurs, réserve leurs
 * cours et suit leur présence. Table `jds_children` sur le Supabase partagé
 * (parent_id → profiles). Le suivi (présences/série/carte) sera agrégé depuis
 * les bookings/cartes kids en Phase B ; ici valeurs d'exemple en démo.
 */
import type { CampusCode } from '@/constants/brand';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Child = {
  id: string;
  firstName: string;
  birthYear: number | null;
  schoolCode: CampusCode;
  level: string | null;
  styles: string[];
  photoUrl: string | null;
  cardLeft: number | null; // cours restants sur la carte kids
  attendance: number; // présences ce trimestre
  streak: number; // semaines d'affilée
};

export type NewChild = {
  firstName: string;
  birthYear: number | null;
  schoolCode: CampusCode;
  level: string | null;
  styles: string[];
};

const CURRENT_YEAR = 2026; // figé — l'âge exact viendra d'une vraie date de naissance

let MOCK: Child[] = [
  { id: 'c1', firstName: 'Léa', birthYear: 2014, schoolCode: 'CORE', level: 'Kids', styles: ['Hip-Hop Kids'], photoUrl: null, cardLeft: 7, attendance: 12, streak: 3 },
  { id: 'c2', firstName: 'Noé', birthYear: 2012, schoolCode: 'CORE', level: 'Junior', styles: ['Bboying', 'House'], photoUrl: null, cardLeft: 3, attendance: 8, streak: 1 },
];

export function childAge(c: Child): number | null {
  return c.birthYear ? CURRENT_YEAR - c.birthYear : null;
}

function rowToChild(r: any): Child {
  return {
    id: r.id,
    firstName: r.first_name,
    birthYear: r.birth_year ?? null,
    schoolCode: (r.school_code ?? 'CORE') as CampusCode,
    level: r.level ?? null,
    styles: r.styles ?? [],
    photoUrl: r.photo_url ?? null,
    cardLeft: r.card_left ?? null,
    attendance: r.attendance ?? 0,
    streak: r.streak ?? 0,
  };
}

export async function getChildren(): Promise<Child[]> {
  if (!isSupabaseConfigured) return MOCK;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('jds_children')
    .select('*')
    .eq('parent_id', user.id)
    .order('created_at');
  if (error || !data) return [];
  return data.map(rowToChild);
}

export async function getChild(id: string): Promise<Child | null> {
  if (!isSupabaseConfigured) return MOCK.find((c) => c.id === id) ?? null;
  const { data, error } = await supabase.from('jds_children').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return rowToChild(data);
}

/* ---------------- Réservations enfant ---------------- */
const DEMO_BOOKINGS = new Map<string, Set<string>>(); // childId → sessionIds (démo)

export async function getChildBookings(childId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return Array.from(DEMO_BOOKINGS.get(childId) ?? []);
  const { data, error } = await supabase.from('jds_child_bookings').select('session_id').eq('child_id', childId);
  if (error || !data) return [];
  return data.map((r: any) => r.session_id);
}

export async function bookChildSession(childId: string, sessionId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const set = DEMO_BOOKINGS.get(childId) ?? new Set<string>();
    set.add(sessionId);
    DEMO_BOOKINGS.set(childId, set);
    return;
  }
  await supabase.from('jds_child_bookings').insert({ child_id: childId, session_id: sessionId });
}

export async function addChild(input: NewChild): Promise<Child | null> {
  if (!isSupabaseConfigured) {
    const c: Child = { id: 'c' + (MOCK.length + 1), ...input, photoUrl: null, cardLeft: null, attendance: 0, streak: 0 };
    MOCK = [...MOCK, c];
    return c;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');
  const { data, error } = await supabase
    .from('jds_children')
    .insert({
      parent_id: user.id,
      first_name: input.firstName,
      birth_year: input.birthYear,
      school_code: input.schoolCode,
      level: input.level,
      styles: input.styles,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToChild(data);
}
