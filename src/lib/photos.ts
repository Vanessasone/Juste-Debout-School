/**
 * Photos School : avatars privés ; les médias enseignants suivent leur circuit distinct.
 */
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const BUCKET = 'photos';
const AVATAR_BUCKET = 'school-avatars';
const AVATAR_PREFIX = 'school-avatar:';

/** Résout une référence privée à la lecture, sans enregistrer une URL temporaire. */
export async function resolveProfilePhoto(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith(AVATAR_PREFIX)) return /^https:\/\//.test(value) ? value : null;
  const path = value.slice(AVATAR_PREFIX.length);
  if (!/^[0-9a-f-]{36}\/avatar$/.test(path)) return null;
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
  return error ? null : data?.signedUrl ?? null;
}

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
  const image = decode(base64);
  if (image.byteLength > 5 * 1024 * 1024) throw new Error('Choisis une photo de moins de 5 Mo.');
  const bytes = new Uint8Array(image);
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i] === b);
  if (!jpeg && !png) throw new Error('Choisis une photo JPEG ou PNG.');
  const path = `${user.id}/avatar`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, image, { contentType: jpeg ? 'image/jpeg' : 'image/png', cacheControl: '0', upsert: true });
  if (error) throw error;
  return `${AVATAR_PREFIX}${path}`;
}
