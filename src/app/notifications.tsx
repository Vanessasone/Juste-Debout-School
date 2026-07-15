/**
 * NOTIFICATIONS — boîte de réception in-app.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { getLastSeen, getNotifications, markSeen, Notif, NotifKind } from '@/lib/notifications';

const META: Record<NotifKind, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  info: { icon: 'information-circle', color: '#2F40E6' },
  absence: { icon: 'close-circle', color: '#E0483A' },
  replacement: { icon: 'swap-horizontal', color: '#FF6A16' },
  reminder: { icon: 'alarm', color: '#FF2E7E' },
};

function ago(d: Date): string {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 60) return `il y a ${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return j === 1 ? 'hier' : `il y a ${j} j`;
}

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [items, setItems] = useState<Notif[]>([]);
  const [lastSeen, setLastSeen] = useState(0);

  useEffect(() => {
    (async () => {
      const seen = await getLastSeen();
      setLastSeen(seen);
      setItems(await getNotifications());
      markSeen();
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('notif.title')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={30} color={Palette.textMute} />
            <Text style={styles.emptyText}>{t('notif.empty')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((n) => {
              const meta = META[n.kind];
              const unread = n.createdAt.getTime() > lastSeen;
              return (
                <View key={n.id} style={[styles.card, unread && { borderColor: meta.color }]}>
                  <View style={[styles.iconWrap, { backgroundColor: meta.color }]}>
                    <Ionicons name={meta.icon} size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTop}>
                      <Text style={styles.cardTitle}>{n.title}</Text>
                      {unread && <View style={[styles.dot, { backgroundColor: meta.color }]} />}
                    </View>
                    <Text style={styles.body}>{n.body}</Text>
                    <Text style={styles.time}>{[n.schoolCode, ago(n.createdAt)].filter(Boolean).join(' · ')}</Text>
                  </View>
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
  empty: { alignItems: 'center', gap: 12, marginTop: Space.xxxl },
  emptyText: { ...Type.body, color: Palette.textMute },
  card: { flexDirection: 'row', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Palette.border, padding: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: Palette.text },
  dot: { width: 8, height: 8, borderRadius: 4 },
  body: { fontSize: 13, color: Palette.textDim, marginTop: 3, lineHeight: 18 },
  time: { fontSize: 11, fontWeight: '700', color: Palette.textMute, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
});
