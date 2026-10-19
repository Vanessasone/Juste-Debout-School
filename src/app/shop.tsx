/**
 * BOUTIQUE — vitrine du merch (aperçu). Le vrai e-commerce (panier + paiement
 * Stripe + gestion stock) arrivera en Phase B. Ici : catalogue « qui donne envie ».
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';

const INK = '#14101c';
export default function Shop() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [notified, setNotified] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('shop.title')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        <LinearGradient colors={['#FF6A16', '#FF2E7E'] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.intro}>
          <Text style={styles.introBadge}>{t('shop.soon')}</Text>
          <Text style={styles.introText}>{t('shop.intro')}</Text>
        </LinearGradient>

        <Text style={styles.linkNotice}>Les produits et tarifs seront affichés après confirmation du catalogue par l’école. Aucun achat en ligne n’est ouvert pour le moment.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  linkNotice: {color:Palette.textDim,fontSize:16,lineHeight:24},
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  intro: { borderRadius: Radius.xl, padding: 16, marginBottom: Space.lg },
  introBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill, marginBottom: 10 },
  introText: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: { width: '47.5%', backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: 'hidden' },
  thumb: { height: 130, position: 'relative' },
  soon: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(20,16,25,0.55)', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  soonText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  info: { padding: 11 },
  name: { fontSize: 13, fontWeight: '800', color: Palette.text, textTransform: 'uppercase', letterSpacing: -0.2 },
  price: { fontSize: 14, fontWeight: '800', color: Palette.core, marginTop: 3 },
  notified: { ...Type.body, fontWeight: '700', color: Palette.success, textAlign: 'center', marginTop: Space.xl },
});
