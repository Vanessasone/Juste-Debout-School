/**
 * JD POINTS — programme de fidélité, PARTAGÉ avec l'app événement Juste Debout.
 * Un seul portefeuille par personne (table jd_points_ledger sur le Supabase
 * commun) → les points gagnés à l'école OU à l'événement s'additionnent.
 * En démo : solde d'exemple.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Tier = { name: string; min: number; color: string; mult: number; benefitKey: string };

export const TIERS: Tier[] = [
  { name: 'Basic', min: 0, color: '#847B6D', mult: 1, benefitKey: 'pts.tBasic' },
  { name: 'Foundation', min: 250, color: '#3E9E59', mult: 1.1, benefitKey: 'pts.tFoundation' },
  { name: 'Rise & Shine', min: 800, color: '#FF6A16', mult: 1.25, benefitKey: 'pts.tRise' },
  { name: 'Full Out', min: 2000, color: '#FF2E7E', mult: 1.5, benefitKey: 'pts.tFull' },
];

export type TierInfo = {
  total: number;
  current: Tier;
  next: Tier | null;
  toNext: number; // points restants pour le palier suivant
  progress: number; // 0..1 dans le palier courant
};

export function tierInfo(total: number): TierInfo {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (total >= TIERS[i].min) idx = i;
  const current = TIERS[idx];
  const next = TIERS[idx + 1] ?? null;
  const span = next ? next.min - current.min : 1;
  const done = total - current.min;
  return {
    total,
    current,
    next,
    toNext: next ? Math.max(0, next.min - total) : 0,
    progress: next ? Math.min(1, done / span) : 1,
  };
}

/** Solde JD Points de l'utilisateur (somme du ledger partagé). */
export async function getMyPoints(): Promise<number> {
  if (!isSupabaseConfigured) return 1240; // démo → palier Foundation
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data, error } = await supabase
    .from('jd_points_ledger')
    .select('delta')
    .eq('profile_id', user.id);
  if (error || !data) return 0;
  return data.reduce((s: number, r: any) => s + (r.delta ?? 0), 0);
}
