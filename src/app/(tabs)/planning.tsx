/**
 * Écran PLANNING — style Kinetic : barre sombre (école + dates) + contenu clair,
 * boutons de réservation en dégradé. Feedback inline (pas de pop-up).
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoreOpenCatalogue } from '@/components/CoreOpenCatalogue';
import { Wavetruv } from '@/components/Logo';
import { FavHeart } from '@/components/ui';
import { accentFor, CampusCode, gradientFor, Palette, Radius, Space, tintFor, Type } from '@/constants/brand';
import { useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';
import { getSessions, Session } from '@/lib/schools';
import { isSupabaseConfigured } from '@/lib/supabase';

const INK = '#14101c';
const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function nextDays(count: number): Date[] {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d;
  });
}
function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { campus, accent, setCampus } = useCampus();
  const { t } = useI18n();
  const days = useMemo(() => nextDays(7), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [nudged, setNudged] = useState(false); // nudge d'économie : 1× par visite (discret)
  const [nudge, setNudge] = useState<CampusCode | null>(null);

  const CAMPUS_TABS = [
    { key: 'CORE' as const, label: 'CORE' },
    { key: 'INDUSTRY' as const, label: 'Industry' },
    { key: 'ALL' as const, label: t('planning.all') },
  ];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getSessions(campus, days[dayIndex]).then((r) => alive && setSessions(r)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [campus, dayIndex, days]);

  const onBook = (s: Session) => {
    setMsg(s.kind==='open'||s.kind==='kids'?'Cours open sans réservation : présente-toi à l’accueil. Vérifie les éventuels changements auprès de l’équipe.':'Pour ce cours ou stage, contacte l’accueil afin de connaître les modalités d’inscription.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      {/* Barre sombre */}
      <View style={[styles.topbar, { paddingTop: insets.top + Space.sm }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>{t('planning.title')}</Text>
            <Text style={styles.brandSub}>{t('planning.subtitle')}</Text>
          </View>
          <Wavetruv size={30} tint="#fff" />
        </View>
        <View style={styles.switch}>
          {CAMPUS_TABS.map((tab) => {
            const on = campus === tab.key;
            const solid = tab.key === 'CORE' ? '#FF6A16' : tab.key === 'INDUSTRY' ? '#2F40E6' : null;
            if (on && tab.key === 'ALL') {
              return (
                <Pressable key={tab.key} onPress={() => setCampus(tab.key)} style={[styles.switchItem, styles.switchItemAll]}>
                  <LinearGradient colors={gradientFor('ALL')} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                  <Text style={[styles.switchLabel, { color: '#fff' }]}>{tab.label}</Text>
                </Pressable>
              );
            }
            return (
              <Pressable key={tab.key} onPress={() => setCampus(tab.key)}
                style={[styles.switchItem, on && { backgroundColor: solid ?? accentFor(campus) }]}>
                <Text style={[styles.switchLabel, on && { color: '#fff' }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Space.xxxl }}>
        <Pressable accessibilityRole="button" onPress={()=>router.push('/my-training')} style={{padding:18,margin:16,borderRadius:16,backgroundColor:Palette.industry}}><Text style={{color:'#fff',fontWeight:'800'}}>Mon planning de formation et mes documents →</Text></Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
          {days.map((d, i) => {
            const on = i === dayIndex;
            return (
              <Pressable key={i} onPress={() => { setDayIndex(i); setMsg(null); }}
                style={[styles.dateChip, on && { backgroundColor: accent, borderColor: accent }]}>
                <Text style={[styles.dateDow, on && { color: '#fff' }]}>{DAY_LABELS[d.getDay()]}</Text>
                <Text style={[styles.dateNum, on && { color: '#fff' }]}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {campus !== 'INDUSTRY' && <CoreOpenCatalogue day={days[dayIndex].getDay()} />}
        <Text style={[styles.meta,{marginHorizontal:Space.lg,marginBottom:12}]}>{t('coreOpen.otherSessions')}</Text>

        {msg && (
          <View style={[styles.msg, { borderLeftColor: accent }]}><Text style={styles.msgText}>{msg}</Text></View>
        )}
        {!isSupabaseConfigured && !msg && (
          <View style={styles.demo}>
            <Ionicons name="information-circle" size={16} color={Palette.textDim} />
            <Text style={styles.demoText}>{t('planning.demo')}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={accent} style={{ marginTop: Space.xxl }} />
        ) : sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={28} color={Palette.textMute} />
            <Text style={styles.emptyText}>{t('planning.empty')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sessions.map((s) => {
              const full = s.booked >= s.capacity;
              const left = Math.max(0, s.capacity - s.booked);
              const ac = accentFor(s.schoolCode);
              return (
                <View key={s.id} style={styles.card}>
                  <Text style={[styles.time, { color: ac }]}>{hhmm(s.startsAt)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.style}>{s.style}</Text>
                    <Text style={styles.meta}>{[s.teacherName, s.studioName].filter(Boolean).join(' · ')}</Text>
                    <View style={styles.tagRow}>
                      <View style={[styles.tag, { backgroundColor: tintFor(s.schoolCode) }]}>
                        <Text style={[styles.tagText, { color: ac }]}>{t(`level.${s.level}`)}</Text>
                      </View>
                      {campus === 'ALL' && <Text style={styles.campusHint}>{s.schoolCode}</Text>}
                    </View>
                  </View>
                  <FavHeart
                    fav={{ key: `class:${s.id}`, kind: 'class', label: `${s.style} · ${hhmm(s.startsAt)}`, subtitle: s.teacherName ?? undefined }}
                    size={20}
                    color={Palette.textMute}
                  />
                  <Pressable onPress={() => onBook(s)}>
                    <LinearGradient colors={gradientFor(s.schoolCode)} style={styles.book}><Text style={styles.bookText}>Infos</Text></LinearGradient>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { ...Type.display, color: '#fff' },
  brandSub: { ...Type.label, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  switch: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.pill, padding: 4, marginTop: 14 },
  switchItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.pill },
  switchItemAll: { overflow: 'hidden' },
  switchLabel: { ...Type.label, color: 'rgba(255,255,255,0.7)' },

  dateStrip: { gap: 8, paddingHorizontal: Space.lg, paddingVertical: Space.lg },
  dateChip: { width: 52, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  dateDow: { ...Type.small, color: Palette.textDim },
  dateNum: { fontSize: 17, fontWeight: '800', color: Palette.text, marginTop: 2 },

  msg: { marginHorizontal: Space.lg, marginBottom: Space.sm, backgroundColor: Palette.surface, borderLeftWidth: 3, borderRadius: Radius.sm, padding: 12 },
  msgText: { ...Type.small, color: Palette.textDim },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Space.lg, marginBottom: Space.sm, padding: 10, borderRadius: Radius.sm, backgroundColor: Palette.surface2, borderWidth: 1, borderColor: Palette.border },
  demoText: { flex: 1, ...Type.small, color: Palette.textDim },

  empty: { alignItems: 'center', gap: 10, marginTop: Space.xxxl },
  emptyText: { ...Type.body, color: Palette.textMute },

  list: { paddingHorizontal: Space.lg, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 14 },
  time: { fontSize: 15, fontWeight: '800', width: 46 },
  style: { ...Type.h2, color: Palette.text },
  meta: { ...Type.small, color: Palette.textDim, marginTop: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  campusHint: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: Palette.textMute },
  left: { ...Type.small, color: Palette.textMute },

  book: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill, alignItems: 'center' },
  bookFull: { backgroundColor: Palette.surface2 },
  bookText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: '#fff' },
  bookTextFull: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: Palette.textDim },
});
