/**
 * État « déjà passé par l'onboarding » — mémorisé (AsyncStorage).
 * Pilote la redirection au démarrage (voir _layout).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'jds_onboarded';

type OnboardingState = {
  ready: boolean;
  onboarded: boolean;
  complete: () => void;
};

const OnboardingContext = createContext<OnboardingState>({
  ready: false,
  onboarded: false,
  complete: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      setOnboarded(v === '1');
      setReady(true);
    });
  }, []);

  const value = useMemo<OnboardingState>(
    () => ({
      ready,
      onboarded,
      complete: () => {
        setOnboarded(true);
        AsyncStorage.setItem(STORAGE_KEY, '1');
      },
    }),
    [ready, onboarded],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export const useOnboarding = () => useContext(OnboardingContext);
