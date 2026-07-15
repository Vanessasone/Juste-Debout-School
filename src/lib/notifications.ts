/**
 * Notifications in-app — boîte de réception + envoi (staff).
 * L'état « vu » est local (dernier horodatage consulté). L'envoi push réel
 * (Expo push tokens) se branchera plus tard sur ces mêmes données.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CampusCode } from '@/constants/brand';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type NotifKind = 'info' | 'absence' | 'replacement' | 'reminder';
export type Notif = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  createdAt: Date;
  schoolCode: CampusCode | null;
};

const SEEN_KEY = 'jds_notif_seen';

function mock(): Notif[] {
  const now = Date.now();
  return [
    { id: 'n1', kind: 'absence', title: 'Cours de House annulé ce soir', body: 'Le cours de House de 19h (Soulz) est annulé — prof absent. Désolé !', createdAt: new Date(now - 2 * 3600e3), schoolCode: 'CORE' },
    { id: 'n2', kind: 'replacement', title: 'Remplacement en Popping', body: 'Nelson remplace pour le Popping de demain 19h.', createdAt: new Date(now - 26 * 3600e3), schoolCode: 'CORE' },
    { id: 'n3', kind: 'info', title: 'Nouveau stage Amapiano', body: 'Un stage Amapiano ouvre samedi 13 — réserve ta place !', createdAt: new Date(now - 3 * 24 * 3600e3), schoolCode: null },
  ];
}

export async function getNotifications(): Promise<Notif[]> {
  if (!isSupabaseConfigured) return mock();
  const { data, error } = await supabase
    .from('jds_notifications')
    .select('id, kind, title, body, created_at, jds_schools(code)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    kind: (r.kind ?? 'info') as NotifKind,
    title: r.title,
    body: r.body,
    createdAt: new Date(r.created_at),
    schoolCode: (r.jds_schools?.code ?? null) as CampusCode | null,
  }));
}

/** Envoi (staff/admin). Démo : no-op. */
export async function sendNotification(input: {
  schoolId: string | null;
  kind: NotifKind;
  title: string;
  body: string;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('jds_notifications').insert({
    scope_school_id: input.schoolId,
    kind: input.kind,
    title: input.title,
    body: input.body,
  });
  if (error) throw error;
}

export async function getLastSeen(): Promise<number> {
  const v = await AsyncStorage.getItem(SEEN_KEY);
  return v ? Number(v) : 0;
}
export async function markSeen(): Promise<void> {
  await AsyncStorage.setItem(SEEN_KEY, String(Date.now()));
}
