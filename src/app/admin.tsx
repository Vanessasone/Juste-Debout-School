/**
 * BACK-OFFICE (hub staff/admin) — accès aux outils de gestion.
 * En réel, réservé aux comptes staff/admin (les RPC/RLS refusent les autres).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { getMyProfile, isAdmin } from '@/lib/profile';
import { isSupabaseConfigured } from '@/lib/supabase';

const INK = '#1B1917';

function Tool({ icon, title, sub, onPress, soon, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress?: () => void;
  soon?: string;
  color: string;
}) {
  return (
    <Pressable style={styles.tool} onPress={soon ? undefined : onPress} disabled={!!soon}>
      <View style={[styles.toolIcon, { backgroundColor: soon ? Palette.surface2 : color + '22' }]}>
        <Ionicons name={icon} size={22} color={soon ? Palette.textMute : color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolSub}>{sub}</Text>
      </View>
      {soon ? (
        <View style={styles.soon}><Text style={styles.soonText}>{soon}</Text></View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={Palette.textMute} />
      )}
    </Pressable>
  );
}

export default function AdminHub() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { accent } = useCampus();
  // Garde d'accès : en réel, réservé admin/staff (défense en profondeur, la RLS bloque déjà côté serveur).
  const [allowed, setAllowed] = useState<boolean | null>(!isSupabaseConfigured ? true : null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getMyProfile()
      .then((p) => {
        const ok = isAdmin(p) || !!p?.roles?.includes('staff');
        setAllowed(ok);
        if (!ok) router.replace('/(tabs)');
      })
      .catch(() => {
        setAllowed(false);
        router.replace('/(tabs)');
      });
  }, [router]);

  if (allowed !== true) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        {allowed === null && <ActivityIndicator color={accent} />}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <View style={styles.hdrTop}>
          <Pressable onPress={() => goBack(router)} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.title}>{t('admin.title')}</Text>
          <Wavetruv size={22} tint="#fff" />
        </View>
        <Text style={styles.sub}>{t('admin.subtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, gap: 10 }}>
        {!isSupabaseConfigured && (
          <View style={styles.demo}>
            <Ionicons name="information-circle" size={16} color={Palette.textDim} />
            <Text style={styles.demoText}>{t('admin.demoNote')}</Text>
          </View>
        )}
        <Tool icon="people" color="#2F40E6" title={t('admin.people')} sub={t('admin.peopleSub')} onPress={() => router.push('/admin-people')} />
        <Tool icon="ribbon" color="#FF6A16" title={t('admin.points')} sub={t('admin.pointsSub')} onPress={() => router.push('/admin-points')} />
        <Tool icon="megaphone" color="#FF2E7E" title={t('admin.poll')} sub={t('admin.pollSub')} onPress={() => router.push('/admin-poll')} />
        <Tool icon="notifications" color="#7C3AED" title={t('admin.notif')} sub={t('admin.notifSub')} onPress={() => router.push('/admin-notif')} />
        <Tool icon="calendar" color="#1D9E75" title={t('admin.planning')} sub={t('admin.planningSub')} onPress={() => router.push('/admin-planning')} />
        <Tool icon="qr-code" color="#E4520A" title={t('admin.kiosk')} sub={t('admin.kioskSub')} onPress={() => router.push('/kiosk')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.lg },
  hdrTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  sub: { fontSize: 12, color: '#B7AE9E', marginTop: 8 },

  demo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Palette.surface2, borderRadius: Radius.sm, padding: 10, marginBottom: 4,
  },
  demoText: { flex: 1, ...Type.small, color: Palette.textDim },

  tool: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Palette.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Palette.border, padding: 14,
  },
  toolIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { fontSize: 15, fontWeight: '800', color: Palette.text, letterSpacing: -0.2 },
  toolSub: { fontSize: 12, color: Palette.textDim, marginTop: 2 },
  soon: { backgroundColor: Palette.surface2, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  soonText: { fontSize: 10, fontWeight: '800', color: Palette.textMute, textTransform: 'uppercase', letterSpacing: 0.4 },
});
