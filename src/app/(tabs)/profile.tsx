/**
 * Écran PROFIL — identité (partagée avec l'app événement), progression par
 * style, carte, accès classements, langue FR/EN, déconnexion.
 * Données d'exemple en mode démo.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Coin } from '@/components/Coin';
import { Wavetruv } from '@/components/Logo';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';
import { getMyProfile, isAdmin, Profile } from '@/lib/profile';

const INK = '#1B1917';

const STYLES_PRACTICED = ['House', 'Popping', 'Waacking', 'Hip-Hop'];
const PROGRESS = [
  { style: 'House', n: 18, pct: 90 },
  { style: 'Popping', n: 12, pct: 62 },
  { style: 'Waacking', n: 9, pct: 46 },
  { style: 'Hip-Hop', n: 8, pct: 40 },
];
const HISTORY = [
  { style: 'House', when: 'Mar. 9 · Soulz' },
  { style: 'Popping', when: 'Lun. 8 · Nelson' },
  { style: 'Waacking', when: 'Sam. 6 · Malika' },
];

const BAR_COLORS = [Palette.core, Palette.industry, Palette.pink, Palette.success];

function Stat({ n, label, color }: { n: string; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statNum, { color }]}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale } = useI18n();
  const { accent } = useCampus();
  const { configured, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  // Recharge le profil partagé à chaque fois qu'on revient sur l'onglet.
  useFocusEffect(
    useCallback(() => {
      getMyProfile().then(setProfile).catch(() => {});
    }, []),
  );

  const displayName = profile?.alias || profile?.full_name || 'Naïma';
  const subParts = profile
    ? [profile.instagram ? `@${profile.instagram}` : null, profile.city].filter(Boolean)
    : ['@naima.dance', 'Paris'];
  const sub = subParts.join(' · ') || '—';
  const chips = profile?.styles?.length ? profile.styles : STYLES_PRACTICED;
  // Espace staff visible en démo (preview) ou si admin/staff en réel.
  const canStaff = !configured || isAdmin(profile) || !!profile?.roles?.includes('staff');

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Space.xxxl }}>
        {/* En-tête identité */}
        <View style={[styles.hdr, { paddingTop: insets.top + Space.md }]}>
          <View style={{ alignItems: 'flex-end', marginBottom: 6 }}>
            <Wavetruv size={20} tint="#fff" />
          </View>
          <View style={styles.idRow}>
            {profile?.photo_url ? (
              <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#FF6A16', '#FF2E7E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
              </LinearGradient>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.sub}>{sub}</Text>
            </View>
            <Pressable style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
              <Ionicons name="pencil" size={13} color="#fff" />
              <Text style={styles.editText}>{t('profile.edit')}</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {chips.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {/* Stats */}
          <View style={styles.statRow}>
            <Stat n="12" label={t('profile.statStreak')} color={Palette.core} />
            <Stat n="47" label={t('profile.statClasses')} color={Palette.industry} />
            <Stat n="6" label={t('profile.statStyles')} color={Palette.pink} />
          </View>

          {/* Progression */}
          <Text style={styles.secTitle}>{t('profile.progression')}</Text>
          <View style={styles.card}>
            {PROGRESS.map((p, i) => (
              <View key={p.style} style={styles.barRow}>
                <View style={styles.barLabel}>
                  <Text style={styles.barStyle}>{p.style}</Text>
                  <Text style={styles.barN}>{p.n}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${p.pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
                </View>
              </View>
            ))}
          </View>

          {/* Ma carte */}
          <Text style={styles.secTitle}>{t('profile.myCard')}</Text>
          <Pressable onPress={() => router.push('/wallet')}>
            <LinearGradient colors={['#2F40E6', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>Carte 20 cours · CORE</Text>
                <Text style={styles.cardLeft}>{t('profile.cardLeft', { n: 12 })} · 04/2027</Text>
              </View>
              <View style={styles.manage}>
                <Text style={styles.manageText}>{t('profile.manageCard')}</Text>
                <Ionicons name="chevron-forward" size={14} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Mes favoris */}
          <Pressable style={styles.linkRow} onPress={() => router.push('/favorites')}>
            <Ionicons name="heart" size={18} color={Palette.pink} />
            <Text style={[styles.linkTitle, { flex: 1 }]}>{t('profile.favorites')}</Text>
            <Ionicons name="chevron-forward" size={14} color={Palette.textMute} />
          </Pressable>

          {/* JD Coins */}
          <Pressable style={styles.linkRow} onPress={() => router.push('/points')}>
            <Coin size={20} />
            <Text style={[styles.linkTitle, { flex: 1 }]}>{t('profile.points')}</Text>
            <Ionicons name="chevron-forward" size={14} color={Palette.textMute} />
          </Pressable>

          {/* Mes enfants */}
          <Pressable style={styles.linkRow} onPress={() => router.push('/children')}>
            <Ionicons name="people" size={18} color={Palette.industry} />
            <Text style={[styles.linkTitle, { flex: 1 }]}>{t('profile.children')}</Text>
            <Ionicons name="chevron-forward" size={14} color={Palette.textMute} />
          </Pressable>

          {/* Parrainage */}
          <Pressable style={styles.linkRow} onPress={() => router.push('/referral')}>
            <Ionicons name="gift" size={18} color={Palette.core} />
            <Text style={[styles.linkTitle, { flex: 1 }]}>{t('profile.referral')}</Text>
            <Ionicons name="chevron-forward" size={14} color={Palette.textMute} />
          </Pressable>

          {/* Classements (ranking) */}
          <Pressable style={styles.linkRow} onPress={() => router.push('/rankings')}>
            <Ionicons name="trophy" size={18} color={Palette.industry} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>{t('profile.rankings')}</Text>
              <Text style={styles.linkSub}>{t('profile.rankingsSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Palette.textMute} />
          </Pressable>

          {/* Espace staff (back-office) — réservé admin/staff */}
          {canStaff && (
            <Pressable style={styles.linkRow} onPress={() => router.push('/admin')}>
              <Ionicons name="construct" size={18} color={Palette.pink} />
              <Text style={[styles.linkTitle, { flex: 1 }]}>{t('admin.staffOnly')}</Text>
              <Ionicons name="chevron-forward" size={14} color={Palette.textMute} />
            </Pressable>
          )}

          {/* Historique */}
          <Text style={styles.secTitle}>{t('profile.history')}</Text>
          <View style={styles.card}>
            {HISTORY.map((h, i) => (
              <View key={i} style={[styles.histRow, i > 0 && styles.histBorder]}>
                <Ionicons name="checkmark-circle" size={18} color={Palette.success} />
                <Text style={styles.histStyle}>{h.style}</Text>
                <Text style={styles.histWhen}>{h.when}</Text>
              </View>
            ))}
          </View>

          {/* Réglages */}
          <View style={styles.langHeaderRow}>
            <Text style={styles.langTitle}>{t('profile.language')}</Text>
            <View style={styles.langSeg}>
              {(['fr', 'en'] as const).map((l) => {
                const on = locale === l;
                return (
                  <Pressable key={l} onPress={() => setLocale(l)} style={[styles.langSegItem, on && { backgroundColor: Palette.text }]}>
                    <Text style={[styles.langSegText, on && { color: Palette.surface }]}>{l.toUpperCase()}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {configured && (
            <Pressable style={styles.linkRow} onPress={signOut}>
              <Ionicons name="log-out-outline" size={18} color={Palette.danger} />
              <Text style={[styles.linkTitle, { flex: 1, color: Palette.danger }]}>
                {t('profile.signOut')}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.lg },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: '#fff' },
  sub: { fontSize: 12, color: '#B7AE9E', marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2A2621',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  chip: { backgroundColor: '#2A2621', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: '#D8CFBE', fontSize: 11, fontWeight: '700' },

  body: { padding: Space.lg },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    alignItems: 'center',
  },
  statNum: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center', marginTop: 4, lineHeight: 12 },

  secTitle: { ...Type.h2, color: Palette.text, marginTop: Space.xl, marginBottom: Space.sm },
  card: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 12,
  },
  barRow: { gap: 6 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  barStyle: { fontSize: 13, fontWeight: '700', color: Palette.text },
  barN: { fontSize: 13, fontWeight: '800', color: Palette.textDim },
  track: { height: 8, borderRadius: 100, backgroundColor: Palette.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 100 },

  cardRow: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, padding: 16 },
  cardName: { fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: -0.2 },
  cardLeft: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
  manage: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  manageText: { fontSize: 12, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 10,
  },
  linkTitle: { fontSize: 14, fontWeight: '700', color: Palette.text },
  linkSub: { fontSize: 12, color: Palette.textMute, marginTop: 1 },
  soon: { backgroundColor: Palette.surface2, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  soonText: { fontSize: 10, fontWeight: '800', color: Palette.textMute, textTransform: 'uppercase', letterSpacing: 0.4 },

  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  histBorder: { borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: 12, marginTop: 0 },
  histStyle: { flex: 1, fontSize: 14, fontWeight: '700', color: Palette.text },
  histWhen: { fontSize: 12, color: Palette.textMute },

  langHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Space.xl, marginBottom: Space.sm },
  langTitle: { ...Type.h2, color: Palette.text },
  langSeg: { flexDirection: 'row', backgroundColor: Palette.surface2, borderRadius: Radius.pill, padding: 3 },
  langSegItem: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.pill },
  langSegText: { fontSize: 13, fontWeight: '800', color: Palette.textDim, letterSpacing: 0.5 },
});
