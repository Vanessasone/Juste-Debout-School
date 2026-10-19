/**
 * JD POINTS — solde, statut (Basic → Foundation → Rise & Shine → Full Out),
 * façons de gagner, catalogue de récompenses. Partagé avec l'app événement.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Coin } from '@/components/Coin';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { getMyPoints, tierInfo, TIERS } from '@/lib/points';

export default function Points() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [total, setTotal] = useState(0);

  useEffect(() => { getMyPoints().then(setTotal); }, []);

  const info = tierInfo(total);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('pts.title')}</Text>
        <Coin size={26} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        {/* Carte solde */}
        <LinearGradient colors={[info.current.color, info.next?.color ?? info.current.color] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balance}>
          <View style={styles.balanceTop}>
            <View style={styles.tierRow}>
              <Text style={styles.tierName}>{info.current.name}</Text>

            </View>
            <Coin size={34} />
          </View>
          <Text style={styles.balanceLabel}>{t('pts.balance')}</Text>
          <Text style={styles.balanceNum}>{total.toLocaleString('fr-FR')} <Text style={styles.balanceUnit}>coins</Text></Text>
          <Text style={styles.shared}>♻︎ {t('pts.shared')}</Text>
        </LinearGradient>

        <Text style={styles.sec}>Programme School</Text><Text style={{color:Palette.textDim,lineHeight:22}}>Le solde ci-dessus correspond aux crédits enregistrés sur ton compte School. Les conditions et récompenses du programme seront publiées après validation par l’école.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: '#14101c', paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  balance: { borderRadius: Radius.xl, padding: 18 },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  tierName: { fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  multBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  multText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14 },
  balanceNum: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1, marginTop: 2 },
  balanceUnit: { fontSize: 18, fontWeight: '700' },
  track: { height: 8, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden', marginTop: 14 },
  fill: { height: '100%', borderRadius: 100, backgroundColor: '#fff' },
  toNext: { fontSize: 12, fontWeight: '700', color: '#fff', marginTop: 8 },
  shared: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 8, fontWeight: '600' },

  tiers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Space.lg },
  tierPill: { alignItems: 'center', gap: 5, flex: 1 },
  tierDot: { width: 12, height: 12, borderRadius: 6 },
  tierLabel: { fontSize: 10, fontWeight: '700', color: Palette.textMute, textAlign: 'center' },

  sec: { ...Type.h2, color: Palette.text, marginTop: Space.xl, marginBottom: Space.sm },
  ben: { flexDirection: 'row', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 13 },
  benDot: { width: 11, height: 11, borderRadius: 6, marginTop: 3 },
  benHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  benName: { fontSize: 14, fontWeight: '800', color: Palette.text },
  benMult: { fontSize: 12, fontWeight: '800' },
  benPerks: { fontSize: 12.5, fontWeight: '600', color: Palette.textDim, lineHeight: 18, marginTop: 3 },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 13 },
  earnIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: Palette.coreTint, alignItems: 'center', justifyContent: 'center' },
  earnLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Palette.text },
  earnPts: { fontSize: 15, fontWeight: '800', color: Palette.core },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  reward: { width: '47.5%', backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: 'hidden' },
  rewardThumb: { height: 90, position: 'relative' },
  soon: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(20,16,25,0.55)', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  soonText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  rewardInfo: { padding: 11 },
  rewardLabel: { fontSize: 13, fontWeight: '800', color: Palette.text, letterSpacing: -0.2 },
  rewardCost: { fontSize: 13, fontWeight: '800', color: Palette.core, marginTop: 3 },
});
