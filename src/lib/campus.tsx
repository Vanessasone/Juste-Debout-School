/**
 * Contexte « campus actif » — pilote le multi-écoles côté app.
 * L'utilisateur choisit CORE, INDUSTRY ou « Tout » ; l'accent de l'app
 * (orange / cobalt) et le filtrage du planning en découlent.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { accentFor, CampusCode } from '@/constants/brand';

export type CampusFilter = CampusCode | 'ALL';

type CampusState = {
  campus: CampusFilter;
  accent: string;
  setCampus: (c: CampusFilter) => void;
};

const STORAGE_KEY = 'jds_campus';

const CampusContext = createContext<CampusState>({
  campus: 'CORE',
  accent: accentFor('CORE'),
  setCampus: () => {},
});

export function CampusProvider({ children }: { children: React.ReactNode }) {
  const [campus, setCampusState] = useState<CampusFilter>('CORE');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'CORE' || v === 'INDUSTRY' || v === 'ALL') setCampusState(v);
    });
  }, []);

  const setCampus = (c: CampusFilter) => {
    setCampusState(c);
    AsyncStorage.setItem(STORAGE_KEY, c);
  };

  const value = useMemo<CampusState>(
    () => ({ campus, accent: accentFor(campus), setCampus }),
    [campus],
  );

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export const useCampus = () => useContext(CampusContext);
