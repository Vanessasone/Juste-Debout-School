/**
 * MES RÉSERVATIONS — chaque cours réservé avec SON QR à scanner à l'entrée.
 * Le QR porte l'id de réservation → le cours précis est identifié (utile quand
 * plusieurs cours ont lieu en même temps).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { QR } from '@/components/QR';
import { accentFor, Palette, Radius, Space, tintFor, Type } from '@/constants/brand';
import { getMyBookings, type Booking } from '@/lib/bookings';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { LEVEL_LABEL } from '@/lib/schools';

const DOW = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dayLabel = (d: Date) => (d.toDateString() === new Date().toDateString() ? 'Auj.' : `${DOW[d.getDay()]} ${d.getDate()}`);

export default function Reservations() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [error,setError]=useState(false);
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => { getMyBookings().then(setBookings).catch(() => {setError(true);setBookings([]);}); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
        <Text style={styles.title}>{t('resv.title')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        {bookings === null ? (
          <ActivityIndicator color={Palette.core} style={{ marginTop: Space.xl }} />
        ) : bookings.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={34} color={Palette.textMute} />
            <Text style={styles.emptyText}>{error?'Impossible de charger les réservations. Réessaie plus tard.':t('resv.empty')}</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {bookings.map(({ id, session: s }) => {
              const ac = accentFor(s.schoolCode);
              return (
                <View key={id} style={styles.card}>
                  <View style={styles.row}>
                    <View style={[styles.tag, { backgroundColor: tintFor(s.schoolCode) }]}>
                      <Text style={[styles.tagTxt, { color: ac }]}>{s.schoolCode}</Text>
                    </View>
                    <Text style={styles.when}>{dayLabel(s.startsAt)} · {hhmm(s.startsAt)}</Text>
                  </View>
                  <Text style={styles.style}>{s.style}</Text>
                  <Text style={styles.meta}>{[s.teacherName, s.studioName, LEVEL_LABEL[s.level] ?? s.level].filter(Boolean).join(' · ')}</Text>
                  <View style={styles.qrWrap}>
                    <QR value={`JDS-BK-${id}`} size={150} />
                  </View>
                  <Text style={styles.hint}>{t('resv.scanHint')}</Text>
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
  hdr: { backgroundColor: '#14101c', paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: Space.xxxl },
  emptyText: { ...Type.body, color: Palette.textMute, textAlign: 'center', maxWidth: 280 },
  card: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.xl, padding: Space.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  when: { fontSize: 13, fontWeight: '700', color: Palette.textDim },
  style: { fontSize: 20, fontWeight: '800', color: Palette.text, marginTop: 10 },
  meta: { fontSize: 13, fontWeight: '600', color: Palette.textDim, marginTop: 3 },
  qrWrap: { alignItems: 'center', marginTop: Space.lg },
  hint: { fontSize: 12.5, fontWeight: '600', color: Palette.textMute, textAlign: 'center', marginTop: 12 },
});
