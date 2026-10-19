/**
 * LOCATION DE SALLES — tarifs par créneau, par école.
 * Industry : 24h/24 + salles combinables (surtout week-end / nuit).
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { accentFor, CampusCode, Palette, Radius, Space, Type } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { euros, getRentalRates, RentalRate } from '@/lib/rentals';

const INK = '#1B1917';
const CAMPUSES: CampusCode[] = ['CORE', 'INDUSTRY'];

export default function Rentals() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [school, setSchool] = useState<CampusCode>('CORE');
  const [rates, setRates] = useState<RentalRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const accent = accentFor(school);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getRentalRates(school).then((r) => alive && setRates(r.filter(room=>!room.combo))).catch(()=>{if(alive){setRates([]);setMsg('Tarifs temporairement indisponibles. Contacte contact@juste-debout.com pour un devis.');}}).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [school]);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <View style={styles.hdrTop}>
          <Pressable onPress={() => goBack(router)} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.title}>{t('rent.title')}</Text>
          <Wavetruv size={22} tint="#fff" />
        </View>
        <View style={styles.seg}>
          {CAMPUSES.map((c) => {
            const on = school === c;
            return (
              <Pressable key={c} onPress={() => setSchool(c)} style={[styles.segItem, on && { backgroundColor: accentFor(c) }]}>
                <Text style={[styles.segText, on && { color: '#fff' }]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        <Text style={styles.empty}>Location sur demande et sous réserve de disponibilité. Tarifs à reconfirmer avec le devis. Pour combiner plusieurs salles, contacte l’équipe.</Text>
        {msg && (
          <View style={[styles.msgBanner, { borderLeftColor: accent }]}>
            <Text style={styles.msgText}>{msg}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={accent} style={{ marginTop: Space.xxl }} />
        ) : rates.length === 0 ? (
          <Text style={styles.empty}>{t('rent.empty')}</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {rates.map((r) => (
              <View key={r.id} style={[styles.card, r.combo && { borderColor: accent }]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomName}>{r.label}</Text>
                    {r.areaM2 ? <Text style={styles.roomArea}>{r.areaM2} m²</Text> : null}
                  </View>
                  {r.combo ? (
                    <View style={[styles.comboTag, { backgroundColor: accent }]}>
                      <Text style={styles.comboText}>{t('rent.combo')}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.prices}>
                  {r.prices.map((p) => (
                    <View key={p.slot} style={styles.priceRow}>
                      <Text style={styles.slot}>{p.slot}</Text>
                      <Text style={[styles.price, { color: accent }]}>{euros(p.priceCents)}<Text style={styles.perHour}> {t('rent.perHour')}</Text></Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  style={[styles.reserve, { backgroundColor: accent }]}
                  onPress={async () => {try {await Linking.openURL('mailto:contact@juste-debout.com?subject='+encodeURIComponent(`Location ${school} · ${r.label}`)+'&body='+encodeURIComponent('Bonjour, je souhaite un devis.\nDate :\nHoraires :\nUsage :\nNombre de personnes :'));setMsg('Ta demande doit être envoyée depuis ta messagerie.');}catch{setMsg('Écris à contact@juste-debout.com en précisant la salle, la date et les horaires.');}}}>
                  <Ionicons name="calendar" size={15} color="#fff" />
                  <Text style={styles.reserveText}>Demander un devis</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md },
  hdrTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  seg: { flexDirection: 'row', gap: 4, backgroundColor: '#2A2621', borderRadius: Radius.pill, padding: 4, marginTop: 14 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.pill },
  segText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: '#8F867A' },

  badge247: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: Radius.lg, padding: 16, marginBottom: Space.md },
  badge247Left: { alignItems: 'center' },
  badge247Big: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -1, lineHeight: 30 },
  badge247Small: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.6, marginTop: 2 },
  badge247Note: { flex: 1, fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.92)', fontWeight: '600' },
  msgBanner: { backgroundColor: Palette.surface2, borderLeftWidth: 3, borderRadius: Radius.sm, padding: 12, marginBottom: Space.md },
  msgText: { ...Type.small, color: Palette.textDim },
  empty: { ...Type.body, color: Palette.textMute, marginTop: Space.xl, textAlign: 'center' },
  reserve: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, borderRadius: Radius.md, paddingVertical: 12 },
  reserveText: { fontSize: 13, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },

  card: { backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Palette.border, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  roomName: { fontSize: 17, fontWeight: '800', color: Palette.text, textTransform: 'uppercase', letterSpacing: -0.2 },
  roomArea: { fontSize: 13, fontWeight: '700', color: Palette.textDim, marginTop: 1 },
  comboTag: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  comboText: { fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  prices: { gap: 8, borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  slot: { ...Type.small, color: Palette.textDim, flex: 1 },
  price: { fontSize: 16, fontWeight: '800' },
  perHour: { fontSize: 11, fontWeight: '600', color: Palette.textMute },
});
