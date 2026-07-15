import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { gradientFor, Palette } from '@/constants/brand';
import { useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';

export default function TabsLayout() {
  const { accent, campus } = useCampus();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 20) + 12;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: Palette.textMute,
        tabBarStyle: [styles.bar, { height: 60 + bottomPad, paddingBottom: bottomPad }],
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: { paddingTop: 6 },
        tabBarAllowFontScaling: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: t('tab.planning'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hub"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View style={styles.center}>
              <LinearGradient colors={gradientFor(campus)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.centerCircle}>
                <Wavetruv size={30} tint="#fff" />
              </LinearGradient>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: t('tab.videos'),
          tabBarIcon: ({ color, size }) => <Ionicons name="play-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      {/* Ma carte : accessible depuis l'Accueil / le Profil, hors barre d'onglets pour l'instant */}
      <Tabs.Screen name="wallet" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Palette.surface,
    borderTopColor: Palette.border,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.1 },
  center: { marginTop: -20 },
  centerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 7,
    elevation: 8,
  },
});
