/**
 * Écran VIDÉOS — replays & tutos par style. Recherche + filtres.
 * Image-forward (vignettes en dégradé d'attente → vraies miniatures plus tard).
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { FavHeart } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';
import { formatDuration, getVideos, Video, VIDEO_STYLES } from '@/lib/videos';

function Thumb({ v, w, h }: { v: Video; w: number; h: number }) {
  return (
    <View style={{ width: w, height: h, borderRadius: Radius.md, overflow: 'hidden' }}>
      <LinearGradient colors={[v.hue, '#1B1917'] as const} style={StyleSheet.absoluteFill} />
      <View style={styles.playWrap}>
        <View style={styles.playBtn}>
          <Ionicons name="play" size={16} color="#1B1917" />
        </View>
      </View>
      <View style={styles.durPill}>
        <Text style={styles.durText}>{formatDuration(v.durationSec)}</Text>
      </View>
    </View>
  );
}

function BigCard({ v }: { v: Video }) {
  return (
    <Pressable style={styles.big}>
      <LinearGradient colors={[v.hue, '#1B1917'] as const} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', 'rgba(20,18,14,0.85)'] as const} style={StyleSheet.absoluteFill} />
      <View style={styles.likeBadge}>
        <Ionicons name="heart" size={11} color={Palette.core} />
        <Text style={styles.likeText}>{v.likes}</Text>
      </View>
      <View style={styles.favWrap}>
        <FavHeart fav={{ key: `video:${v.id}`, kind: 'video', label: v.title, subtitle: v.style }} size={18} />
      </View>
      <View style={styles.bigPlay}>
        <View style={styles.playBtn}>
          <Ionicons name="play" size={18} color="#1B1917" />
        </View>
      </View>
      <View style={styles.bigCap}>
        <Text style={styles.bigTitle} numberOfLines={2}>{v.title}</Text>
        <View style={styles.bigMetaRow}>
          <View style={styles.styleTag}>
            <Text style={styles.styleTagText}>{v.style}</Text>
          </View>
          <Text style={styles.bigDur}>{formatDuration(v.durationSec)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function RowCard({ v }: { v: Video }) {
  const { t } = useI18n();
  return (
    <Pressable style={styles.row}>
      <Thumb v={v} w={120} h={72} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>{v.title}</Text>
        <Text style={styles.rowMeta}>{v.style} · {t('videos.views', { n: v.views })}</Text>
        <View style={styles.rowLike}>
          <Ionicons name="heart" size={12} color={Palette.core} />
          <Text style={styles.rowLikeText}>{v.likes}</Text>
        </View>
      </View>
      <FavHeart fav={{ key: `video:${v.id}`, kind: 'video', label: v.title, subtitle: v.style }} size={20} color={Palette.textMute} />
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.secTitle}>{title}</Text>;
}

export default function VideosScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { accent } = useCampus();
  const [style, setStyle] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtering = !!style || query.trim().length > 0;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return getVideos(style).filter((v) => !q || v.title.toLowerCase().includes(q));
  }, [style, query]);

  const news = filtered.filter((v) => v.section === 'new');
  const popular = filtered.filter((v) => v.section === 'popular');
  const tutos = filtered.filter((v) => v.section === 'tuto');

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.topbar, { paddingTop: insets.top + Space.sm }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.brand, { flex: 1 }]}>{t('tab.videos')}</Text>
          <Wavetruv size={30} tint="#fff" />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('videos.search')}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Space.xxxl }}>

        {/* Filtres par style */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[null, ...VIDEO_STYLES].map((s) => {
            const on = style === s;
            return (
              <Pressable
                key={s ?? 'all'}
                onPress={() => setStyle(s)}
                style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}>
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{s ?? t('videos.all')}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Contenu */}
        {filtering ? (
          filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="videocam-outline" size={28} color={Palette.textMute} />
              <Text style={styles.emptyText}>{t('videos.empty')}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filtered.map((v) => <RowCard key={v.id} v={v} />)}
            </View>
          )
        ) : (
          <>
            <SectionHeader title={t('videos.new')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {news.map((v) => <BigCard key={v.id} v={v} />)}
            </ScrollView>

            <SectionHeader title={t('videos.popular')} />
            <View style={styles.list}>
              {popular.map((v) => <RowCard key={v.id} v={v} />)}
            </View>

            <SectionHeader title={t('videos.byStyle')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {tutos.map((v) => <BigCard key={v.id} v={v} />)}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { backgroundColor: '#14101c', paddingHorizontal: Space.lg, paddingBottom: Space.md },
  brand: { ...Type.display, color: '#fff', marginBottom: Space.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#fff', padding: 0 },

  chips: { gap: 8, paddingHorizontal: Space.lg, paddingVertical: Space.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipText: { fontSize: 12, fontWeight: '800', color: Palette.textDim, letterSpacing: 0.3, textTransform: 'uppercase' },

  secTitle: { ...Type.h2, color: Palette.text, paddingHorizontal: Space.lg, marginTop: Space.lg, marginBottom: Space.sm },
  rail: { gap: 12, paddingHorizontal: Space.lg, paddingVertical: 2 },
  list: { paddingHorizontal: Space.lg, gap: 12, marginTop: 2 },

  playWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durPill: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  big: { width: 230, height: 150, borderRadius: Radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  bigPlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  likeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  likeText: { fontSize: 11, fontWeight: '800', color: Palette.text },
  favWrap: { position: 'absolute', top: 8, right: 8 },
  bigCap: { padding: 12 },
  bigTitle: { fontSize: 17, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: -0.3, lineHeight: 19 },
  bigMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  styleTag: { backgroundColor: 'rgba(251,235,214,0.95)', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  styleTagText: { fontSize: 10, fontWeight: '800', color: '#C4670C', textTransform: 'uppercase', letterSpacing: 0.4 },
  bigDur: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: '800', color: Palette.text, letterSpacing: -0.2 },
  rowMeta: { fontSize: 12, color: Palette.textDim, marginTop: 3 },
  rowLike: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  rowLikeText: { fontSize: 12, fontWeight: '700', color: Palette.textDim },

  empty: { alignItems: 'center', gap: 10, marginTop: Space.xxxl },
  emptyText: { ...Type.body, color: Palette.textMute },
});
