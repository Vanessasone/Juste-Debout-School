/**
 * PARRAINAGE — code du membre, compteur de parrainages, et validation du code
 * d'un parrain à l'inscription. S'appuie sur les RPC de confiance côté Supabase
 * (schema-referrals.sql). Démo : valeurs d'exemple.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function getMyReferralCode(): Promise<string> {
  if (!isSupabaseConfigured) return 'NAIMA-JDS';
  const { data, error } = await supabase.rpc('jds_my_referral_code');
  if (error || !data) return '—';
  return data as string;
}

export async function getReferralCount(): Promise<number> {
  if (!isSupabaseConfigured) return 6;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from('jds_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', user.id);
  return count ?? 0;
}

export type RedeemResult = 'ok' | 'self' | 'already' | 'not_found' | 'empty' | 'error';

/** Le filleul valide le code de son parrain (crédite les coins des deux côtés). */
export async function redeemReferral(code: string): Promise<RedeemResult> {
  if (!isSupabaseConfigured) return 'ok';
  const { data, error } = await supabase.rpc('jds_redeem_referral', { p_code: code });
  if (error) return 'error';
  return (data as RedeemResult) ?? 'error';
}
