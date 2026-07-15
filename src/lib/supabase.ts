/**
 * Client Supabase — backend PARTAGÉ avec l'app événement Juste Debout.
 *
 * L'app école pointe sur le MÊME projet Supabase que l'app événement
 * (mêmes auth.users + table profiles) → le compte / la session sont communs.
 * Les identifiants sont lus depuis le .env (voir .env.example) :
 *   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (clé publique).
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Vrai quand le .env est renseigné. Sinon, l'app tourne en mode démo (mock). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Sur le web : lire la session dans l'URL (retour du lien de confirmation
      // d'email / reset). Sur natif : pas d'URL → false.
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);
