/**
 * BACK-OFFICE — Saisie de points (gamification interne).
 * Population → personne (carte avec avatar) → type (coloré selon le signe) →
 * valeur → enregistrer. Alimente les Classements.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { addPoints, getSubjects, PointKind, Population, Subject } from '@/lib/rankings';

const INK = '#14101c';
const POPS: Population[] = ['open_teacher', 'formation_teacher', 'formation_student'];
const POP_COLOR: Record<Population, string> = {
  open_teacher: '#FF6A16',
  formation_teacher: '#2F40E6',
  formation_student: '#7C3AED',
};
const KINDS: { kind: PointKind; fr: string; en: string; def: number }[] = [
  { kind: 'attendance', fr: 'Présence', en: 'Attendance', def: 2 },
  { kind: 'lateness', fr: 'Retard', en: 'Lateness', def: -5 },
  { kind: 'absence', fr: 'Absence', en: 'Absence', def: -15 },
  { kind: 'rating', fr: 'Note élève', en: 'Rating', def: 5 },
  { kind: 'jury', fr: 'Jury', en: 'Jury', def: 10 },
  { kind: 'challenge', fr: 'Défi', en: 'Challenge', def: 10 },
  { kind: 'bonus', fr: 'Bonus', en: 'Bonus', def: 5 },
];

export default function AdminPoints() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale } = useI18n();

  const [pop, setPop] = useState<Population>('formation_student');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [sq, setSq] = useState('');
  const [kind, setKind] = useState<PointKind>('attendance');
  const [points, setPoints] = useState('2');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getSubjects(pop).then((s) => { setSubjects(s); setSubjectId(s[0]?.id ?? null); });
  }, [pop]);

  const color = POP_COLOR[pop];
  const filtered = useMemo(() => {
    const low = sq.trim().toLowerCase();
    return low ? subjects.filter((s) => s.name.toLowerCase().includes(low) || (s.subtitle ?? '').toLowerCase().includes(low)) : subjects;
  }, [subjects, sq]);

  const popLabel = (p: Population) =>
    p === 'open_teacher' ? t('rankings.openTeachers')
      : p === 'formation_teacher' ? t('rankings.formationTeachers')
        : t('rankings.students');

  const onSave = async () => {
    const value = Number(points.replace(',', '.'));
    if (!subjectId || Number.isNaN(value)) return;
    setSaving(true); setErr(null); setMsg(null);
    try {
      await addPoints(subjectId, kind, value, note || undefined);
      setMsg(t('admin.saved'));
      setNote('');
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
        <Text style={styles.title}>{t('admin.points')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }} keyboardShouldPersistTaps="handled">
        {/* Population */}
        <Text style={styles.label}>{t('admin.population')}</Text>
        <View style={styles.seg}>
          {POPS.map((p) => {
            const on = pop === p;
            return (
              <Pressable key={p} onPress={() => { setPop(p); setSq(''); }} style={[styles.segItem, on && { backgroundColor: POP_COLOR[p] }]}>
                <Text style={[styles.segText, on && { color: '#fff' }]} numberOfLines={1}>{popLabel(p)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Personne */}
        <Text style={styles.label}>{t('admin.subject')}</Text>
        {subjects.length > 6 && (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={17} color={Palette.textMute} />
            <TextInput style={styles.search} value={sq} onChangeText={setSq} placeholder={t('people.search')} placeholderTextColor={Palette.textMute} autoCorrect={false} />
          </View>
        )}
        <View style={{ gap: 8 }}>
          {filtered.map((s) => {
            const on = subjectId === s.id;
            return (
              <Pressable key={s.id} onPress={() => setSubjectId(s.id)} style={[styles.subject, on && { borderColor: color, borderWidth: 2 }]}>
                {s.photoUrl ? (
                  <Image source={{ uri: s.photoUrl }} style={styles.av} />
                ) : (
                  <LinearGradient colors={[color, color + 'AA'] as const} style={styles.av}><Text style={styles.avInit}>{s.name.charAt(0)}</Text></LinearGradient>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{s.name}{s.schoolCode ? `  ·  ${s.schoolCode}` : ''}</Text>
                  {s.subtitle ? <Text style={styles.subjectSub}>{s.subtitle}</Text> : null}
                </View>
                {on && <Ionicons name="checkmark-circle" size={22} color={color} />}
              </Pressable>
            );
          })}
          {filtered.length === 0 && <Text style={styles.note}>{t('people.empty')}</Text>}
        </View>

        {/* Type */}
        <Text style={styles.label}>{t('admin.kind')}</Text>
        <View style={styles.chips}>
          {KINDS.map((k) => {
            const on = kind === k.kind;
            const kc = k.def < 0 ? '#E24B4A' : '#3E9E59';
            return (
              <Pressable key={k.kind} onPress={() => { setKind(k.kind); setPoints(String(k.def)); }} style={[styles.chip, on && { backgroundColor: kc, borderColor: kc }]}>
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{locale === 'en' ? k.en : k.fr}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Points */}
        <Text style={styles.label}>{t('admin.pointsValue')}</Text>
        <View style={styles.stepRow}>
          <Pressable style={styles.stepBtn} onPress={() => setPoints(String((Number(points.replace(',', '.')) || 0) - 1))}><Ionicons name="remove" size={22} color={Palette.text} /></Pressable>
          <TextInput style={[styles.input, { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' }]} value={points} onChangeText={setPoints} keyboardType="numbers-and-punctuation" placeholder="0" placeholderTextColor={Palette.textMute} />
          <Pressable style={styles.stepBtn} onPress={() => setPoints(String((Number(points.replace(',', '.')) || 0) + 1))}><Ionicons name="add" size={22} color={Palette.text} /></Pressable>
        </View>

        {/* Note */}
        <Text style={styles.label}>{t('admin.note')}</Text>
        <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="…" placeholderTextColor={Palette.textMute} />

        {err && <Text style={styles.err}>{err}</Text>}
        {msg && <Text style={styles.msg}>{msg}</Text>}

        <GradientBtn label={t('admin.save')} onPress={onSave} disabled={saving || !subjectId} style={{ marginTop: Space.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  label: { ...Type.label, color: Palette.textMute, marginTop: Space.xl, marginBottom: Space.sm },
  seg: { flexDirection: 'row', gap: 4, backgroundColor: Palette.surface2, borderRadius: Radius.pill, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.pill },
  segText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: Palette.textDim },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: 14, height: 44, marginBottom: Space.md },
  search: { flex: 1, fontSize: 15, color: Palette.text },
  subject: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 10 },
  av: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avInit: { color: '#fff', fontSize: 18, fontWeight: '800' },
  subjectName: { fontSize: 15, fontWeight: '800', color: Palette.text },
  subjectSub: { fontSize: 12, color: Palette.textDim, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  chipText: { fontSize: 12, fontWeight: '800', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Palette.text },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 50, height: 50, borderRadius: Radius.md, backgroundColor: Palette.surface2, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  err: { ...Type.small, color: Palette.danger, marginTop: Space.lg },
  msg: { ...Type.body, fontWeight: '700', color: Palette.success, marginTop: Space.lg },
  note: { ...Type.small, color: Palette.textMute },
});
