/**
 * Profil utilisateur — MÊME table `profiles` que l'app événement Juste Debout.
 * Le profil est donc PARTAGÉ : modifié ici → visible sur l'app événement, et
 * inversement (même compte, même identifiant, mêmes champs).
 */
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  full_name: string | null;
  alias: string | null;
  country: string | null;
  city: string | null;
  styles: string[] | null;
  level: string | null;
  bio: string | null;
  instagram: string | null;
  photo_url: string | null;
  official_photo_url: string | null;
  roles: string[] | null;
  available_for_school?: boolean | null;
  school_note?: string | null;
};

export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // aucune ligne
    throw error;
  }
  return data as Profile;
}

export async function updateMyProfile(fields: Partial<Profile>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tu dois être connecté.');
  const { error } = await supabase.from('profiles').update(fields).eq('id', user.id);
  if (error) throw error;
}

export function isAdmin(p: Profile | null): boolean {
  return !!p?.roles?.includes('admin');
}
