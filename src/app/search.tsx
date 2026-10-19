/**
 * RECHERCHE UNIFIÉE — cours, profs, vidéos (et bientôt stages), en un endroit.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { FavHeart } from '@/components/ui';
import { accentFor, Palette, Radius, Space, Type } from '@/constants/brand';
import { Fav } from '@/lib/favorites';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { getTeachers, Teacher } from '@/lib/people';
import { getUpcomingSessions, Session } from '@/lib/schools';
import { VIDEOS, Video } from '@/lib/videos';

type Result = { fav: Fav; accent: string; onPress: () => void };

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Search() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [classes, setClasses] = useState<Session[]>([]);
  const [classesError,setClassesError]=useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    let active=true;
    getUpcomingSessions('ALL',60).then(rows=>{if(active)setClasses(rows)}).catch(()=>{if(active)setClassesError(true)});
    getTeachers().then(rows=>{if(active)setTeachers(rows)}).catch(()=>{});
    return()=>{active=false};
  }, []);

  const query = q.trim().toLowerCase();

  const sections = useMemo(() => {
    if (!query) return [] as { title: string; rows: Result[] }[];
    const has = (...v: (string | null | undefined)[]) => v.some((x) => x?.toLowerCase().includes(query));

    const cls: Result[] = classes
      .filter((s) => has(s.style, s.teacherName))
      .slice(0, 8)
      .map((s) => ({
        fav: { key: `class:${s.id}`, kind: 'class', label: `${s.style} · ${hhmm(s.startsAt)}`, subtitle: [s.teacherName, s.schoolCode].filter(Boolean).join(' · ') },
        accent: accentFor(s.schoolCode),
        onPress: () => router.push('/planning'),
      }));

    const prof: Result[] = teachers
      .filter((tt) => has(tt.name, ...tt.styles))
      .slice(0, 8)
      .map((tt) => ({
        fav: { key: `teacher:${tt.id}`, kind: 'teacher', label: tt.name, subtitle: tt.styles.join(' · ') || undefined },
        accent: accentFor(tt.schoolCode),
        onPress: () => router.push('/hub'),
      }));

    const vids: Result[] = (VIDEOS as Video[])
      .filter((v) => has(v.title, v.style))
      .slice(0, 8)
      .map((v) => ({
        fav: { key: `video:${v.id}`, kind: 'video', label: v.title, subtitle: v.style },
        accent: Palette.core,
        onPress: () => router.push('/videos'),
      }));

    return [
      { title: t('fav.class'), rows: cls },
      { title: t('fav.teacher'), rows: prof },
      { title: t('fav.video'), rows: vids },
    ].filter((s) => s.rows.length > 0);
  }, [query, classes, teachers, t, router]);

  const empty = query.length > 0 && sections.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <View style={styles.hdrTop}>
          <Pressable onPress={() => goBack(router)} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.title}>{t('search.title')}</Text>
          <Wavetruv size={22} tint="#fff" />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.input}
            value={q}
            onChangeText={setQ}
            placeholder={t('search.placeholder')}
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoFocus
            autoCapitalize="none"
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }} keyboardShouldPersistTaps="handled">
        {classesError && <Text accessibilityRole="alert" style={{color:Palette.textMute,marginBottom:16}}>{t('planning.loadError')}</Text>}
        {query.length === 0 ? (
          <View style={styles.hint}>
            <Ionicons name="search" size={28} color={Palette.textMute} />
            <Text style={styles.hintText}>{t('search.hint')}</Text>
          </View>
        ) : empty ? (
          <Text style={styles.none}>{t('search.none', { q })}</Text>
        ) : (
          sections.map((sec) => (
            <View key={sec.title} style={{ marginBottom: Space.lg }}>
              <Text style={styles.secTitle}>{sec.title}</Text>
              <View style={{ gap: 8 }}>
                {sec.rows.map((r) => (
                  <Pressable key={r.fav.key} style={styles.row} onPress={r.onPress}>
                    <View style={[styles.dot, { backgroundColor: r.accent }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{r.fav.label}</Text>
                      {r.fav.subtitle ? <Text style={styles.rowSub}>{r.fav.subtitle}</Text> : null}
                    </View>
                    <FavHeart fav={r.fav} size={19} color={Palette.textMute} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: '#14101c', paddingHorizontal: Space.lg, paddingBottom: Space.md },
  hdrTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 },
  input: { flex: 1, fontSize: 15, color: '#fff', padding: 0 },
  hint: { alignItems: 'center', gap: 12, marginTop: Space.xxxl, paddingHorizontal: Space.xl },
  hintText: { ...Type.body, color: Palette.textMute, textAlign: 'center' },
  none: { ...Type.body, color: Palette.textMute, textAlign: 'center', marginTop: Space.xxl },
  secTitle: { ...Type.h2, color: Palette.text, marginBottom: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { fontSize: 14, fontWeight: '800', color: Palette.text, textTransform: 'uppercase', letterSpacing: -0.2 },
  rowSub: { fontSize: 12, color: Palette.textDim, marginTop: 2 },
});
