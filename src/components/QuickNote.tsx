/**
 * QUICK NOTE — bottom-sheet pour noter une personne en un geste (depuis sa fiche).
 * Type (coloré selon le signe) + réglage rapide de la valeur (−/+) → Enregistrer.
 * Écrit dans le registre de points (addPoints) → alimente les Classements.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space } from '@/constants/brand';
import { success, tap } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n';
import { addPoints, PointKind } from '@/lib/rankings';

const INK = '#14101c';
const KINDS: { kind: PointKind; fr: string; en: string; def: number }[] = [
  { kind: 'attendance', fr: 'Présence', en: 'Attendance', def: 2 },
  { kind: 'lateness', fr: 'Retard', en: 'Lateness', def: -5 },
  { kind: 'absence', fr: 'Absence', en: 'Absence', def: -15 },
  { kind: 'rating', fr: 'Note', en: 'Rating', def: 5 },
  { kind: 'jury', fr: 'Jury', en: 'Jury', def: 10 },
  { kind: 'challenge', fr: 'Défi', en: 'Challenge', def: 10 },
  { kind: 'bonus', fr: 'Bonus', en: 'Bonus', def: 5 },
];

export type NoteSubject = { id: string; name: string; photoUrl: string | null };

export function QuickNote({ visible, subject, color = Palette.core, onClose, onSaved }: {
  visible: boolean;
  subject: NoteSubject | null;
  color?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t, locale } = useI18n();
  const [kind, setKind] = useState<PointKind>('attendance');
  const [value, setValue] = useState(2);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (visible) { setKind('attendance'); setValue(2); setDone(false); }
  }, [visible]);

  const pick = (k: typeof KINDS[number]) => { tap(); setKind(k.kind); setValue(k.def); };
  const bump = (d: number) => { tap(); setValue((v) => v + d); };

  const save = async () => {
    if (!subject) return;
    setSaving(true);
    try {
      await addPoints(subject.id, kind, value);
      success();
      setDone(true);
      setTimeout(() => { onSaved?.(); onClose(); }, 1100);
    } finally {
      setSaving(false);
    }
  };

  const valColor = value < 0 ? '#E24B4A' : value > 0 ? '#3E9E59' : '#fff';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + Space.lg }]} onPress={() => {}}>
          <View style={styles.grab} />

          {subject && (
            <View style={styles.head}>
              {subject.photoUrl ? (
                <Image source={{ uri: subject.photoUrl }} style={styles.av} />
              ) : (
                <LinearGradient colors={[color, color + 'AA'] as const} style={styles.av}><Text style={styles.avInit}>{subject.name.charAt(0)}</Text></LinearGradient>
              )}
              <Text style={styles.name}>{subject.name}</Text>
            </View>
          )}

          {done ? (
            <View style={styles.doneBox}>
              <Ionicons name="checkmark-circle" size={40} color="#3E9E59" />
              <Text style={styles.doneTxt}>{t('qn.saved', { name: subject?.name ?? '' })}</Text>
            </View>
          ) : (
            <>
              <View style={styles.chips}>
                {KINDS.map((k) => {
                  const on = kind === k.kind;
                  const kc = k.def < 0 ? '#E24B4A' : '#3E9E59';
                  return (
                    <Pressable key={k.kind} onPress={() => pick(k)} style={[styles.chip, on && { backgroundColor: kc, borderColor: kc }]}>
                      <Text style={[styles.chipTxt, on && { color: '#fff' }]}>{locale === 'en' ? k.en : k.fr}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => bump(-1)}><Ionicons name="remove" size={26} color="#fff" /></Pressable>
                <Text style={[styles.stepVal, { color: valColor }]}>{value > 0 ? `+${value}` : value}</Text>
                <Pressable style={styles.stepBtn} onPress={() => bump(1)}><Ionicons name="add" size={26} color="#fff" /></Pressable>
              </View>

              <GradientBtn label={t('admin.save')} colors={[color, color] as const} onPress={save} disabled={saving} style={{ marginTop: Space.lg }} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,6,12,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 460, backgroundColor: INK, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: Space.lg, paddingTop: Space.md },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', marginBottom: Space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: Space.lg },
  av: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avInit: { color: '#fff', fontSize: 22, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  chipTxt: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.3 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: Space.xl },
  stepBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepVal: { fontSize: 40, fontWeight: '800', minWidth: 90, textAlign: 'center', letterSpacing: -1 },
  doneBox: { alignItems: 'center', gap: 12, paddingVertical: Space.xl },
  doneTxt: { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
});
