/**
 * BACK-OFFICE — Fiches profs / danseurs (le vivier UNIQUE).
 * Roster filtrable (population + recherche) en cartes colorées + formulaire
 * d'ajout repliable. Ces fiches alimentent : votes, profs de cours, classements.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { QuickNote } from '@/components/QuickNote';
import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { createTeacher, getTeachers, Teacher, updateTeacherPhoto } from '@/lib/people';
import { pickAndUploadTeacher } from '@/lib/photos';
import { Population } from '@/lib/rankings';
import { getSchools, School } from '@/lib/schools';
import { isSupabaseConfigured } from '@/lib/supabase';

const INK = '#14101c';
const POPS: Population[] = ['open_teacher', 'formation_teacher', 'formation_student'];
const POP_COLOR: Record<Population, string> = {
  open_teacher: '#FF6A16',
  formation_teacher: '#2F40E6',
  formation_student: '#7C3AED',
};

export default function AdminPeople() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Population | 'all'>('all');
  const [q, setQ] = useState('');

  const [name, setName] = useState('');
  const [styles_, setStyles] = useState('');
  const [insta, setInsta] = useState('');
  const [population, setPopulation] = useState<Population>('open_teacher');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<Teacher | null>(null);

  const load = useCallback(async () => {
    const rows = await getTeachers();
    setTeachers(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    getSchools().then(setSchools);
  }, [load]);

  const popLabel = (p: Population) =>
    p === 'open_teacher' ? t('rankings.openTeachers')
      : p === 'formation_teacher' ? t('rankings.formationTeachers')
        : t('rankings.students');
  const popShort = (p: Population) =>
    p === 'open_teacher' ? t('people.openShort')
      : p === 'formation_teacher' ? t('people.formationShort')
        : t('people.studentShort');

  const filtered = useMemo(() => {
    const low = q.trim().toLowerCase();
    return teachers.filter((tt) => {
      if (filter !== 'all' && tt.population !== filter) return false;
      if (low && !(tt.name.toLowerCase().includes(low) || tt.styles.some((s) => s.toLowerCase().includes(low)))) return false;
      return true;
    });
  }, [teachers, filter, q]);

  const onCreate = async () => {
    if (name.trim().length === 0) return;
    setSaving(true); setErr(null);
    try {
      const styleArr = styles_.split(',').map((s) => s.trim()).filter(Boolean);
      await createTeacher({ name: name.trim(), styles: styleArr, instagram: insta.trim() || undefined, population, schoolId });
      setName(''); setStyles(''); setInsta('');
      setShowForm(false);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (id: string) => {
    setErr(null);
    if (!isSupabaseConfigured) { setErr(t('admin.demoNote')); return; }
    setUploading(id);
    try {
      const url = await pickAndUploadTeacher(id);
      if (url) { await updateTeacherPhoto(id, url); await load(); }
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
    } finally {
      setUploading(null);
    }
  };

  const Chip = ({ label, on, color, onPress }: { label: string; on: boolean; color?: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.chip, on && { backgroundColor: color ?? Palette.core, borderColor: color ?? Palette.core }]}>
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );

  const FILTERS: { key: Population | 'all'; label: string; color?: string }[] = [
    { key: 'all', label: t('people.all') },
    { key: 'open_teacher', label: t('people.openShort'), color: POP_COLOR.open_teacher },
    { key: 'formation_teacher', label: t('people.formationShort'), color: POP_COLOR.formation_teacher },
    { key: 'formation_student', label: t('people.studentShort'), color: POP_COLOR.formation_student },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('people.title')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }} keyboardShouldPersistTaps="handled">
        {/* Ajouter (repliable) */}
        <Pressable style={styles.addToggle} onPress={() => setShowForm((v) => !v)}>
          <Ionicons name={showForm ? 'remove-circle' : 'add-circle'} size={20} color={Palette.core} />
          <Text style={styles.addToggleTxt}>{t('people.addToggle')}</Text>
          <Ionicons name={showForm ? 'chevron-up' : 'chevron-down'} size={16} color={Palette.textMute} style={{ marginLeft: 'auto' }} />
        </Pressable>

        {showForm && (
          <View style={styles.form}>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('people.name')} placeholderTextColor={Palette.textMute} />
            <Text style={styles.label}>{t('people.population')}</Text>
            <View style={styles.wrap}>{POPS.map((p) => <Chip key={p} label={popLabel(p)} color={POP_COLOR[p]} on={population === p} onPress={() => setPopulation(p)} />)}</View>
            <Text style={styles.label}>{t('people.school')}</Text>
            <View style={styles.wrap}>
              {schools.map((s) => <Chip key={s.id} label={s.code} on={schoolId === s.id} onPress={() => setSchoolId(s.id)} />)}
              <Chip label={t('campus.network')} on={schoolId === null} onPress={() => setSchoolId(null)} />
            </View>
            <TextInput style={[styles.input, { marginTop: Space.md }]} value={styles_} onChangeText={setStyles} placeholder={t('people.styles')} placeholderTextColor={Palette.textMute} />
            <TextInput style={styles.input} value={insta} onChangeText={setInsta} placeholder={t('people.instagram')} placeholderTextColor={Palette.textMute} autoCapitalize="none" />
            <GradientBtn label={t('admin.create')} onPress={onCreate} disabled={saving || !name.trim()} style={{ marginTop: Space.md }} />
          </View>
        )}
        {err && <Text style={styles.err}>{err}</Text>}

        {/* Filtres */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} color={f.color} on={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </View>

        {/* Recherche */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Palette.textMute} />
          <TextInput style={styles.search} value={q} onChangeText={setQ} placeholder={t('people.search')} placeholderTextColor={Palette.textMute} autoCorrect={false} />
          {q.length > 0 && <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={Palette.textMute} /></Pressable>}
        </View>

        <Text style={styles.count}>{t('people.count', { n: filtered.length })}</Text>

        {loading ? (
          <ActivityIndicator color={Palette.core} style={{ marginTop: Space.lg }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.note}>{t('people.empty')}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((tt) => {
              const color = POP_COLOR[tt.population];
              return (
                <View key={tt.id} style={styles.person}>
                  {tt.photoUrl ? (
                    <Image source={{ uri: tt.photoUrl }} style={styles.av} />
                  ) : (
                    <LinearGradient colors={[color, color + 'AA'] as const} style={styles.av}>
                      <Text style={styles.avInit}>{tt.name.charAt(0)}</Text>
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pName}>{tt.name}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: color + '22' }]}><Text style={[styles.badgeTxt, { color }]}>{popShort(tt.population)}</Text></View>
                      <Text style={styles.pSchool}>{tt.schoolCode ?? t('campus.network')}</Text>
                    </View>
                    {tt.styles.length > 0 && (
                      <View style={styles.styleRow}>
                        {tt.styles.map((s) => <View key={s} style={styles.stylePill}><Text style={styles.stylePillTxt}>{s}</Text></View>)}
                      </View>
                    )}
                  </View>
                  <Pressable style={[styles.noteBtn, { backgroundColor: color + '22' }]} onPress={() => setNoteFor(tt)}>
                    <Ionicons name="ribbon" size={17} color={color} />
                    <Text style={[styles.noteBtnTxt, { color }]}>{t('people.noteBtn')}</Text>
                  </Pressable>
                  <Pressable style={styles.photoBtn} onPress={() => onPhoto(tt.id)} disabled={uploading === tt.id}>
                    {uploading === tt.id ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={tt.photoUrl ? 'camera' : 'camera-outline'} size={18} color={color} />}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <QuickNote
        visible={!!noteFor}
        subject={noteFor ? { id: noteFor.id, name: noteFor.name, photoUrl: noteFor.photoUrl } : null}
        color={noteFor ? POP_COLOR[noteFor.population] : Palette.core}
        onClose={() => setNoteFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },

  addToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: 14, paddingVertical: 13 },
  addToggleTxt: { fontSize: 14, fontWeight: '800', color: Palette.text, textTransform: 'uppercase', letterSpacing: 0.2 },
  form: { marginTop: Space.md, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Space.md },
  label: { ...Type.label, color: Palette.textMute, marginTop: Space.md, marginBottom: Space.sm },
  input: { backgroundColor: Palette.bg, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Palette.text, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  chipText: { fontSize: 12, fontWeight: '800', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.3 },
  err: { ...Type.small, color: Palette.danger, marginTop: Space.sm },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Space.xl },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: 14, height: 46, marginTop: Space.md },
  search: { flex: 1, fontSize: 15, color: Palette.text },
  count: { ...Type.label, color: Palette.textMute, marginTop: Space.md, marginBottom: Space.sm },
  note: { ...Type.small, color: Palette.textMute },

  person: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 12 },
  av: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avInit: { color: '#fff', fontSize: 20, fontWeight: '800' },
  pName: { fontSize: 16, fontWeight: '800', color: Palette.text },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  pSchool: { fontSize: 11, fontWeight: '700', color: Palette.textMute, textTransform: 'uppercase', letterSpacing: 0.3 },
  styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  stylePill: { backgroundColor: Palette.surface2, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  stylePillTxt: { fontSize: 11, fontWeight: '700', color: Palette.textDim },
  noteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 8 },
  noteBtnTxt: { fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  photoBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Palette.surface2, alignItems: 'center', justifyContent: 'center' },
});
