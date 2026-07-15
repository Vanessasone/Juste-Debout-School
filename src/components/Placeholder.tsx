/** Écran « à venir » réutilisable, sur la charte JDS. */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, Space, Type } from '@/constants/brand';
import { useCampus } from '@/lib/campus';

export function Placeholder({
  icon,
  title,
  subtitle,
  phase,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  phase: string;
}) {
  const insets = useSafeAreaInsets();
  const { accent } = useCampus();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Space.sm }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>{title}</Text>
      </View>
      <View style={styles.center}>
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Ionicons name={icon} size={26} color={Palette.white} />
        </View>
        <Text style={styles.sub}>{subtitle}</Text>
        <Text style={[styles.phase, { color: accent }]}>{phase}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Palette.bg },
  header: { paddingHorizontal: Space.lg, marginBottom: Space.md },
  brand: { ...Type.display, color: Palette.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: Space.xl },
  badge: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sub: { ...Type.body, color: Palette.textDim, textAlign: 'center', maxWidth: 280 },
  phase: { ...Type.label },
});
