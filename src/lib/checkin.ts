/**
 * CHECK-IN ACCUEIL — borne (tablette) à la réception. On retrouve l'élève par
 * son nom, on valide sa présence à un cours. La présence alimentera plus tard
 * les JD Coins, les classements et le suivi « Mes enfants » (Phase B).
 * Table jds_checkins (voir supabase/schema-checkin.sql). Mode démo : mock.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { resolveProfilePhoto } from '@/lib/photos';

export type Member = { id: string; name: string; alias: string | null; photoUrl: string | null };

const MOCK_MEMBERS: Member[] = [
  { id: 'm1', name: 'Naïma Diallo', alias: 'Naï', photoUrl: null },
  { id: 'm2', name: 'Karim Benali', alias: 'K-Rime', photoUrl: null },
  { id: 'm3', name: 'Léa Moreau', alias: null, photoUrl: null },
  { id: 'm4', name: 'Sofia Costa', alias: 'Sof', photoUrl: null },
  { id: 'm5', name: 'Yanis Roche', alias: 'Yan', photoUrl: null },
  { id: 'm6', name: 'Emma Lefèvre', alias: null, photoUrl: null },
  { id: 'm7', name: 'Tom Nguyen', alias: 'T-Bo', photoUrl: null },
];

/** Membre d'exemple (pour les boutons « simuler un scan » de la borne, en démo). */
export function demoMember(): Member {
  return MOCK_MEMBERS[0];
}

export async function searchMembers(q: string): Promise<Member[]> {
  const query = q.trim();
  if (query.length < 1) return [];
  if (!isSupabaseConfigured) {
    const low = query.toLowerCase();
    return MOCK_MEMBERS.filter((m) => m.name.toLowerCase().includes(low) || (m.alias ?? '').toLowerCase().includes(low)).slice(0, 8);
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, alias, photo_url')
    .or(`full_name.ilike.%${query}%,alias.ilike.%${query}%`)
    .limit(8);
  if (error || !data) return [];
  return Promise.all(data.map(async (r: any) => ({ id: r.id, name: r.full_name ?? r.alias ?? '—', alias: r.alias ?? null, photoUrl: await resolveProfilePhoto(r.photo_url) })));
}

/** Retrouve un membre par son id (QR carte membre = JDS-MB-<id>). */
export async function getMemberById(id: string): Promise<Member | null> {
  if (!isSupabaseConfigured) return MOCK_MEMBERS.find((m) => m.id === id) ?? null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, alias, photo_url')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as any;
  return { id: r.id, name: r.full_name ?? r.alias ?? '—', alias: r.alias ?? null, photoUrl: await resolveProfilePhoto(r.photo_url) };
}

/** Valide la présence. En démo : renvoie true. En réel : insert best-effort. */
export async function checkIn(memberId: string, sessionId: string | null): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    await supabase.from('jds_checkins').insert({ member_id: memberId, session_id: sessionId });
  } catch {
    /* table pas encore migrée → sans blocage (le geste reste validé côté borne) */
  }
  return true;
}
