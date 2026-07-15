/**
 * Upload de photos vers Supabase Storage (bucket public « photos », partagé
 * avec l'app événement). Réservé au staff/admin pour les fiches (RLS).
 */
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const BUCKET = 'photos';

/** Ouvre la galerie et renvoie l'image en base64 (ou null si annulé). */
export async function pickImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Autorisation d'accès aux photos refusée.");
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });
  if (res.canceled || !res.assets?.length || !res.assets[0].base64) return null;
  return res.assets[0].base64;
}

async function uploadBase64(path: string, base64: string): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

/** Choisit une image et l'uploade pour une fiche prof/danseur. Renvoie l'URL. */
export async function pickAndUploadTeacher(teacherId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null; // démo : pas d'upload
  const base64 = await pickImage();
  if (!base64) return null;
  return uploadBase64(`teachers/${teacherId}.jpg`, base64);
}

/** Photo de profil perso de l'utilisateur connecté. Renvoie l'URL. */
export async function pickAndUploadAvatar(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const base64 = await pickImage();
  if (!base64) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tu dois être connecté.');
  return uploadBase64(`${user.id}/avatar.jpg`, base64);
}
