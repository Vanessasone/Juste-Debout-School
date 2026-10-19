/**
 * DÉTAIL ENFANT — résumé, carte kids, prochains cours (réservables) et présence.
 * La réservation « pour l'enfant » se branchera sur le paiement + la carte kids
 * en Phase B ; ici feedback local (démo).
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { accentFor, gradientFor, Palette, Radius, Space, Type } from '@/constants/brand';
import { bookChildSession, childAge, getChild, getChildBookings, type Child } from '@/lib/children';
import { tap } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { getUpcomingSessions, LEVEL_LABEL, type Session } from '@/lib/schools';
import { isSupabaseConfigured } from '@/lib/supabase';

const DOW = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dayLabel = (d: Date, today: string) =>
  d.toDateString() === new Date().toDateString() ? today : `${DOW[d.getDay()]} ${d.getDate()}`;

export default function ChildDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [sessionsError,setSessionsError]=useState(false);
  const [bookingMessage,setBookingMessage]=useState<string|null>(null);

  useEffect(() => {
    let active=true;
    setLoading(true);setChild(null);setSessions([]);setSessionsError(false);setBookingMessage(null);setBooked(new Set());
    getChild(String(id)).then(async c=>{
      if(!active)return;
      setChild(c);
      if(c){const rows=await getUpcomingSessions(c.schoolCode,5);if(active)setSessions(rows);}
    }).catch(()=>{if(active)setSessionsError(true)}).finally(()=>{if(active)setLoading(false)});
    getChildBookings(String(id)).then(ids=>{if(active)setBooked(new Set(ids))}).catch(()=>{});
    return()=>{active=false};
  }, [id]);

  const book = async (lesson: Session) => {
    if (isSupabaseConfigured) {
      setBookingMessage(t(lesson.kind==='open'||lesson.kind==='kids'?'planning.openInfo':'planning.contactInfo'));
      return;
    }
    if (booked.has(lesson.id)) return;
    tap();
    try {
      await bookChildSession(String(id), lesson.id);
      setBooked(prev=>new Set(prev).add(lesson.id));
    } catch { setBookingMessage(t('planning.bookingError')); }
  };

  const accent = child ? accentFor(child.schoolCode) : Palette.core;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.bg }}>
        <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
          <Pressable onPress={() => goBack(router)} hitSlop={10}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
          <Text style={styles.title}> </Text>
          <Wavetruv size={22} tint="#fff" />
        </View>
        <ActivityIndicator color={Palette.core} style={{ marginTop: Space.xxxl }} />
      </View>
    );
  }

  if (!child) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.bg }}>
        <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
          <Pressable onPress={() => goBack(router)} hitSlop={10}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
          <Text style={styles.title}>{t('kids.title')}</Text>
          <Wavetruv size={22} tint="#fff" />
        </View>
        <Text style={{ ...Type.body, color: Palette.textMute, textAlign: 'center', marginTop: Space.xxxl }}>—</Text>
      </View>
    );
  }

  const age = childAge(child);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
        <Text style={styles.title}>{child.firstName}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        {/* En-tête enfant */}
        <LinearGradient colors={gradientFor(child.schoolCode)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.head}>
          <View style={styles.headAvatar}><Text style={styles.headInit}>{child.firstName.charAt(0)}</Text></View>
          <Text style={styles.headName}>{child.firstName}</Text>
          <Text style={styles.headMeta}>
            {[age != null ? t('kids.age', { n: age }) : null, child.level, child.schoolCode].filter(Boolean).join(' · ')}
          </Text>
          {child.styles.length > 0 && <Text style={styles.headStyles}>{child.styles.join(' · ')}</Text>}
        </LinearGradient>

        {/* Suivi */}
        <View style={styles.suivi}>
          <View style={styles.metric}><Text style={[styles.metricNum, { color: Palette.industry }]}>{child.attendance}</Text><Text style={styles.metricLbl}>{t('kids.attendance')}</Text></View>
          <View style={styles.metric}><Text style={[styles.metricNum, { color: Palette.core }]}>{child.streak}</Text><Text style={styles.metricLbl}>{t('kids.streak')}</Text></View>
          <View style={styles.metric}><Text style={[styles.metricNum, { color: Palette.pink }]}>{child.cardLeft ?? '—'}</Text><Text style={styles.metricLbl}>{t('kids.cardShort')}</Text></View>
        </View>

        {/* Prochains cours */}
        <Text style={styles.sec}>{t('kids.upcoming')}</Text>
        {sessionsError && <Text accessibilityRole="alert" style={styles.none}>{t('planning.loadError')}</Text>}
        {bookingMessage && <Text accessibilityRole="alert" style={styles.none}>{bookingMessage}</Text>}
        {!sessionsError && sessions.length === 0 ? (
          <Text style={styles.none}>{t('kids.none')}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {sessions.map((s) => {
              const on = booked.has(s.id);
              return (
                <View key={s.id} style={styles.cls}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clsStyle}>{s.style}</Text>
                    <Text style={styles.clsMeta}>{dayLabel(s.startsAt, t('home.today'))} · {hhmm(s.startsAt)} · {LEVEL_LABEL[s.level] ?? s.level}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button" onPress={() => book(s)}
                    style={[styles.bookBtn, on ? { backgroundColor: Palette.success } : { borderColor: accent, borderWidth: 1.5 }]}
                  >
                    <Text style={[styles.bookTxt, { color: on ? '#fff' : accent }]}>{isSupabaseConfigured ? t('planning.info') : on ? t('kids.booked') : t('kids.book')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
        {!isSupabaseConfigured && <Text style={styles.demo}>{t('kids.demoNote')}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: '#14101c', paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  head: { borderRadius: Radius.xl, padding: 20, alignItems: 'center' },
  headAvatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  headInit: { color: '#fff', fontSize: 28, fontWeight: '800' },
  headName: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 10 },
  headMeta: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.92)', marginTop: 4 },
  headStyles: { fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.82)', marginTop: 6 },
  suivi: { flexDirection: 'row', gap: 10, marginTop: Space.lg },
  metric: { flex: 1, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.lg, padding: 14, alignItems: 'center' },
  metricNum: { fontSize: 24, fontWeight: '800' },
  metricLbl: { fontSize: 10.5, fontWeight: '700', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 4, textAlign: 'center' },
  sec: { ...Type.h2, color: Palette.text, marginTop: Space.xl, marginBottom: Space.sm },
  none: { ...Type.body, color: Palette.textMute },
  cls: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.lg, padding: 14 },
  clsStyle: { fontSize: 15, fontWeight: '800', color: Palette.text },
  clsMeta: { fontSize: 12.5, fontWeight: '600', color: Palette.textDim, marginTop: 2 },
  bookBtn: { borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  bookTxt: { fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  demo: { ...Type.small, color: Palette.textMute, marginTop: Space.lg, fontStyle: 'italic' },
});
