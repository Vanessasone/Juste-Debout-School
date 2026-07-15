/**
 * MES ENFANTS — liste des enfants rattachés au compte parent.
 * Chaque carte → détail (/child/[id]) ; bouton « Ajouter un enfant ».
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { gradientFor, Palette, Radius, Space, Type } from '@/constants/brand';
import { childAge, getChildren, type Child } from '@/lib/children';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';

export default function Children() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [children, setChildren] = useState<Child[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      getChildren().then(setChildren).catch(() => setChildren([]));
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('kids.title')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        <Text style={styles.intro}>{t('kids.intro')}</Text>

        {children === null ? (
          <ActivityIndicator color={Palette.core} style={{ marginTop: Space.xl }} />
        ) : children.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="happy-outline" size={34} color={Palette.textMute} />
            <Text style={styles.emptyText}>{t('kids.empty')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginTop: Space.sm }}>
            {children.map((c) => {
              const age = childAge(c);
              return (
                <Pressable key={c.id} style={styles.card} onPress={() => router.push(`/child/${c.id}`)}>
                  {c.photoUrl ? (
                    <Image source={{ uri: c.photoUrl }} style={styles.avatar} />
                  ) : (
                    <LinearGradient colors={gradientFor(c.schoolCode)} style={styles.avatar}>
                      <Text style={styles.avatarInit}>{c.firstName.charAt(0)}</Text>
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{c.firstName}</Text>
                    <Text style={styles.meta}>
                      {[age != null ? t('kids.age', { n: age }) : null, c.level, c.schoolCode].filter(Boolean).join(' · ')}
                    </Text>
                    <View style={styles.stats}>
                      <View style={styles.stat}><Ionicons name="checkmark-circle" size={13} color={Palette.industry} /><Text style={styles.statTxt}>{c.attendance}</Text></View>
                      <View style={styles.stat}><Ionicons name="flame" size={13} color={Palette.core} /><Text style={styles.statTxt}>{c.streak}</Text></View>
                      <View style={styles.stat}><Ionicons name="card" size={13} color={Palette.pink} /><Text style={styles.statTxt}>{c.cardLeft != null ? t('kids.card', { n: c.cardLeft }) : t('kids.noCard')}</Text></View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Palette.textMute} />
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: Space.lg }}>
          <GradientBtn label={t('kids.add')} colors={gradientFor('CORE')} onPress={() => router.push('/add-child')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: '#14101c', paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  intro: { ...Type.body, color: Palette.textDim, marginBottom: Space.md },
  empty: { alignItems: 'center', gap: 10, paddingVertical: Space.xxxl },
  emptyText: { ...Type.body, color: Palette.textMute, textAlign: 'center', maxWidth: 260 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.lg, padding: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 22, fontWeight: '800' },
  name: { fontSize: 16, fontWeight: '800', color: Palette.text },
  meta: { fontSize: 12.5, fontWeight: '600', color: Palette.textDim, marginTop: 2 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statTxt: { fontSize: 12, fontWeight: '700', color: Palette.textDim },
});
