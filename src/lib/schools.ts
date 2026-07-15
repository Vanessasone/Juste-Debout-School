/**
 * Couche données JDS — écoles, séances (planning), réservation.
 *
 * Si Supabase est configuré (.env), on lit les vraies tables jds_*.
 * Sinon, l'app tourne en mode démo sur des données d'exemple, pour que
 * le planning s'affiche sans backend (repli identique à l'app événement).
 */
import { CampusCode } from '@/constants/brand';
import { CampusFilter } from '@/lib/campus';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type School = {
  id: string;
  code: CampusCode;
  name: string;
  tagline: string | null;
  address: string | null;
  accentColor: string;
  isOpen: boolean;
  opensOn: string | null;
};

export type Session = {
  id: string;
  schoolCode: CampusCode;
  style: string;
  level: string; // all | beginner | inter | advanced
  kind: string; // open | workshop | private | kids
  startsAt: Date;
  durationMin: number;
  capacity: number;
  booked: number;
  studioName: string | null;
  teacherName: string | null;
  priceCents: number;
};

/* ---------------- Données d'exemple (mode démo) ---------------- */

const MOCK_SCHOOLS: School[] = [
  {
    id: 'core',
    code: 'CORE',
    name: 'Juste Debout School — CORE',
    tagline: 'La maison mère · open classes',
    address: "3 rue de l'Est, 75020 Paris",
    accentColor: '#DE7A1A',
    isOpen: true,
    opensOn: null,
  },
  {
    id: 'industry',
    code: 'INDUSTRY',
    name: 'Juste Debout School — INDUSTRY',
    tagline: 'Programme danse & musique',
    address: 'Square du Caporal Peugeot, 75017 Paris',
    accentColor: '#2A3CC0',
    isOpen: false,
    opensOn: '2027-10-15',
  },
];

type MockSpec = {
  code: CampusCode;
  style: string;
  level: string;
  hour: number;
  minute: number;
  dayOffset: number;
  capacity: number;
  booked: number;
  studio: string;
  teacher: string;
};

const MOCK_SPECS: MockSpec[] = [
  { code: 'CORE', style: 'House', level: 'inter', hour: 18, minute: 30, dayOffset: 0, capacity: 25, booked: 13, studio: 'Studio 1', teacher: 'Soulz' },
  { code: 'CORE', style: 'Popping', level: 'all', hour: 19, minute: 0, dayOffset: 0, capacity: 22, booked: 8, studio: 'Studio 2', teacher: 'Nelson' },
  { code: 'CORE', style: 'Hip-Hop', level: 'beginner', hour: 20, minute: 0, dayOffset: 0, capacity: 25, booked: 25, studio: 'Studio 1', teacher: 'Sonia' },
  { code: 'CORE', style: 'Locking', level: 'inter', hour: 20, minute: 30, dayOffset: 0, capacity: 20, booked: 11, studio: 'Studio 3', teacher: 'Junior' },
  { code: 'CORE', style: 'House', level: 'advanced', hour: 18, minute: 30, dayOffset: 1, capacity: 25, booked: 6, studio: 'Studio 1', teacher: 'Soulz' },
  { code: 'CORE', style: 'Dancehall', level: 'all', hour: 19, minute: 0, dayOffset: 1, capacity: 22, booked: 14, studio: 'Studio 2', teacher: 'Malika' },
  { code: 'CORE', style: 'Bboying', level: 'inter', hour: 20, minute: 0, dayOffset: 2, capacity: 20, booked: 9, studio: 'Studio 3', teacher: 'Lil Kev' },
  { code: 'INDUSTRY', style: 'Amapiano', level: 'all', hour: 19, minute: 0, dayOffset: 2, capacity: 24, booked: 4, studio: 'Studio A', teacher: 'Invité' },
];

function mockSessions(): Session[] {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return MOCK_SPECS.map((s, i) => {
    const d = new Date(midnight);
    d.setDate(d.getDate() + s.dayOffset);
    d.setHours(s.hour, s.minute, 0, 0);
    return {
      id: `mock-${i}`,
      schoolCode: s.code,
      style: s.style,
      level: s.level,
      kind: 'open',
      startsAt: d,
      durationMin: 75,
      capacity: s.capacity,
      booked: s.booked,
      studioName: s.studio,
      teacherName: s.teacher,
      priceCents: 1500,
    };
  });
}

/* ---------------- Accès réel (Supabase) ---------------- */

export async function getSchools(): Promise<School[]> {
  if (!isSupabaseConfigured) return MOCK_SCHOOLS;
  const { data, error } = await supabase
    .from('jds_schools')
    .select('id, code, name, tagline, address, accent_color, is_open, opens_on')
    .order('sort_order');
  if (error || !data) return MOCK_SCHOOLS;
  return data.map((r) => ({
    id: r.id,
    code: r.code as CampusCode,
    name: r.name,
    tagline: r.tagline,
    address: r.address,
    accentColor: r.accent_color,
    isOpen: r.is_open,
    opensOn: r.opens_on,
  }));
}

