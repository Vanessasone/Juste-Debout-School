/**
 * Ouvre l'app Juste Debout (événement) avec transfert de session (SSO).
 *
 * La session Supabase courante (même projet/compte que l'app School) est passée dans le
 * FRAGMENT `#` de l'URL — jamais envoyé au serveur — que l'app événement lit puis efface.
 * Sans session, on ouvre simplement l'app (login côté JD).
 */
import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

export const EVENT_APP_URL = 'https://justedeboutapp.netlify.app';

export async function openEventApp(): Promise<void> {
  let url = EVENT_APP_URL;
  try {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (s?.access_token && s?.refresh_token) {
      url =
        `${EVENT_APP_URL}/#sso=1` +
        `&access_token=${encodeURIComponent(s.access_token)}` +
        `&refresh_token=${encodeURIComponent(s.refresh_token)}`;
    }
  } catch {
    // pas de session récupérable → ouverture simple
  }
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(url, '_blank'); // web : nouvel onglet
  } else {
    await Linking.openURL(url); // natif
  }
}
