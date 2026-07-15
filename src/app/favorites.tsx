/**
 * MES FAVORIS — cours, profs, stages, vidéos mis en favori (cœur ♥).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { FavHeart } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { FavKind, useFavorites } from '@/lib/favorites';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';

const ORDER: { kind: FavKind; icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
  { kind: 'class', icon: 'calendar', key: 'fav.class' },
  { kind: 'teacher', icon: 'people', key: 'fav.teacher' },
  { kind: 'stage', icon: 'flame', key: 'fav.stage' },
  { kind: 'video', icon: 'play-circle', key: 'fav.video' },
];

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { favorites } = useFavorites();

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('fav.title')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        {favorites.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={30} color={Palette.textMute} />
            <Text style={styles.emptyText}>{t('fav.empty')}</Text>
          </View>
        ) : (
          ORDER.map(({ kind, icon, key }) => {
            const items = favorites.filter((f) => f.kind === kind);
            if (items.length === 0) return null;
            return (
              <View key={kind} style={{ marginBottom: Space.lg }}>
                <View style={styles.secRow}>
                  <Ionicons name={icon} size={16} color={Palette.pink} />
                  <Text style={styles.secTitle}>{t(key)}</Text>
                  <Text style={styles.count}>{items.length}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {items.map((f) => (
                    <View key={f.key} style={styles.card}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardLabel}>{f.label}</Text>
                        {f.subtitle ? <Text style={styles.cardSub}>{f.subtitle}</Text> : null}
                      </View>
                      <FavHeart fav={f} size={20} />
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: '#14101c', paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  empty: { alignItems: 'center', gap: 12, marginTop: Space.xxxl, paddingHorizontal: Space.xl },
  emptyText: { ...Type.body, color: Palette.textMute, textAlign: 'center' },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Space.sm },
  secTitle: { ...Type.h2, color: Palette.text, flex: 1 },
  count: { fontSize: 13, fontWeight: '800', color: Palette.textMute },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 14 },
  cardLabel: { fontSize: 15, fontWeight: '800', color: Palette.text, textTransform: 'uppercase', letterSpacing: -0.2 },
  cardSub: { fontSize: 12, color: Palette.textDim, marginTop: 2 },
});