/** Séances d'un jour donné, filtrées par campus (ou toutes). */
export async function getSessions(campus: CampusFilter, day: Date): Promise<Session[]> {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  if (!isSupabaseConfigured) {
    return mockSessions()
      .filter((s) => (campus === 'ALL' ? true : s.schoolCode === campus))
      .filter((s) => s.startsAt >= dayStart && s.startsAt < dayEnd)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  let q = supabase
    .from('jds_sessions')
    .select(
      'id, style, level, kind, starts_at, duration_min, capacity, price_cents, ' +
        'jds_schools!inner(code), jds_studios(name), jds_teachers(name)',
    )
    .eq('status', 'scheduled')
    .gte('starts_at', dayStart.toISOString())
    .lt('starts_at', dayEnd.toISOString())
    .order('starts_at');

  if (campus !== 'ALL') q = q.eq('jds_schools.code', campus);

  const { data, error } = await q;
  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    schoolCode: r.jds_schools?.code as CampusCode,
    style: r.style,
    level: r.level,
    kind: r.kind,
    startsAt: new Date(r.starts_at),
    durationMin: r.duration_min,
    capacity: r.capacity,
    booked: 0, // TODO: compter via jds_session_booked (RPC/agrégat) en phase 2
    studioName: r.jds_studios?.name ?? null,
    teacherName: r.jds_teachers?.name ?? null,
    priceCents: r.price_cents,
  }));
}

/** Prochaines séances à venir (tous jours confondus), triées par heure. */
export async function getUpcomingSessions(campus: CampusFilter, limit = 6): Promise<Session[]> {
  const now = new Date();
  if (!isSupabaseConfigured) {
    return mockSessions()
      .filter((s) => (campus === 'ALL' ? true : s.schoolCode === campus))
      .filter((s) => s.startsAt >= now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, limit);
  }
  let q = supabase
    .from('jds_sessions')
    .select(
      'id, style, level, kind, starts_at, duration_min, capacity, price_cents, ' +
        'jds_schools!inner(code), jds_studios(name), jds_teachers(name)',
    )
    .eq('status', 'scheduled')
    .gte('starts_at', now.toISOString())
    .order('starts_at')
    .limit(limit);
  if (campus !== 'ALL') q = q.eq('jds_schools.code', campus);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    schoolCode: r.jds_schools?.code as CampusCode,
    style: r.style,
    level: r.level,
    kind: r.kind,
    startsAt: new Date(r.starts_at),
    durationMin: r.duration_min,
    capacity: r.capacity,
    booked: 0,
    studioName: r.jds_studios?.name ?? null,
    teacherName: r.jds_teachers?.name ?? null,
    priceCents: r.price_cents,
  }));
}

/** Réserve une séance via la RPC serveur (débit de carte + place/liste d'attente). */
export async function bookSession(
  sessionId: string,
  cardId: string,
): Promise<'booked' | 'waitlist'> {
  const { data, error } = await supabase.rpc('jds_book_session', {
    p_session: sessionId,
    p_card: cardId,
  });
  if (error) throw error;
  return data as 'booked' | 'waitlist';
}

/** Créer un cours / créneau (staff/admin). Démo : no-op. */
export async function createSession(input: {
  schoolId: string;
  style: string;
  level: string;
  kind: string;
  startsAt: Date;
  durationMin: number;
  capacity: number;
  studioId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('jds_sessions').insert({
    school_id: input.schoolId,
    style: input.style,
    level: input.level,
    kind: input.kind,
    starts_at: input.startsAt.toISOString(),
    duration_min: input.durationMin,
    capacity: input.capacity,
    studio_id: input.studioId ?? null,
  });
  if (error) throw error;
}

export type SessionInput = {
  schoolId: string;
  style: string;
  level: string;
  kind: string;
  startsAt: Date;
  durationMin: number;
  capacity: number;
  studioId?: string | null;
};

/** Créer plusieurs cours d'un coup (ex. cours récurrent). Renvoie le nombre créé. */
export async function createSessions(inputs: SessionInput[]): Promise<number> {
  if (!isSupabaseConfigured) return inputs.length; // démo : simule
  if (inputs.length === 0) return 0;
  const rows = inputs.map((i) => ({
    school_id: i.schoolId,
    style: i.style,
    level: i.level,
    kind: i.kind,
    starts_at: i.startsAt.toISOString(),
    duration_min: i.durationMin,
    capacity: i.capacity,
    studio_id: i.studioId ?? null,
  }));
  const { error } = await supabase.from('jds_sessions').insert(rows);
  if (error) throw error;
  return rows.length;
}

export const LEVEL_LABEL: Record<string, string> = {
  all: 'Tous niveaux',
  beginner: 'Débutant',
  inter: 'Inter',
  advanced: 'Avancé',
};
