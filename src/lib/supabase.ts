/** Client réservé au projet Supabase indépendant de Juste Debout School. */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// School must never reconnect to the event/TOTF backend.
const schoolProjectUrl = 'https://zmzunjphubbdumowcurk.supabase.co';
if (supabaseUrl && supabaseUrl !== schoolProjectUrl) {
  throw new Error('School requires its dedicated backend configuration.');
}

/** Vrai quand le .env est renseigné. Sinon, l'app tourne en mode démo (mock). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      storageKey: 'jds-school-auth-v1',
      autoRefreshToken: true,
      persistSession: true,
      // Sur le web : lire la session dans l'URL (retour du lien de confirmation
      // d'email / reset). Sur natif : pas d'URL → false.
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);
