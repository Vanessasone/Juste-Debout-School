import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Palette } from '@/constants/brand';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CampusProvider } from '@/lib/campus';
import { FavoritesProvider } from '@/lib/favorites';
import { I18nProvider } from '@/lib/i18n';
import { OnboardingProvider, useOnboarding } from '@/lib/onboarding';
import { registerForPush } from '@/lib/push';

function RootNavigator() {
  const { session, initializing, configured } = useAuth();
  const { ready, onboarded } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { if (session) registerForPush(); }, [session]);

  useEffect(() => {
    if (initializing || !ready) return;
    if(segments[0]==='update-password') return;
    const inOnboarding = segments[0] === 'onboarding';

    // 1) Premier lancement → onboarding
    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (!onboarded) return;

    // 2) Auth requise uniquement si Supabase est branché. En mode démo, accès direct.
    const inAuth = segments[0] === 'login';
    if (configured && !session && !inAuth) {
      router.replace('/login');
    } else if (session && inAuth) {
      router.replace('/(tabs)');
    }
  }, [session, initializing, configured, ready, onboarded, segments, router]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Palette.bg },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="update-password" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="rankings" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="admin-points" />
        <Stack.Screen name="admin-poll" />
        <Stack.Screen name="admin-planning" />
        <Stack.Screen name="admin-people" />
        <Stack.Screen name="admin-directory" />
        <Stack.Screen name="admin-training" />
        <Stack.Screen name="my-training" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="rentals" />
        <Stack.Screen name="shop" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="search" />
        <Stack.Screen name="referral" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="admin-notif" />
        <Stack.Screen name="points" />
        <Stack.Screen name="children" />
        <Stack.Screen name="add-child" />
        <Stack.Screen name="child/[id]" />
        <Stack.Screen name="kiosk" />
        <Stack.Screen name="reservations" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <OnboardingProvider>
          <CampusProvider>
            <FavoritesProvider>
              <AuthProvider>
                <RootNavigator />
              </AuthProvider>
            </FavoritesProvider>
          </CampusProvider>
        </OnboardingProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
