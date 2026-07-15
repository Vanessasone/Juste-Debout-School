/**
 * Contexte d'authentification — Supabase Auth, PARTAGÉ avec l'app événement.
 * En mode démo (Supabase non configuré), la session reste nulle et l'app
 * fonctionne en lecture seule sur des données d'exemple.
 */
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * SSO : récupère une session transmise par l'app événement Juste Debout via le fragment
 * d'URL (#sso=1&access_token=…&refresh_token=…). Le fragment n'est jamais envoyé au serveur ;
 * on l'efface aussitôt de l'URL. Web uniquement (le handoff se fait dans le navigateur).
 */
async function consumeSsoFromUrl(): Promise<void> {
  if (typeof window === 'undefined' || !window.location?.hash) return;
  const hash = window.location.hash;
  if (!hash.includes('sso=1')) return;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

type AuthState = {
  session: Session | null;
  initializing: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  initializing: true,
  configured: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInitializing(false);
      return;
    }
    (async () => {
      try {
        // SSO depuis l'app événement (si arrivé avec une session dans l'URL), puis lecture de la session.
        await consumeSsoFromUrl();
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch {
        setSession(null);
      } finally {
        setInitializing(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      initializing,
      configured: isSupabaseConfigured,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
