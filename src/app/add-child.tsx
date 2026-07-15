/**
 * AJOUTER UN ENFANT — rattache un enfant au compte parent (jds_children).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { CampusCode, gradientFor, Palette, Radius, Space, Type } from '@/constants/brand';
import { addChild } from '@/lib/children';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';

const CAMPUS: CampusCode[] = ['CORE', 'INDUSTRY'];
const LEVELS = ['Kids', 'Junior', 'Ado'];
const STYLE_LIST = ['Hip-Hop Kids', 'Bboying', 'House', 'Popping', 'Locking', 'Dancehall'];

export default function AddChild() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  const [firstName, setFirstName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [campus, setCampus] = useState<CampusCode>('CORE');
  const [level, setLevel] = useState<string | null>('Kids');
  const [styles_, setStyles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleStyle = (s: string) =>
    setStyles((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = async () => {
    if (!firstName.trim()) { setErr(t('ac.needName')); return; }
    setSaving(true);
    setErr(null);
    try {
      const yr = parseInt(birthYear, 10);
      await addChild({
        firstName: firstName.trim(),
        birthYear: Number.isFinite(yr) ? yr : null,
        schoolCode: campus,
        level,
        styles: styles_,
      });
      router.replace('/children');
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.chip, on && { backgroundColor: Palette.core, borderColor: Palette.core }]}>
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <View style={[styles.hdr, { paddingTop: insets.top + Space.sm }]}>
        <Pressable onPress={() => goBack(router)} hitSlop={10}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
        <Text style={styles.title}>{t('ac.title')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        <Text style={styles.label}>{t('ac.firstName')}</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholderTextColor={Palette.textMute} />

        <Text style={styles.label}>{t('ac.birthYear')}</Text>
        <TextInput style={styles.input} value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" maxLength={4} placeholder="2014" placeholderTextColor={Palette.textMute} />

        <Text style={styles.label}>{t('ac.campus')}</Text>
        <View style={styles.wrap}>{CAMPUS.map((c) => <Chip key={c} label={c} on={campus === c} onPress={() => setCampus(c)} />)}</View>

        <Text style={styles.label}>{t('ac.level')}</Text>
        <View style={styles.wrap}>{LEVELS.map((l) => <Chip key={l} label={l} on={level === l} onPress={() => setLevel(l)} />)}</View>

        <Text style={styles.label}>{t('ac.styles')}</Text>
        <View style={styles.wrap}>{STYLE_LIST.map((s) => <Chip key={s} label={s} on={styles_.includes(s)} onPress={() => toggleStyle(s)} />)}</View>

        {err && <Text style={styles.err}>{err}</Text>}

        <View style={{ marginTop: Space.xl }}>
          <GradientBtn label={t('ac.save')} colors={gradientFor(campus)} onPress={save} disabled={saving} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: '#14101c', paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  label: { ...Type.label, color: Palette.textMute, marginTop: Space.md, marginBottom: Space.sm },
  input: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Palette.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  chipText: { fontSize: 12, fontWeight: '800', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.3 },
  err: { ...Type.small, color: Palette.danger, marginTop: Space.md },
});
