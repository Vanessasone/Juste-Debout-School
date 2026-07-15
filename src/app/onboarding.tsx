/**
 * ONBOARDING — bienvenue, langue, école, styles. Affiché au 1er lancement.
 * Style immersif sombre (Kinetic), couleur par campus (CORE orange / INDUSTRY
 * bleu). À la fin : mémorise les choix + entre dans l'app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv, Wordmark } from '@/components/Logo';
import { FadeInView, GradientBtn } from '@/components/ui';
import { accentFor, CampusCode, gradientFor, Radius, Space } from '@/constants/brand';
import { CampusFilter, useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';
import { useOnboarding } from '@/lib/onboarding';

const INK = '#14101c';
const BRAND_G = ['#FF6A16', '#FF2E7E'] as const;
const STYLES = ['House', 'Popping', 'Locking', 'Hip-Hop', 'Waacking', 'Bboying', 'Dancehall', 'Krump', 'Amapiano', 'Voguing'];
const CAMPUSES: { key: CampusFilter; name: string; sub: string; code: CampusCode | 'ALL' }[] = [
  { key: 'CORE', name: 'CORE', sub: '3 rue de l’Est · Paris 20e', code: 'CORE' },
  { key: 'INDUSTRY', name: 'INDUSTRY', sub: '27 Bd de la Somme · Paris 17e', code: 'INDUSTRY' },
  { key: 'ALL', name: 'Les deux écoles', sub: 'CORE + INDUSTRY', code: 'ALL' },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { setCampus } = useCampus();
  const { complete } = useOnboarding();

  const [step, setStep] = useState(0);
  const [campus, setCampusChoice] = useState<CampusFilter>('CORE');
  const [styles_, setStyles] = useState<string[]>([]);
  const accent = accentFor(campus);
  const nextG = step === 0 || campus === 'ALL' ? BRAND_G : gradientFor(campus);

  const toggleStyle = (s: string) =>
    setStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const finish = () => {
    setCampus(campus);
    AsyncStorage.setItem('jds_styles', JSON.stringify(styles_));
    complete();
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <LinearGradient colors={['rgba(47,64,230,0.38)', 'transparent'] as const} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.glow} pointerEvents="none" />
      <LinearGradient colors={['rgba(255,106,22,0.3)', 'transparent'] as const} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.9 }} style={styles.glow} pointerEvents="none" />

      <View style={[styles.top, { paddingTop: insets.top + Space.md }]}>
        <View style={styles.logoRow}>
          <View style={styles.badge}><Wavetruv size={40} tint="#fff" /></View>
          <Wordmark width={150} tint="#fff" />
        </View>
        <View style={styles.progress}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i <= step ? accent : 'rgba(255,255,255,0.15)' }]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>{t('onb.step', { a: step + 1, b: 3 })}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <FadeInView key={step}>
          {step === 0 && (
            <>
              <Text style={styles.title}>{t('onb.welcomeTitle')}</Text>
              <Text style={styles.sub}>{t('onb.welcomeSub')}</Text>
              <Text style={styles.section}>{t('onb.language')}</Text>
              <View style={styles.langRow}>
                {(['fr', 'en'] as const).map((l) => {
                  const on = locale === l;
                  return (
                    <Pressable key={l} onPress={() => setLocale(l)} style={styles.langBtn}>
                      {on && <LinearGradient colors={BRAND_G} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
                      <Text style={[styles.langText, on && { color: '#fff' }]}>{l === 'fr' ? 'Français' : 'English'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.title}>{t('onb.campusTitle')}</Text>
              <Text style={styles.sub}>{t('onb.campusSub')}</Text>
              <View style={{ gap: 12, marginTop: Space.lg }}>
                {CAMPUSES.map((c) => {
                  const on = campus === c.key;
                  const ac = accentFor(c.code);
                  return (
                    <Pressable key={c.key} onPress={() => setCampusChoice(c.key)} style={[styles.campusCard, on && { borderColor: ac, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                      <View style={[styles.campusDot, { backgroundColor: ac }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.campusName}>{c.name}</Text>
                        <Text style={styles.campusSub}>{c.key === 'ALL' ? t('campus.allSub') : c.sub}</Text>
                      </View>
                      {on && <Ionicons name="checkmark-circle" size={24} color={ac} />}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.title}>{t('onb.stylesTitle')}</Text>
              <Text style={styles.sub}>{t('onb.stylesSub')}</Text>
              <View style={styles.chips}>
                {STYLES.map((s) => {
                  const on = styles_.includes(s);
                  return (
                    <Pressable key={s} onPress={() => toggleStyle(s)} style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}>
                      <Text style={[styles.chipText, on && { color: '#fff' }]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </FadeInView>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Space.lg }]}>
        {step > 0 ? (
          <Pressable style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backText}>{t('onb.back')}</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <GradientBtn style={styles.nextBtn} colors={nextG} label={step < 2 ? t('onb.next') : t('onb.start')} onPress={() => (step < 2 ? setStep(step + 1) : finish())} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  top: { paddingHorizontal: Space.lg, paddingBottom: Space.md },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  badge: { width: 62, height: 62, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 5, borderRadius: 3 },
  stepLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 },

  body: { padding: Space.lg, paddingTop: Space.md, flexGrow: 1 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: '#fff', lineHeight: 34, textTransform: 'uppercase' },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.66)', marginTop: Space.sm, lineHeight: 21 },
  section: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginTop: Space.xxl, marginBottom: Space.sm },

  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', overflow: 'hidden' },
  langText: { fontSize: 15, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },

  campusCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16 },
  campusDot: { width: 14, height: 14, borderRadius: 7 },
  campusName: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: -0.2 },
  campusSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: Space.lg },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  chipText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Space.lg, paddingTop: Space.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  backBtn: { paddingHorizontal: 18, paddingVertical: 16 },
  backText: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.4 },
  nextBtn: { flex: 1 },
});
