/**
 * BORNE ACCUEIL (SCAN) — tablette à la réception. L'élève scanne SON QR :
 *  · QR de réservation → le cours est connu → présence validée directement.
 *  · carte membre → l'élève est identifié → il choisit lequel des cours
 *    simultanés il prend (essentiel pour les stats).
 * Repli : recherche manuelle par nom. Caméra réelle + attribution des JD Coins
 * / présence = Phase B ; ici, boutons « simuler un scan » pour la démo.
 */
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { accentFor, CampusCode, gradientFor, Space } from '@/constants/brand';
import { getMyBookings } from '@/lib/bookings';
import { checkIn, demoMember, getMemberById, Member, searchMembers } from '@/lib/checkin';
import { success, tap } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { getUpcomingSessions, LEVEL_LABEL, Session } from '@/lib/schools';

const INK = '#0f0b16';
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const firstName = (m: Member) => m.alias || m.name.split(' ')[0];

export default function Kiosk() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  const [school, setSchool] = useState<CampusCode>('CORE');
  const [mode, setMode] = useState<'scan' | 'search'>('scan');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [classes, setClasses] = useState<Session[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const scanLock = useRef(false);

  useEffect(() => {
    let alive = true;
    searchMembers(query).then((r) => alive && setResults(r));
    return () => { alive = false; };
  }, [query]);

  const reset = () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    scanLock.current = false;
    setDone(null); setSelected(null); setQuery(''); setResults([]); setClasses([]); setMode('scan');
  };

  // Scan caméra (native) : carte membre JDS-MB-<id> → on identifie l'élève.
  const onScan = async (data: string) => {
    if (scanLock.current || selected || done) return;
    const m = /^JDS-MB-(.+)$/.exec((data ?? '').trim());
    if (!m) return;
    scanLock.current = true;
    const who = await getMemberById(m[1]);
    if (who) { await pickMember(who); } else { scanLock.current = false; }
  };

  const pickMember = async (m: Member) => {
    tap();
    setSelected(m);
    const all = await getUpcomingSessions(school, 8).catch(() => [] as Session[]);
    const today = new Date().toDateString();
    setClasses(all.filter((s) => s.startsAt.toDateString() === today));
  };

  const confirm = async (sessionId: string | null, who: Member) => {
    success();
    await checkIn(who.id, sessionId);
    setDone(firstName(who));
    resetTimer.current = setTimeout(reset, 4200);
  };

  // Simuler le scan d'un QR de réservation → cours connu (1 seul) → l'accueil
  // vérifie la photo, puis valide. La photo s'affiche donc toujours (anti-fraude).
  const simBooking = async () => {
    const bks = await getMyBookings().catch(() => []);
    const b = bks[0];
    const who = demoMember();
    tap();
    setSelected(who);
    setClasses(b ? [b.session] : []);
  };
  // Simuler le scan d'une carte membre → identification → choix du cours.
  const simCard = () => pickMember(demoMember());

  const CAMPUS: CampusCode[] = ['CORE', 'INDUSTRY'];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Barre haute */}
      <View style={styles.top}>
        <Wavetruv size={30} tint="#fff" />
        {!done && (
          <View style={styles.pills}>
            {CAMPUS.map((c) => {
              const on = school === c;
              return (
                <Pressable key={c} onPress={() => { tap(); setSchool(c); if (selected) pickMember(selected); }} style={[styles.pill, on && { backgroundColor: accentFor(c) }]}>
                  <Text style={[styles.pillTxt, on && { color: '#fff' }]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <Pressable onPress={() => goBack(router)} hitSlop={10} style={styles.exit}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      {done ? (
        /* ÉTAT : succès */
        <View style={styles.center}>
          <View style={styles.okCircle}><Ionicons name="checkmark" size={64} color="#fff" /></View>
          <Text style={styles.okTitle}>{t('kiosk.done', { name: done })}</Text>
          <Text style={styles.okSub}>{t('kiosk.doneSub')}</Text>
          <Pressable onPress={reset} style={styles.nextBtn}><Text style={styles.nextTxt}>{t('kiosk.another')}</Text></Pressable>
        </View>
      ) : selected ? (
        /* ÉTAT : choix du cours (carte membre / repli) */
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => { setSelected(null); setClasses([]); }} hitSlop={8} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.backTxt}>{t('kiosk.scanTitle')}</Text>
          </Pressable>

          <View style={styles.memberHead}>
            {selected.photoUrl ? (
              <Image source={{ uri: selected.photoUrl }} style={styles.bigAvatar} />
            ) : (
              <LinearGradient colors={gradientFor(school)} style={styles.bigAvatar}><Text style={styles.bigInit}>{firstName(selected).charAt(0)}</Text></LinearGradient>
            )}
            <Text style={styles.hi}>{t('kiosk.hi', { name: firstName(selected) })}</Text>
          </View>

          <Text style={styles.pickLbl}>{classes.length ? t('kiosk.pickClass') : t('kiosk.noClass')}</Text>
          {classes.length > 1 && <Text style={styles.pickHint}>{t('kiosk.pickHint')}</Text>}
          <View style={{ gap: 12, marginTop: Space.md }}>
            {classes.map((s) => (
              <Pressable key={s.id} onPress={() => confirm(s.id, selected)} style={styles.classBtn}>
                <Text style={styles.classTime}>{hhmm(s.startsAt)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.classStyle}>{s.style}</Text>
                  <Text style={styles.classMeta}>{[s.teacherName, s.studioName, LEVEL_LABEL[s.level] ?? s.level].filter(Boolean).join(' · ')}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={26} color={accentFor(school)} />
              </Pressable>
            ))}
            {classes.length === 0 && (
              <Pressable onPress={() => confirm(null, selected)}>
                <LinearGradient colors={gradientFor(school)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.freeBtn}>
                  <Text style={styles.freeTxt}>{t('kiosk.freeCheck')}</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </ScrollView>
      ) : mode === 'search' ? (
        /* ÉTAT : recherche manuelle (repli) */
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => { setMode('scan'); setQuery(''); }} hitSlop={8} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.backTxt}>{t('kiosk.scanTitle')}</Text>
          </Pressable>
          <Text style={styles.welcome}>{t('kiosk.manual')}</Text>
          <View style={[styles.searchWrap, { marginTop: Space.lg }]}>
            <Ionicons name="search" size={22} color="rgba(255,255,255,0.4)" />
            <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder={t('kiosk.searchPh')} placeholderTextColor="rgba(255,255,255,0.35)" autoFocus autoCorrect={false} />
            {query.length > 0 && <Pressable onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.4)" /></Pressable>}
          </View>
          <View style={{ gap: 10, marginTop: Space.lg }}>
            {results.map((m) => (
              <Pressable key={m.id} onPress={() => pickMember(m)} style={styles.memberRow}>
                <View style={styles.avatar}><Text style={styles.avatarInit}>{firstName(m).charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  {m.alias && <Text style={styles.memberAlias}>{m.alias}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
              </Pressable>
            ))}
            {query.trim().length > 0 && results.length === 0 && <Text style={styles.noMatch}>{t('kiosk.noMatch', { q: query })}</Text>}
          </View>
        </ScrollView>
      ) : (
        /* ÉTAT : accueil scan */
        <View style={styles.scanHome}>
          <Text style={styles.welcome}>{t('kiosk.welcome')}</Text>
          <Text style={styles.tagline}>{t('kiosk.scanHint')}</Text>

          <View style={styles.viewport}>
            {Platform.OS !== 'web' && perm?.granted ? (
              <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => onScan(data)} />
            ) : (
              <Ionicons name="qr-code-outline" size={92} color="rgba(255,255,255,0.32)" />
            )}
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          {Platform.OS !== 'web' && !perm?.granted && (
            <Pressable onPress={requestPerm} style={styles.camBtn}><Text style={styles.camBtnTxt}>Activer la caméra</Text></Pressable>
          )}

          <View style={styles.simRow}>
            <Pressable onPress={simBooking} style={styles.simBtn}>
              <Ionicons name="ticket-outline" size={20} color="#fff" />
              <Text style={styles.simTxt}>{t('kiosk.simBooking')}</Text>
            </Pressable>
            <Pressable onPress={simCard} style={styles.simBtn}>
              <Ionicons name="card-outline" size={20} color="#fff" />
              <Text style={styles.simTxt}>{t('kiosk.simCard')}</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setMode('search')} hitSlop={8} style={styles.manual}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.55)" />
            <Text style={styles.manualTxt}>{t('kiosk.manual')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Space.lg, paddingVertical: Space.md },
  pills: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, padding: 4, marginLeft: 'auto' },
  pill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  pillTxt: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.4 },
  exit: { padding: 6 },

  body: { paddingHorizontal: Space.lg, paddingTop: Space.lg, paddingBottom: 60, maxWidth: 640, width: '100%', alignSelf: 'center' },
  welcome: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.62)', marginTop: 8, textAlign: 'center', maxWidth: 320 },

  scanHome: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xl },
  viewport: { width: 240, height: 240, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginVertical: Space.xl, overflow: 'hidden' },
  camBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 11, marginBottom: Space.lg },
  camBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: '#FF6A16' },
  tl: { top: 14, left: 14, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  tr: { top: 14, right: 14, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  bl: { bottom: 14, left: 14, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  br: { bottom: 14, right: 14, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  simRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  simBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14 },
  simTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  manual: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Space.xl, paddingVertical: 10 },
  manualTxt: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 18, paddingHorizontal: 18, height: 62 },
  search: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 20, fontWeight: '800' },
  memberName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  memberAlias: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  noMatch: { fontSize: 15, color: 'rgba(255,255,255,0.5)', paddingVertical: Space.lg, textAlign: 'center' },

  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Space.lg },
  backTxt: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  memberHead: { alignItems: 'center', marginBottom: Space.xl },
  bigAvatar: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  bigInit: { color: '#fff', fontSize: 42, fontWeight: '800' },
  hi: { fontSize: 30, fontWeight: '800', color: '#fff', marginTop: 16, letterSpacing: -0.5 },
  pickLbl: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  pickHint: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  classBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16 },
  classTime: { fontSize: 20, fontWeight: '800', color: '#fff', width: 62 },
  classStyle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  classMeta: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  freeBtn: { borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  freeTxt: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xl },
  okCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#3E9E59', alignItems: 'center', justifyContent: 'center' },
  okTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 28, textAlign: 'center', letterSpacing: -0.5 },
  okSub: { fontSize: 16, fontWeight: '700', color: '#8CFF7A', marginTop: 10 },
  nextBtn: { marginTop: 36, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 15 },
  nextTxt: { fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
});
