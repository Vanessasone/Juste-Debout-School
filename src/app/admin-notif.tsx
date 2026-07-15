/**
 * BACK-OFFICE — Envoyer une notification aux élèves (absence, remplacement, info).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { goBack } from '@/lib/nav';
import { NotifKind, sendNotification } from '@/lib/notifications';
import { getSchools, School } from '@/lib/schools';

const INK = '#14101c';
const KINDS: NotifKind[] = ['info', 'absence', 'replacement'];
const KIND_META: Record<NotifKind, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  info: { color: '#2F40E6', icon: 'information-circle' },
  absence: { color: '#E24B4A', icon: 'close-circle' },
  replacement: { color: '#E8A200', icon: 'swap-horizontal' },
  reminder: { color: '#3E9E59', icon: 'alarm' },
};

export default function AdminNotif() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null); // null = toutes
  const [kind, setKind] = useState<NotifKind>('info');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { getSchools().then(setSchools); }, []);

  const kindLabel = (k: NotifKind) =>
    k === 'info' ? t('notif.kindInfo') : k === 'absence' ? t('notif.kindAbsence') : t('notif.kindReplace');

  const pickKind = (k: NotifKind) => {
    setKind(k);
    if (!title && !body) {
      if (k === 'absence') { setTitle('Cours annulé'); setBody('Le cours de … est annulé — le prof est absent. Désolé pour la gêne !'); }
      if (k === 'replacement') { setTitle('Remplacement'); setBody('… remplace pour le cours de … .'); }
    }
  };

  const onSend = async () => {
    setErr(null); setMsg(null);
    if (title.trim().length === 0 || body.trim().length === 0) { setErr(t('notif.msgTitle')); return; }
    setSaving(true);
    try {
      await sendNotification({ schoolId, kind, title: title.trim(), body: body.trim() });
      setMsg(t('admin.saved'));
      setTitle(''); setBody('');
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
        <Pressable onPress={() => goBack(router)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('admin.notif')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
        <Text style={styles.label}>{t('notif.audience')}</Text>
        <View style={styles.wrap}>
          <Chip label={t('planning.all')} on={schoolId === null} onPress={() => setSchoolId(null)} />
          {schools.map((s) => <Chip key={s.id} label={s.code} on={schoolId === s.id} onPress={() => setSchoolId(s.id)} />)}
        </View>

        <Text style={styles.label}>{t('notif.kind')}</Text>
        <View style={styles.wrap}>
          {KINDS.map((k) => {
            const on = kind === k;
            const meta = KIND_META[k];
            return (
              <Pressable key={k} onPress={() => pickKind(k)} style={[styles.kindChip, on && { backgroundColor: meta.color, borderColor: meta.color }]}>
                <Ionicons name={meta.icon} size={15} color={on ? '#fff' : meta.color} />
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{kindLabel(k)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>{t('notif.msgTitle')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="…" placeholderTextColor={Palette.textMute} />

        <Text style={styles.label}>{t('notif.msgBody')}</Text>
        <TextInput style={[styles.input, { height: 110, textAlignVertical: 'top' }]} value={body} onChangeText={setBody} placeholder="…" placeholderTextColor={Palette.textMute} multiline />

        {/* Aperçu en direct */}
        <Text style={styles.label}>{t('notif.preview')}</Text>
        <View style={styles.preview}>
          <View style={[styles.previewIcon, { backgroundColor: KIND_META[kind].color + '22' }]}>
            <Ionicons name={KIND_META[kind].icon} size={20} color={KIND_META[kind].color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewTitle}>{title.trim() || t('notif.msgTitle')}</Text>
            <Text style={styles.previewBody}>{body.trim() || t('notif.msgBody')}</Text>
          </View>
        </View>

        {err && <Text style={styles.err}>{err}</Text>}
        {msg && <Text style={styles.msg}>{msg}</Text>}

        <GradientBtn label={t('notif.send')} onPress={onSend} disabled={saving || !title.trim() || !body.trim()} style={{ marginTop: Space.lg }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  label: { ...Type.label, color: Palette.textMute, marginTop: Space.lg, marginBottom: Space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  kindChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  chipText: { fontSize: 12, fontWeight: '800', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Palette.text },
  preview: { flexDirection: 'row', gap: 12, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: 14 },
  previewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewTitle: { fontSize: 15, fontWeight: '800', color: Palette.text },
  previewBody: { fontSize: 13, color: Palette.textDim, marginTop: 3, lineHeight: 18 },
  err: { ...Type.small, color: Palette.danger, marginTop: Space.lg },
  msg: { ...Type.body, fontWeight: '700', color: Palette.success, marginTop: Space.lg },
});
