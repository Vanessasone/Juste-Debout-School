/** Profil réservé à Juste Debout School, sans partage avec les applications événement. */
import { supabase } from '@/lib/supabase';
import { resolveProfilePhoto } from '@/lib/photos';

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
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if(authError)throw authError;
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // aucune ligne
    throw error;
  }
  return { ...data, photo_url: await resolveProfilePhoto(data.photo_url) } as Profile;
}

export type EditableProfile = Pick<Profile, 'full_name' | 'alias' | 'country' | 'city' | 'styles' | 'level' | 'bio' | 'instagram' | 'photo_url' | 'available_for_school'>;

export async function updateMyProfile(fields: Partial<EditableProfile>): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if(authError)throw authError;
  if (!user) throw new Error('Tu dois être connecté.');
  const { data, error } = await supabase.from('profiles').update(fields).eq('id', user.id).select('id').single();
  if (error) throw error;
  if (!data?.id) throw new Error('Le profil n’a pas été enregistré. Réessaie.');
}

export function isAdmin(p: Profile | null): boolean {
  return !!p?.roles?.includes('admin');
}
