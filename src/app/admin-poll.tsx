/**
 * BACK-OFFICE — Créer un vote communautaire.
 * Les candidats sont CHOISIS parmi les fiches profs/danseurs (avec photo).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { getTeachers, Teacher } from '@/lib/people';
import { createPoll } from '@/lib/polls';

const INK = '#14101c';
const VOTE = '#FF2E7E';

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function AdminPoll() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  const [question, setQuestion] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [cq, setCq] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const now = new Date();
  const [startDate, setStartDate] = useState(toYMD(now));
  const [endDate, setEndDate] = useState(toYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14)));

  useEffect(() => {
    // Candidats = profs/danseurs (pas les élèves de formation)
    getTeachers().then((all) => setTeachers(all.filter((tt) => tt.population !== 'formation_student')));
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const ready = question.trim().length > 0 && selected.length >= 2;
  const filtered = useMemo(() => {
    const low = cq.trim().toLowerCase();
    return low ? teachers.filter((tt) => tt.name.toLowerCase().includes(low) || tt.styles.some((s) => s.toLowerCase().includes(low))) : teachers;
  }, [teachers, cq]);

  const onCreate = async () => {
    if (!ready) return;
    const start = parseYMD(startDate);
    const end = parseYMD(endDate);
    if (!start || !end) { setErr(t('ap.badDate')); return; }
    if (end < start) { setErr(t('ap.badRange')); return; }
    end.setHours(23, 59, 59, 0); // la fin inclut toute la journée
    setSaving(true);
    setErr(null);
    try {
      const cands = teachers
        .filter((tt) => selected.includes(tt.id))
        .map((tt) => ({ name: tt.name, photoUrl: tt.photoUrl, subtitle: tt.styles.join(' · ') || null }));
      await createPoll(question.trim(), subtitle.trim() || null, cands, { startsAt: start, endsAt: end });
      goBack(router);
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('admin.poll')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        <Text style={styles.label}>{t('admin.question')}</Text>
        <TextInput
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="Qui veux-tu voir en stage ?"
          placeholderTextColor={Palette.textMute}
          multiline
        />

        <Text style={styles.label}>{t('admin.note')}</Text>
        <TextInput
          style={styles.input}
          value={subtitle}
          onChangeText={setSubtitle}
          placeholder="…"
          placeholderTextColor={Palette.textMute}
        />

        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('ap.start')}</Text>
            <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder={t('ap.dateHint')} placeholderTextColor={Palette.textMute} autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('ap.end')}</Text>
            <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder={t('ap.dateHint')} placeholderTextColor={Palette.textMute} autoCapitalize="none" />
          </View>
        </View>

        <View style={styles.pickHead}>
          <Text style={styles.label}>{t('poll.pickCandidates')}</Text>
          <Pressable onPress={() => router.push('/admin-people')}>
            <Text style={[styles.manage, { color: VOTE }]}>{t('poll.manage')}</Text>
          </Pressable>
        </View>

        {selected.length > 0 && (
          <View style={[styles.countPill, { backgroundColor: VOTE + '22' }]}>
            <Ionicons name="people" size={13} color={VOTE} />
            <Text style={[styles.countTxt, { color: VOTE }]}>{t('poll.selected', { n: selected.length })}</Text>
          </View>
        )}

        {teachers.length === 0 ? (
          <Text style={styles.note}>{t('poll.noPeople')}</Text>
        ) : (
          <>
            {teachers.length > 6 && (
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={17} color={Palette.textMute} />
                <TextInput style={styles.search} value={cq} onChangeText={setCq} placeholder={t('people.search')} placeholderTextColor={Palette.textMute} autoCorrect={false} />
              </View>
            )}
            <View style={{ gap: 8 }}>
              {filtered.map((tt) => {
                const on = selected.includes(tt.id);
                return (
                  <Pressable key={tt.id} onPress={() => toggle(tt.id)} style={[styles.person, on && { borderColor: VOTE, borderWidth: 2 }]}>
                    {tt.photoUrl ? (
                      <Image source={{ uri: tt.photoUrl }} style={styles.av} />
                    ) : (
                      <View style={[styles.av, styles.avFallback, { backgroundColor: VOTE }]}>
                        <Text style={styles.avInit}>{tt.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pName}>{tt.name}</Text>
                      {tt.styles.length > 0 && <Text style={styles.pSub}>{tt.styles.join(' · ')}</Text>}
                    </View>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? VOTE : Palette.textMute} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {err && <Text style={styles.err}>{err}</Text>}

        <GradientBtn label={t('admin.create')} onPress={onCreate} disabled={saving || !ready} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  label: { ...Type.label, color: Palette.textMute, marginTop: Space.xl, marginBottom: Space.sm },
  input: {
    backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Palette.text,
  },
  dateRow: { flexDirection: 'row', gap: 10 },
  pickHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  manage: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: Space.xl },
  note: { ...Type.small, color: Palette.textMute, marginTop: 4 },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 5, marginBottom: Space.sm },
  countTxt: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: 14, height: 44, marginBottom: Space.md },
  search: { flex: 1, fontSize: 15, color: Palette.text },
  person: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.border, padding: 10,
  },
  av: { width: 44, height: 44, borderRadius: 12 },
  avFallback: { alignItems: 'center', justifyContent: 'center' },
  avInit: { color: '#fff', fontSize: 18, fontWeight: '800' },
  pName: { fontSize: 15, fontWeight: '800', color: Palette.text },
  pSub: { fontSize: 12, color: Palette.textDim, marginTop: 2 },
  err: { ...Type.small, color: Palette.danger, marginTop: Space.lg },
  save: { marginTop: Space.xxl, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
});
