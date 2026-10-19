/**
 * ACCUEIL — direction « Kinetic » : hero sombre immersif (défile automatiquement
 * sur les prochains cours, triés par heure) posé sur une feuille claire.
 * Wavetruv + wordmark en tête, bouton vers l'app événement.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoreOpenCatalogue } from '@/components/CoreOpenCatalogue';
import { Coin } from '@/components/Coin';
import { Wavetruv, Wordmark } from '@/components/Logo';
import { RateSheet } from '@/components/RateSheet';
import { AppSwitch, FadeInView, FavHeart } from '@/components/ui';
import { accentFor, CampusCode, gradientFor, Palette, Radius, Space, Type } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';
import { getActivePoll, Poll } from '@/lib/polls';
import { getMyPoints, tierInfo } from '@/lib/points';
import { getMyProfile, isAdmin, Profile } from '@/lib/profile';
import { getClassesToRate, RateItem } from '@/lib/ratings';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getLastSeen, getNotifications } from '@/lib/notifications';
import { getUpcomingSessions, LEVEL_LABEL, Session } from '@/lib/schools';

const AV: readonly [string, string][] = [
  ['#FF6A16', '#B23C06'], ['#8A5A2A', '#4D3312'], ['#2F40E6', '#20309A'], ['#444', '#222'],
];
const CAMPUS_TABS: { key: CampusCode | 'ALL'; label: string }[] = [
  { key: 'CORE', label: 'CORE' }, { key: 'INDUSTRY', label: 'Industry' }, { key: 'ALL', label: 'Tout' },
];

const DOW = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function dayLabel(d: Date, todayLabel: string) {
  return d.toDateString() === new Date().toDateString() ? todayLabel : `${DOW[d.getDay()]} ${d.getDate()}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { campus, accent, setCampus } = useCampus();
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [coins, setCoins] = useState(0);
  const [toRate, setToRate] = useState<RateItem[]>([]);
  const [rateOpen, setRateOpen] = useState(false);
  const [coinToast, setCoinToast] = useState<number | null>(null);

  // Temps réel : crédit de JD Coins → solde live + toast.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`coins-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jd_points_ledger', filter: `profile_id=eq.${user.id}` }, (payload) => {
          const delta = (payload.new as any)?.delta ?? 0;
          getMyPoints().then(setCoins).catch(() => {});
          if (delta > 0) { setCoinToast(delta); setTimeout(() => setCoinToast(null), 3000); }
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [list, seen] = await Promise.all([getNotifications(), getLastSeen()]);
        setHasUnread(list.some((n) => n.createdAt.getTime() > seen));
      })();
      getMyPoints().then(setCoins).catch(() => {});
      getClassesToRate().then(setToRate).catch(() => {});
    }, [session?.user.id]),
  );
  useFocusEffect(useCallback(() => {
    let active = true;
    setProfile(null);
    if (session?.user.id) getMyProfile().then(p => { if (active) setProfile(p); }).catch(() => {});
    return () => { active = false; };
  }, [session?.user.id]));
  const [hero, setHero] = useState<Session[]>([]);
  const [heroError,setHeroError]=useState(false);
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(1);

  useEffect(() => {
    getActivePoll(['school', 'both']).then(setPoll);
  }, []);

  useEffect(() => {
    let active=true; setHero([]); setHeroError(false); setIdx(0); setFade(1);
    getUpcomingSessions(campus, 6).then(rows=>{if(active){setHero(rows.slice(0,4));setIdx(0);}}).catch(()=>{if(active)setHeroError(true)});
    return()=>{active=false};
  }, [campus]);

  useEffect(() => {
    if (hero.length < 2) return;
    let transition:ReturnType<typeof setTimeout>|undefined;
    const id = setInterval(() => {
      setFade(0);
      transition=setTimeout(() => { setIdx((i) => (i + 1) % hero.length); setFade(1); }, 280);
    }, 3600);
    return () => {clearInterval(id);if(transition)clearTimeout(transition);};
  }, [hero]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || profile?.alias || '';
  const coinInfo = tierInfo(coins);
  const s = hero[idx];
  const heroAccent = s ? accentFor(s.schoolCode) : accent;

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Space.xxxl }}>
        {isAdmin(profile) && <Pressable accessibilityRole="button" onPress={() => router.push('/admin')} style={{ padding: 16, backgroundColor: '#1B1917', flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ionicons name="shield-checkmark" size={22} color="#FF6A16" /><Text style={{ color: '#fff', fontWeight: '800', flex: 1 }}>Administration School</Text><Ionicons name="chevron-forward" size={20} color="#fff" /></Pressable>}
        {/* ---------- HERO ---------- */}
        <View style={[styles.hero, { paddingTop: insets.top + 8, minHeight: insets.top + 320 }]}>
          <View style={styles.heroBase} />
          <LinearGradient colors={['rgba(47,64,230,0.55)', 'transparent']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 0.7 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['transparent', 'rgba(255,106,22,0.5)']} start={{ x: 0.2, y: 0.4 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

          <AppSwitch />
          <View style={[styles.heroTop, { marginTop: 12 }]}>
            <View style={styles.brandRow}>
              <Wavetruv size={30} tint="#fff" />
              <Wordmark width={116} tint="#fff" />
            </View>
            <View style={styles.heroTopR}>
              <Pressable style={styles.bell} onPress={() => router.push('/notifications')}>
                <Ionicons name="notifications" size={18} color="#fff" />
                {hasUnread && <View style={styles.bellDot} />}
              </Pressable>
            </View>
          </View>

          <View style={[styles.heroContent, { opacity: fade }]}>
            {s ? (
              <>
                <Text style={styles.heroK}>{dayLabel(s.startsAt, t('home.today'))} · {hhmm(s.startsAt)} · {s.schoolCode}</Text>
                <Text style={styles.heroTitle}>{s.style}</Text>
                <Text style={styles.heroWho}>
                  {[s.teacherName, s.studioName, LEVEL_LABEL[s.level]].filter(Boolean).join(' · ')}
                </Text>
                <Pressable style={styles.heroCta} onPress={() => router.push('/planning')}>
                  <LinearGradient colors={gradientFor(s.schoolCode)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heroCtaBg}>
                    <Text style={styles.heroCtaText}>{t('planning.viewClass')}</Text>
                  </LinearGradient>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.heroK}>{t('home.welcome')}</Text>
                <Text style={styles.heroTitle}>{firstName}</Text>
              </>
            )}
          </View>

          {hero.length > 1 && (
            <View style={styles.dots}>
              {hero.map((_, i) => <View key={i} style={[styles.dot, i === idx && styles.dotOn]} />)}
            </View>
          )}
        </View>

        {/* ---------- SHEET (clair) ---------- */}
        <FadeInView>
        <View style={styles.sheet}>
          {heroError && <Text accessibilityRole="alert" style={{color:Palette.text,padding:16}}>{t('planning.loadError')}</Text>}
          <View style={styles.grab} />

          <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
            <Ionicons name="search" size={17} color={Palette.textMute} />
            <Text style={styles.searchText}>{t('search.home')}</Text>
          </Pressable>

          <View style={styles.chips}>
            {CAMPUS_TABS.map((tab) => {
              const on = campus === tab.key;
              const solid = tab.key === 'CORE' ? '#FF6A16' : tab.key === 'INDUSTRY' ? '#2F40E6' : null;
              if (on && tab.key === 'ALL') {
                return (
                  <Pressable key={tab.key} onPress={() => setCampus(tab.key)} style={[styles.chip, styles.chipOnAll]}>
                    <LinearGradient colors={gradientFor('ALL')} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <Text style={[styles.chipText, { color: '#fff' }]}>{tab.label}</Text>
                  </Pressable>
                );
              }
              return (
                <Pressable key={tab.key} onPress={() => setCampus(tab.key)}
                  style={[styles.chip, on && { backgroundColor: solid ?? Palette.text, borderColor: solid ?? Palette.text }]}>
                  <Text style={[styles.chipText, on && { color: '#fff' }]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* JD Coins — central, solde en direct */}
          <Pressable style={styles.coinsCard} onPress={() => router.push('/points')}>
            <Coin size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.coinsLabel}>{t('pts.homeCta')}</Text>
              <Text style={styles.coinsBal}>{coins.toLocaleString('fr-FR')} <Text style={styles.coinsUnit}>coins</Text></Text>
              <View style={styles.coinsTrack}><View style={[styles.coinsFill, { width: `${coinInfo.progress * 100}%` }]} /></View>
              <Text style={styles.coinsTier}>
                Solde School indépendant
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>

          {/* À noter — post-class rating */}
          {toRate.length > 0 && (
            <Pressable style={styles.rateCard} onPress={() => setRateOpen(true)}>
              <View style={styles.rateBadge}><Ionicons name="star" size={20} color="#E8B54B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rateTitle}>{t('rate.homeCard')}</Text>
                <Text style={styles.rateSub}>{t('rate.homeSub', { style: toRate[0].style, name: toRate[0].teacherName })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Palette.textMute} />
            </Pressable>
          )}

          {/* Vote */}
          {poll && (
            <>
              <Sec title={t('home.voteTitle')} action={t('home.see')} onPress={() => router.push('/hub')} />
              <Pressable onPress={() => router.push('/hub')}>
                <LinearGradient colors={[Palette.industry, '#5B32D6', Palette.pink] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.vote}>
                  <Text style={styles.voteK}>{t('home.voteScope')}</Text>
                  <Text style={styles.voteQ}>{poll.question}</Text>
                  <View style={styles.faces}>
                    {poll.candidates.slice(0, 4).map((c, i) => (
                      c.photoUrl
                        ? <Image key={c.id} source={{ uri: c.photoUrl }} style={[styles.face, i > 0 && { marginLeft: -12 }]} />
                        : <LinearGradient key={c.id} colors={AV[i % AV.length]} style={[styles.face, i > 0 && { marginLeft: -12 }]} />
                    ))}
                  </View>
                  <View style={styles.voteBtn}>
                    <Text style={styles.voteBtnText}>{poll.myVote ? t('vote.results') : t('home.voteCta')}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </>
          )}

          {/* Prochains cours */}
          <Sec title={t('home.nextClass')} action={t('common.planning')} onPress={() => router.push('/planning')} />
          {hero.slice(0, 3).map((cl) => (
            <Pressable key={cl.id} style={styles.cls} onPress={() => router.push('/planning')}>
              <Text style={[styles.clsT, { color: accentFor(cl.schoolCode) }]}>{hhmm(cl.startsAt)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.clsStyle}>{cl.style}</Text>
                <Text style={styles.clsMeta}>{[cl.teacherName, cl.studioName].filter(Boolean).join(' · ')}</Text>
              </View>
              <LinearGradient colors={gradientFor(cl.schoolCode)} style={styles.clsGo}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </Pressable>
          ))}

          {/* Accès rapides */}
          <Text style={styles.quickTitle}>{t('home.quick')}</Text>

          {/* Grille 2×2 */}
          <View style={styles.tileGrid}>
            <QuickTile icon="business" color={Palette.industry} tint="rgba(47,64,230,0.12)" title={t('rent.homeCta')} sub={t('rent.homeSub')} onPress={() => router.push('/rentals')} />
            <QuickTile icon="bag-handle" color={Palette.pink} tint="rgba(255,46,126,0.12)" title={t('shop.homeCta')} sub={t('shop.homeSub')} onPress={() => router.push('/shop')} />
            <QuickTile icon="gift" color={Palette.core} tint="rgba(255,106,22,0.12)" title={t('ref.homeCta')} sub={t('ref.homeSub')} onPress={() => router.push('/referral')} />
            <QuickTile icon="people" color="#7C3AED" tint="rgba(124,58,237,0.12)" title={t('kids.homeCta')} sub={t('kids.homeSub')} onPress={() => router.push('/children')} />
          </View>
        </View>
        </FadeInView>
        {campus !== 'INDUSTRY' && <CoreOpenCatalogue compact />}
      </ScrollView>

      <RateSheet
        visible={rateOpen}
        item={toRate[0] ?? null}
        onClose={() => setRateOpen(false)}
        onRated={() => getClassesToRate().then(setToRate).catch(() => {})}
      />

      {coinToast != null && (
        <View style={[styles.coinToast, { top: insets.top + 66 }]} pointerEvents="none">
          <Coin size={22} />
          <Text style={styles.coinToastTxt}>+{coinToast} coins</Text>
        </View>
      )}
    </View>
  );
}

function Sec({ title, action, onPress }: { title: string; action: string; onPress?: () => void }) {
  return (
    <View style={styles.sec}>
      <Text style={styles.secTitle}>{title}</Text>
      <Pressable onPress={onPress}><Text style={styles.secAction}>{action}</Text></Pressable>
    </View>
  );
}

function QuickTile({ icon, color, tint, title, sub, onPress }: { icon: any; color: string; tint: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.tileSub} numberOfLines={2}>{sub}</Text>
    </Pressable>
  );
}

const INK = '#14101c';
const styles = StyleSheet.create({
  hero: { paddingHorizontal: Space.lg, overflow: 'hidden' },
  heroBase: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: INK },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heroTopR: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  streakNum: { fontFamily: undefined, fontSize: 13, fontWeight: '800', color: '#fff' },
  bell: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 6, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF2E7E', borderWidth: 1.5, borderColor: '#14101c' },
  switchApp: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  switchAppText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  heroContent: { marginTop: 30, paddingBottom: 20 },
  heroK: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: '#FFCBA6' },
  heroTitle: { fontSize: 40, fontWeight: '800', letterSpacing: -1, textTransform: 'uppercase', color: '#fff', marginTop: 6, lineHeight: 40 },
  heroWho: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  heroCta: { alignSelf: 'flex-start', marginTop: 14, borderRadius: Radius.pill, overflow: 'hidden' },
  heroCtaBg: { paddingHorizontal: 18, paddingVertical: 12 },
  heroCtaText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: '#fff' },
  dots: { flexDirection: 'row', gap: 5, paddingBottom: 30 },
  dot: { width: 16, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotOn: { width: 22, backgroundColor: '#fff' },

  sheet: { backgroundColor: Palette.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24, paddingHorizontal: Space.lg, paddingTop: 16 },
  grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: Palette.borderStrong, marginBottom: 6 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Palette.surface, borderRadius: Radius.pill, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: 16, paddingVertical: 12, marginTop: 6 },
  searchText: { fontSize: 14, color: Palette.textMute, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  chipOnAll: { borderColor: 'transparent', overflow: 'hidden' },
  chipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: Palette.textDim },

  sec: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: Space.xl, marginBottom: 10 },
  secTitle: { ...Type.h2, color: Palette.text },
  secAction: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', color: Palette.core },

  vote: { borderRadius: Radius.xl, padding: 16 },
  voteK: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' },
  voteQ: { fontSize: 17, fontWeight: '800', textTransform: 'uppercase', color: '#fff', letterSpacing: -0.2, marginTop: 7, marginBottom: 12 },
  faces: { flexDirection: 'row' },
  face: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#fff' },
  voteBtn: { marginTop: 13, backgroundColor: '#fff', borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  voteBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: Palette.industry },

  rail: { gap: 12, paddingVertical: 2, paddingRight: Space.lg },
  stg: { width: 150, height: 196, borderRadius: Radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  lk: { position: 'absolute', top: 9, left: 9, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  lkN: { fontSize: 10, fontWeight: '800', color: Palette.text },
  stgFav: { position: 'absolute', top: 8, right: 8 },
  stgCap: { padding: 11 },
  stgStyle: { fontSize: 16, fontWeight: '800', textTransform: 'uppercase', color: '#fff', letterSpacing: -0.2 },
  stgWhen: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  stgP: { alignSelf: 'flex-start', marginTop: 7, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  stgPText: { fontSize: 9, fontWeight: '800', color: '#111' },

  cls: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.lg, padding: 11, marginBottom: 9 },
  clsT: { fontSize: 13, fontWeight: '800', width: 42 },
  clsStyle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', color: Palette.text, letterSpacing: -0.2 },
  clsMeta: { fontSize: 11, color: Palette.textDim, marginTop: 1 },
  clsGo: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  rentLink: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Space.lg, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 14 },
  rentTitle: { fontSize: 15, fontWeight: '800', color: Palette.text, textTransform: 'uppercase', letterSpacing: -0.2 },
  rentSub: { fontSize: 12, color: Palette.textDim, marginTop: 2 },

  quickTitle: { ...Type.h2, color: Palette.text, marginTop: Space.xl, marginBottom: Space.md },
  coinsCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: INK, borderRadius: 18, padding: 16, marginTop: Space.md },
  coinsLabel: { fontSize: 12, fontWeight: '800', color: '#E8B54B', textTransform: 'uppercase', letterSpacing: 1 },
  coinsBal: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 2 },
  coinsUnit: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  coinsTrack: { height: 6, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden', marginTop: 10 },
  coinsFill: { height: '100%', borderRadius: 100, backgroundColor: '#E8B54B' },
  coinsTier: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.62)', marginTop: 7 },
  rateCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E8B54B55', borderRadius: 16, padding: 14, marginTop: Space.md },
  rateBadge: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#E8B54B22', alignItems: 'center', justifyContent: 'center' },
  coinToast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#14101c', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  coinToastTxt: { fontSize: 14, fontWeight: '800', color: '#E8B54B' },
  rateTitle: { fontSize: 14.5, fontWeight: '800', color: Palette.text },
  rateSub: { fontSize: 12.5, fontWeight: '600', color: Palette.textDim, marginTop: 2 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: { width: '48.5%', backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 18, padding: 14, minHeight: 116 },
  tileIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tileTitle: { fontSize: 14.5, fontWeight: '800', color: Palette.text, textTransform: 'uppercase', letterSpacing: -0.2 },
  tileSub: { fontSize: 12, fontWeight: '600', color: Palette.textDim, marginTop: 3, lineHeight: 16 },
});
