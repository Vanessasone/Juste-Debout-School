/**
 * Favoris — cours, profs, stages, vidéos. Stockés localement (AsyncStorage),
 * réactifs via un contexte. (Sync multi-appareils possible plus tard via Supabase.)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type FavKind = 'class' | 'teacher' | 'stage' | 'video';
export type Fav = { key: string; kind: FavKind; label: string; subtitle?: string };

const STORAGE_KEY = 'jds_favorites';

type FavState = {
  favorites: Fav[];
  isFav: (key: string) => boolean;
  toggle: (f: Fav) => void;
};

const FavContext = createContext<FavState>({ favorites: [], isFav: () => false, toggle: () => {} });

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Fav[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) {
        try { setFavorites(JSON.parse(v)); } catch {}
      }
    });
  }, []);

  const persist = useCallback((next: Fav[]) => {
    setFavorites(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const value = useMemo<FavState>(() => ({
    favorites,
    isFav: (key) => favorites.some((f) => f.key === key),
    toggle: (f) => {
      const exists = favorites.some((x) => x.key === f.key);
      persist(exists ? favorites.filter((x) => x.key !== f.key) : [f, ...favorites]);
    },
  }), [favorites, persist]);

  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export const useFavorites = () => useContext(FavContext);
