/**
 * Écran CLASSEMENTS — profs open, profs formation, élèves formation.
 * Alimenté par le registre de points (ranking_points) → view agrégée.
 * Le détail des points (assiduité, retards, jury, votes…) se gère côté admin.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { gradientFor, Palette, Radius, Space, Type } from '@/constants/brand';
import { useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { getMyProfile, isAdmin } from '@/lib/profile';
import {canReadTeacherSkills} from '@/lib/teacher-skills';
import { getLeaderboard, LeaderRow, Population } from '@/lib/rankings';
import { getSchools, School } from '@/lib/schools';

const INK = '#14101c';
const MEDALS = ['#E0A21A', '#9AA0A6', '#B87333']; // or / argent / bronze

export default function RankingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { accent } = useCampus();
  const [pop, setPop] = useState<Population>('formation_student');
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null); // null = toutes
  const [canStaff, setCanStaff] = useState(false);
  const [canTeacherRanking,setCanTeacherRanking]=useState(false);

  const TABS: { key: Population; label: string }[] = [
    { key: 'open_teacher', label: t('rankings.openTeachers') },
    { key: 'formation_teacher', label: t('rankings.formationTeachers') },
    { key: 'formation_student', label: t('rankings.students') },
  ];

  useEffect(() => {
    getSchools().then(setSchools);
    canReadTeacherSkills().then(setCanTeacherRanking).catch(()=>setCanTeacherRanking(false));
    getMyProfile().then((p) => setCanStaff(isAdmin(p) || !!p?.roles?.includes('staff'))).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getLeaderboard(pop, { schoolId: schoolId ?? undefined })
      .then((r) => alive && setRows(r))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [pop, schoolId]);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      {/* En-tête */}
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <View style={styles.hdrTop}>
          <Pressable onPress={() => goBack(router)} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.title}>{t('rankings.title')}</Text>
          <Wavetruv size={22} tint="#fff" />
        </View>
        <View style={styles.seg}>
          {TABS.filter(tab=>tab.key==='formation_student'||canTeacherRanking).map((tab) => {
            const on = pop === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setPop(tab.key)}
                style={[styles.segItem, on && { backgroundColor: accent }]}>
                <Text style={[styles.segText, on && { color: '#fff' }]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        {canTeacherRanking&&<GradientBtn label="Ranking professeurs · matrice confidentielle" onPress={()=>router.push('/teacher-ranking')}/>}
        {schools.length > 1 && (
          <View style={styles.schoolRow}>
            <Pressable onPress={() => setSchoolId(null)} style={[styles.schoolChip, schoolId === null && styles.schoolChipAll]}>
              {schoolId === null && <LinearGradient colors={gradientFor('ALL')} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
              <Text style={[styles.schoolChipText, schoolId === null && { color: '#fff' }]}>{t('planning.all')}</Text>
            </Pressable>
            {schools.map((s) => {
              const on = schoolId === s.id;
              const c = s.code === 'INDUSTRY' ? '#2F40E6' : '#FF6A16';
              return (
                <Pressable key={s.id} onPress={() => setSchoolId(s.id)} style={[styles.schoolChip, on && { backgroundColor: c, borderColor: c }]}>
                  <Text style={[styles.schoolChipText, on && { color: '#fff' }]}>{s.code}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {pop === 'formation_student' && (
          <View style={styles.note}>
            <Ionicons name="lock-closed" size={14} color={Palette.textDim} />
            <Text style={styles.noteText}>{t('rankings.studentNote')}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={accent} style={{ marginTop: Space.xxl }} />
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: accent + '1f' }]}>
              <Ionicons name="trophy" size={30} color={accent} />
            </View>
            <Text style={styles.emptyTitle}>{t('rankings.empty')}</Text>
            <Text style={styles.emptyText}>{t('rankings.emptyHint')}</Text>
            {canStaff && (
              <View style={styles.emptyCta}>
                <GradientBtn label={t('rankings.emptyCta')} onPress={() => router.push('/admin-points')} />
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {rows.map((r) => {
              const medal = r.rank <= 3 ? MEDALS[r.rank - 1] : null;
              return (
                <View key={r.subjectId} style={[styles.row, medal && { borderColor: medal }]}>
                  <View style={[styles.rank, { backgroundColor: medal ?? Palette.surface2 }]}>
                    <Text style={[styles.rankNum, { color: medal ? '#fff' : Palette.textDim }]}>
                      {r.rank}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{r.name}</Text>
                    {r.subtitle ? <Text style={styles.sub}>{r.subtitle}</Text> : null}
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={[styles.score, { color: accent }]}>{r.score}</Text>
                    <Text style={styles.pts}>{t('rankings.points')}</Text>
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
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md },
  hdrTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  seg: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.pill, padding: 4, marginTop: 14 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.pill },
  segText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' },

  schoolRow: { flexDirection: 'row', gap: 8, marginBottom: Space.md },
  schoolChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, overflow: 'hidden' },
  schoolChipAll: { borderColor: 'transparent' },
  schoolChipText: { fontSize: 12, fontWeight: '800', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.3 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.surface2,
    borderRadius: Radius.sm,
    padding: 10,
    marginBottom: Space.md,
  },
  noteText: { flex: 1, ...Type.small, color: Palette.textDim },

  empty: { alignItems: 'center', marginTop: Space.xxxl, paddingHorizontal: Space.lg },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Space.md },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Palette.text, marginBottom: 6 },
  emptyText: { ...Type.body, color: Palette.textMute, textAlign: 'center', maxWidth: 300, lineHeight: 20 },
  emptyCta: { alignSelf: 'stretch', marginTop: Space.lg },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Palette.border,
    padding: 12,
  },
  rank: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 16, fontWeight: '800', color: Palette.text, textTransform: 'uppercase', letterSpacing: -0.2 },
  sub: { fontSize: 12, color: Palette.textDim, marginTop: 2 },
  scoreBox: { alignItems: 'flex-end' },
  score: { fontSize: 20, fontWeight: '800' },
  pts: { fontSize: 10, fontWeight: '700', color: Palette.textMute, textTransform: 'uppercase', letterSpacing: 0.4 },
});
