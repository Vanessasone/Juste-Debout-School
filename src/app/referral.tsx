/**
 * PARRAINAGE — invite un ami, gagne des récompenses.
 * (L'application de la récompense — frais/cours offert — se branchera sur le
 *  paiement Stripe en Phase B ; ici : code, partage, explications, suivi.)
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Coin } from '@/components/Coin';
import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { tap } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { getMyReferralCode, getReferralCount } from '@/lib/referrals';

/** Bonus immédiat selon la carte achetée par le filleul. */
const CARDBONUS = [
  { label: 'ref.pc10', value: 'ref.pc10v', icon: 'ticket' as const },
  { label: 'ref.pc20', value: 'ref.pc20v', icon: 'albums' as const },
  { label: 'ref.pc50', value: 'ref.pc50v', icon: 'star' as const },
];

/** Échelle de récompenses de parrainage (cumul d'amis parrainés). */
const MILESTONES = [
  { n: 5, key: 'ref.m5', icon: 'shirt' as const, g: ['#FF6A16', '#FF9346'] as const },
  { n: 10, key: 'ref.m10', icon: 'flame' as const, g: ['#FF2E7E', '#7a1440'] as const },
  { n: 15, key: 'ref.m15', icon: 'card' as const, g: ['#7C3AED', '#3a1f6b'] as const },
];

export default function Referral() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState('…');
  const [friends, setFriends] = useState(0);

  useEffect(() => {
    getMyReferralCode().then(setCode).catch(() => {});
    getReferralCount().then(setFriends).catch(() => {});
  }, []);

  const share = async () => {
    tap();
    try {
      await Share.share({ message: t('ref.shareMsg', { code }) });
    } catch {}
  };

  const STEPS = [t('ref.step1'), t('ref.step2'), t('ref.step3')];

  const unlocked = MILESTONES.filter((m) => friends >= m.n).length;
  const nextMs = MILESTONES.find((m) => friends < m.n);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('ref.title')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        {/* Hero offre */}
        <LinearGradient colors={['#FF6A16', '#FF2E7E'] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Ionicons name="gift" size={26} color="#fff" />
          <Text style={styles.heroTitle}>{t('ref.heroTitle')}</Text>
          <Text style={styles.heroText}>{t('ref.heroText')}</Text>
        </LinearGradient>

        {/* Code */}
        <Text style={styles.label}>{t('ref.yourCode')}</Text>
        <Pressable style={styles.codeBox} onPress={share}>
          <Text style={styles.code}>{code}</Text>
          <View style={styles.codeShare}>
            <Ionicons name="share-social" size={18} color={Palette.core} />
          </View>
        </Pressable>

        {/* Bonus coins au téléchargement */}
        <View style={styles.coinsNote}>
          <Coin size={26} />
          <Text style={styles.coinsNoteText}>{t('ref.coinsNote')}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: Palette.industry }]}>{friends}</Text>
            <Text style={styles.statLabel}>{t('ref.friends')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: Palette.pink }]}>{unlocked}</Text>
            <Text style={styles.statLabel}>{t('ref.rewards')}</Text>
          </View>
        </View>

        {/* Bonus immédiat selon la carte du filleul */}
        <Text style={styles.label}>{t('ref.perCard')}</Text>
        <View style={{ gap: 8 }}>
          {CARDBONUS.map((c) => (
            <View key={c.label} style={styles.pc}>
              <View style={styles.pcIcon}><Ionicons name={c.icon} size={16} color={Palette.core} /></View>
              <Text style={styles.pcLabel}>{t(c.label)}</Text>
              <Text style={styles.pcValue}>{t(c.value)}</Text>
            </View>
          ))}
        </View>

        {/* Paliers de parrainage (cumul) */}
        <Text style={styles.label}>{t('ref.milestones')}</Text>
        {nextMs && (
          <Text style={styles.nextHint}>
            {t('ref.friendsCount', { n: friends })} · {t('ref.need', { n: nextMs.n - friends })} → {t(nextMs.key)}
          </Text>
        )}
        <View style={{ gap: 10 }}>
          {MILESTONES.map((m) => {
            const done = friends >= m.n;
            return (
              <View key={m.n} style={[styles.ms, done && styles.msOn]}>
                <LinearGradient colors={m.g} style={[styles.msIcon, !done && styles.msIconOff]}>
                  <Ionicons name={done ? m.icon : 'lock-closed'} size={17} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.msReward}>{t(m.key)}</Text>
                  <Text style={styles.msNeed}>{t('ref.need', { n: m.n })}</Text>
                </View>
                {done
                  ? <Text style={styles.msDone}>{t('ref.unlocked')}</Text>
                  : <Ionicons name="chevron-forward" size={16} color={Palette.textMute} />}
              </View>
            );
          })}
        </View>

        {/* Comment ça marche */}
        <Text style={styles.label}>{t('ref.how')}</Text>
        <View style={{ gap: 10 }}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>

        <GradientBtn label={t('ref.share')} colors={['#FF6A16', '#FF2E7E']} onPress={share} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: '#14101c', paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  hero: { borderRadius: Radius.xl, padding: 20, alignItems: 'flex-start' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: -0.4, marginTop: 10 },
  heroText: { fontSize: 14, color: 'rgba(255,255,255,0.92)', lineHeight: 20, marginTop: 8 },
  label: { ...Type.label, color: Palette.textMute, marginTop: Space.xl, marginBottom: Space.sm },
  codeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Palette.core, borderStyle: 'dashed', paddingLeft: 18, paddingRight: 8, paddingVertical: 8 },
  code: { fontSize: 22, fontWeight: '800', color: Palette.text, letterSpacing: 1 },
  codeShare: { width: 40, height: 40, borderRadius: 12, backgroundColor: Palette.coreTint, alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: Space.lg },
  stat: { flex: 1, backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: Radius.lg, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '700', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  nextHint: { fontSize: 12.5, fontWeight: '700', color: Palette.textDim, marginTop: -2, marginBottom: Space.sm },
  ms: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: Radius.lg, padding: 12 },
  msOn: { borderColor: '#3E9E59' },
  msIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  msIconOff: { opacity: 0.45 },
  msReward: { fontSize: 14.5, fontWeight: '800', color: Palette.text, letterSpacing: -0.2 },
  msNeed: { fontSize: 12, fontWeight: '600', color: Palette.textMute, marginTop: 1 },
  msDone: { fontSize: 12, fontWeight: '800', color: '#3E9E59' },
  pc: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: Radius.lg, padding: 13 },
  pcIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: Palette.coreTint, alignItems: 'center', justifyContent: 'center' },
  pcLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Palette.text },
  pcValue: { fontSize: 13, fontWeight: '800', color: Palette.core, textAlign: 'right', maxWidth: '46%' },
  coinsNote: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#14101c', borderRadius: Radius.lg, padding: 13, marginTop: Space.md },
  coinsNoteText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 18 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: Radius.lg, padding: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Palette.text, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: Palette.surface, fontWeight: '800', fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, fontWeight: '600', color: Palette.text, lineHeight: 19 },
});
