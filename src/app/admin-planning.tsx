/**
 * BACK-OFFICE — Créer un cours : ponctuel OU récurrent (hebdomadaire, avec
 * dates de début/fin). Pas de pop-up (web) : confirmation inline.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { createSessions, getSchools, School, SessionInput } from '@/lib/schools';

const INK = '#14101c';
const STYLES = ['House', 'Popping', 'Locking', 'Hip-Hop', 'Bboying', 'Dancehall', 'Waacking', 'Amapiano'];
const LEVELS = ['all', 'beginner', 'inter', 'advanced'];
const KINDS = ['open', 'workshop', 'kids'];
const WEEKDAYS = [
  { lbl: 'Lun', dow: 1 }, { lbl: 'Mar', dow: 2 }, { lbl: 'Mer', dow: 3 }, { lbl: 'Jeu', dow: 4 },
  { lbl: 'Ven', dow: 5 }, { lbl: 'Sam', dow: 6 }, { lbl: 'Dim', dow: 0 },
];

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function AdminPlanning() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { accent } = useCampus();
  const today = new Date();

  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [mode, setMode] = useState<'once' | 'recurring'>('once');
  const [style, setStyle] = useState('House');
  const [level, setLevel] = useState('all');
  const [kind, setKind] = useState('open');
  const [date, setDate] = useState(toYMD(today));
  const [weekday, setWeekday] = useState(2); // mardi
  const [startDate, setStartDate] = useState(toYMD(today));
  const [endDate, setEndDate] = useState(toYMD(new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())));
  const [time, setTime] = useState('19:00');
  const [duration, setDuration] = useState('75');
  const [capacity, setCapacity] = useState('25');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getSchools().then((s) => { setSchools(s); setSchoolId(s[0]?.id ?? null); });
  }, []);

  const kindLabel = (k: string) =>
    k === 'open' ? t('ap.kindOpen') : k === 'workshop' ? t('ap.kindWorkshop') : t('ap.kindKids');

  const onCreate = async () => {
    setErr(null); setMsg(null);
    if (!schoolId) return;
    const tm = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!tm) { setErr(t('ap.time')); return; }
    const h = Number(tm[1]), mi = Number(tm[2]);
    const dur = Number(duration) || 75, cap = Number(capacity) || 25;

    const base = { schoolId, style, level, kind, durationMin: dur, capacity: cap };
    let inputs: SessionInput[] = [];

    if (mode === 'once') {
      const d = parseYMD(date);
      if (!d) { setErr(t('ap.badDate')); return; }
      d.setHours(h, mi, 0, 0);
      inputs = [{ ...base, startsAt: d }];
    } else {
      const s = parseYMD(startDate), e = parseYMD(endDate);
      if (!s || !e) { setErr(t('ap.badDate')); return; }
      if (e < s) { setErr(t('ap.badRange')); return; }
      const cur = new Date(s);
      while (cur.getDay() !== weekday) cur.setDate(cur.getDate() + 1);
      while (cur <= e && inputs.length < 200) {
        const start = new Date(cur);
        start.setHours(h, mi, 0, 0);
        inputs.push({ ...base, startsAt: start });
        cur.setDate(cur.getDate() + 7);
      }
    }

    setSaving(true);
    try {
      const n = await createSessions(inputs);
      setMsg(t('ap.created', { n }));
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}>
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('admin.planning')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        <Text style={styles.label}>{t('ap.mode')}</Text>
        <View style={styles.seg}>
          {(['once', 'recurring'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.segItem, mode === m && { backgroundColor: accent }]}>
              <Text style={[styles.segText, mode === m && { color: '#fff' }]}>{m === 'once' ? t('ap.once') : t('ap.recurring')}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('ap.school')}</Text>
        <View style={styles.wrap}>{schools.map((s) => <Chip key={s.id} label={s.code} on={schoolId === s.id} onPress={() => setSchoolId(s.id)} />)}</View>

        <Text style={styles.label}>{t('ap.style')}</Text>
        <View style={styles.wrap}>{STYLES.map((s) => <Chip key={s} label={s} on={style === s} onPress={() => setStyle(s)} />)}</View>

        <Text style={styles.label}>{t('ap.level')}</Text>
        <View style={styles.wrap}>{LEVELS.map((l) => <Chip key={l} label={t(`level.${l}`)} on={level === l} onPress={() => setLevel(l)} />)}</View>

        <Text style={styles.label}>{t('ap.kind')}</Text>
        <View style={styles.wrap}>{KINDS.map((k) => <Chip key={k} label={kindLabel(k)} on={kind === k} onPress={() => setKind(k)} />)}</View>

        {mode === 'once' ? (
          <>
            <Text style={styles.label}>{t('ap.date')}</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder={t('ap.dateHint')} placeholderTextColor={Palette.textMute} autoCapitalize="none" />
          </>
        ) : (
          <>
            <Text style={styles.label}>{t('ap.weekday')}</Text>
            <View style={styles.wrap}>{WEEKDAYS.map((w) => <Chip key={w.dow} label={w.lbl} on={weekday === w.dow} onPress={() => setWeekday(w.dow)} />)}</View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{t('ap.start')}</Text>
                <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder={t('ap.dateHint')} placeholderTextColor={Palette.textMute} autoCapitalize="none" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{t('ap.end')}</Text>
                <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder={t('ap.dateHint')} placeholderTextColor={Palette.textMute} autoCapitalize="none" />
              </View>
            </View>
          </>
        )}

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('ap.time')}</Text>
            <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="19:00" placeholderTextColor={Palette.textMute} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('ap.duration')}</Text>
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('ap.capacity')}</Text>
            <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
          </View>
        </View>

        {/* Récapitulatif en direct */}
        <View style={styles.recap}>
          <View style={styles.recapIcon}><Ionicons name="calendar" size={18} color={accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recapMain}>{style} · {t(`level.${level}`)} · {kindLabel(kind)}</Text>
            <Text style={styles.recapSub}>
              {mode === 'once' ? date : `${WEEKDAYS.find((w) => w.dow === weekday)?.lbl} · ${startDate} → ${endDate}`} · {time} · {duration}min · {capacity} pl. · {schools.find((s) => s.id === schoolId)?.code ?? '—'}
            </Text>
          </View>
        </View>

        {err && <Text style={styles.err}>{err}</Text>}
        {msg && <Text style={[styles.msg, { color: Palette.success }]}>{msg}</Text>}

        <GradientBtn label={t('admin.create')} onPress={onCreate} disabled={saving || !schoolId} style={{ marginTop: Space.lg }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  label: { ...Type.label, color: Palette.textMute, marginTop: Space.lg, marginBottom: Space.sm },
  seg: { flexDirection: 'row', gap: 4, backgroundColor: Palette.surface2, borderRadius: Radius.pill, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.pill },
  segText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: Palette.textDim },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  chipText: { fontSize: 12, fontWeight: '800', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.3 },
  row: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: Palette.text },
  recap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 14, marginTop: Space.xl },
  recapIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Palette.coreTint, alignItems: 'center', justifyContent: 'center' },
  recapMain: { fontSize: 14.5, fontWeight: '800', color: Palette.text },
  recapSub: { fontSize: 12, fontWeight: '600', color: Palette.textDim, marginTop: 3 },
  err: { ...Type.small, color: Palette.danger, marginTop: Space.lg },
  msg: { ...Type.body, fontWeight: '700', marginTop: Space.lg },
  save: { marginTop: Space.xl, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
});
