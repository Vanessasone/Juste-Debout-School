/**
 * MA CARTE — carte virtuelle : type de carte, cours restants, et QR MEMBRE à
 * présenter à l'accueil. Lien vers « Mes réservations » (un QR par cours).
 * Décompte/paiement réels = Phase B ; ici démo.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMyCards, type MemberCard } from '@/lib/member-data';
import { Wavetruv } from '@/components/Logo';
import { QR } from '@/components/QR';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { memberQr } from '@/lib/bookings';
import { useI18n } from '@/lib/i18n';
import { getMyProfile, type Profile } from '@/lib/profile';

const INK = '#14101c';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);

  const [cards,setCards]=useState<MemberCard[]>([]);
  const [cardError,setCardError]=useState(false);
  useFocusEffect(useCallback(()=>{let active=true;getMyCards().then(r=>{if(active){setCards(r);setCardError(false);}}).catch(()=>{if(active)setCardError(true)});return()=>{active=false;};},[]));
  useFocusEffect(useCallback(() => { getMyProfile().then(setProfile).catch(() => {}); }, []));

  const name = profile?.alias || profile?.full_name || 'Membre';
  const photoUrl = profile?.photo_url ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Text style={styles.title}>{t('wallet.title')}</Text>
        <Wavetruv size={26} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        <Text style={styles.sec}>Mes cartes de cours</Text>
        {cardError ? <Text style={styles.linkSub}>Impossible de charger tes cartes. Réessaie en revenant sur cet écran.</Text> : cards.length ? cards.map(c=><LinearGradient key={c.id} colors={['#2F40E6','#7C3AED']} style={styles.card}><Text style={styles.cardType}>{c.jds_card_types?.name??'Carte de cours'}</Text><Text style={styles.cardNum}>{c.credits_left}<Text style={styles.cardNumTot}> / {c.credits_total}</Text></Text><Text style={styles.cardLeft}>cours restants{c.expires_at?` · valable jusqu’au ${new Date(c.expires_at).toLocaleDateString('fr-FR')}`:''}</Text></LinearGradient>) : <Text style={styles.linkSub}>Aucune carte active associée à ton compte. Renseigne-toi auprès de l’accueil pour les cartes et les paiements.</Text>}

        {/* QR membre */}
        <Text style={styles.sec}>{t('wallet.scanTitle')}</Text>
        <View style={styles.qrCard}>
          {profile?.id ? <QR value={memberQr(profile.id)} size={180} /> : <Text style={styles.linkSub}>Chargement de ton identifiant membre…</Text>}
          <Text style={styles.qrHint}>{t('wallet.scanHint')}</Text>
        </View>

        {/* Mes réservations */}
        <Pressable style={styles.link} onPress={() => router.push('/reservations')}>
          <View style={styles.linkIcon}><Ionicons name="qr-code" size={20} color={Palette.industry} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>{t('wallet.reservations')}</Text>
            <Text style={styles.linkSub}>{t('wallet.reservationsSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Palette.textMute} />
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  card: { borderRadius: Radius.xl, padding: 20, minHeight: 172 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardType: { fontSize: 14, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardNum: { fontSize: 46, fontWeight: '800', color: '#fff', letterSpacing: -1, marginTop: 14 },
  cardNumTot: { fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  cardLeft: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  track: { height: 8, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden', marginTop: 14 },
  fill: { height: '100%', borderRadius: 100, backgroundColor: '#fff' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  idPhoto: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  idPhotoFallback: { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  idInit: { color: '#fff', fontSize: 20, fontWeight: '800' },
  cardName: { fontSize: 16, fontWeight: '800', color: '#fff' },
  memberLbl: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 1 },
  sec: { ...Type.h2, color: Palette.text, marginTop: Space.xl, marginBottom: Space.md },
  qrCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.lg, padding: Space.lg, alignItems: 'center' },
  qrHint: { fontSize: 13, fontWeight: '600', color: Palette.textDim, textAlign: 'center', marginTop: 14, maxWidth: 260, lineHeight: 18 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Space.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 14 },
  linkIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(47,64,230,0.12)', alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 15, fontWeight: '800', color: Palette.text },
  linkSub: { fontSize: 12, color: Palette.textDim, marginTop: 2 },
});
