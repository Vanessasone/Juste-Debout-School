/**
 * Éditer le profil indépendant Juste Debout School.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useCampus } from '@/lib/campus';
import { useI18n } from '@/lib/i18n';
import { pickAndUploadAvatar } from '@/lib/photos';
import { getMyProfile, updateMyProfile } from '@/lib/profile';
import { isSupabaseConfigured } from '@/lib/supabase';

const INK = '#1B1917';
const LEVELS = ['Amateur', 'Confirmé', 'Pro'];
const STYLE_LIST = ['House', 'Popping', 'Locking', 'Hip-Hop', 'Bboying', 'Dancehall', 'Waacking', 'Krump', 'Amapiano', 'Voguing'];

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { accent } = useCampus();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [alias, setAlias] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [level, setLevel] = useState<string | null>(null);
  const [styles_, setStyles] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [available, setAvailable] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        if (p) {
          setFullName(p.full_name ?? '');
          setAlias(p.alias ?? '');
          setCity(p.city ?? '');
          setCountry(p.country ?? '');
          setLevel(p.level ?? null);
          setStyles(p.styles ?? []);
          setBio(p.bio ?? '');
          setInstagram(p.instagram ?? '');
          setAvailable(!!p.available_for_school);
          setPhotoUrl(p.photo_url ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleStyle = (s: string) =>
    setStyles((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const changePhoto = async () => {
    setErr(null);
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar();
      if (url) { await updateMyProfile({ photo_url: url }); setPhotoUrl(url); }
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      await updateMyProfile({
        full_name: fullName.trim() || null,
        alias: alias.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        level,
        styles: styles_,
        bio: bio.trim() || null,
        instagram: instagram.trim() || null,
      });
      // « Dispo pour stages » : la colonne peut ne pas être encore migrée → best-effort.
      try {
        await updateMyProfile({ available_for_school: available });
      } catch {
        /* colonne available_for_school pas encore ajoutée — sans blocage */
      }
      setMsg(t('ep.saved'));
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
        <Pressable accessibilityRole="button" accessibilityLabel="Retour au profil" onPress={() => router.replace('/(tabs)/profile')} hitSlop={10} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('ep.title')}</Text>
        <Wavetruv size={22} tint="#fff" />
      </View>

      {loading ? (
        <ActivityIndicator color={accent} style={{ marginTop: Space.xxxl }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxxl }}>
          <Text style={{color:Palette.textMute,fontSize:13,lineHeight:20,marginBottom:12}}>Les informations de présentation sont facultatives. Elles servent à ton espace School et ne sont pas automatiquement publiées sur le site vitrine.</Text>
          <Pressable accessibilityRole="link" onPress={()=>Linking.openURL('https://justedeboutschoolapp.netlify.app/confidentialite.html')}><Text style={{color:accent,fontSize:13,marginBottom:20}}>Confidentialité et droits sur mes données ↗</Text></Pressable>
          <View style={styles.shared}>
            <Ionicons name="shield-checkmark-outline" size={14} color={Palette.textDim} />
            <Text style={styles.sharedText}>{t('ep.shared')}</Text>
          </View>

          {!isSupabaseConfigured && <Text style={styles.err}>{t('ep.loginNeeded')}</Text>}

          {/* Photo */}
          <View style={styles.photoRow}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: accent }]}>
                <Text style={styles.avatarInit}>{(alias || fullName || '?').charAt(0)}</Text>
              </View>
            )}
            <Pressable style={[styles.photoBtn, { borderColor: accent }]} onPress={changePhoto} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color={accent} /> : <Text style={[styles.photoBtnText, { color: accent }]}>{t('ep.photo')}</Text>}
            </Pressable>
          </View>

          <Text style={styles.label}>{t('ep.name')}</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor={Palette.textMute} />
          <Text style={styles.label}>{t('ep.alias')}</Text>
          <TextInput style={styles.input} value={alias} onChangeText={setAlias} placeholderTextColor={Palette.textMute} autoCapitalize="none" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('ep.city')}</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholderTextColor={Palette.textMute} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('ep.country')}</Text>
              <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholderTextColor={Palette.textMute} />
            </View>
          </View>

          <Text style={styles.label}>{t('ep.level')}</Text>
          <View style={styles.wrap}>{LEVELS.map((l) => <Chip key={l} label={l} on={level === l} onPress={() => setLevel(l)} />)}</View>

          <Text style={styles.label}>{t('ep.styles')}</Text>
          <View style={styles.wrap}>{STYLE_LIST.map((s) => <Chip key={s} label={s} on={styles_.includes(s)} onPress={() => toggleStyle(s)} />)}</View>

          <Text style={styles.label}>{t('ep.bio')}</Text>
          <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} multiline placeholderTextColor={Palette.textMute} />

          <Text style={styles.label}>{t('ep.instagram')}</Text>
          <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} autoCapitalize="none" placeholderTextColor={Palette.textMute} />

          {/* Dispo pour stages */}
          <Pressable style={styles.toggleRow} onPress={() => setAvailable((v) => !v)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>{t('ep.available')}</Text>
              <Text style={styles.toggleHint}>{t('ep.availableHint')}</Text>
            </View>
            <View style={[styles.switch, available && { backgroundColor: accent }]}>
              <View style={[styles.knob, available && { alignSelf: 'flex-end' }]} />
            </View>
          </Pressable>

          {err && <Text style={styles.err}>{err}</Text>}
          {msg && <Text style={styles.msg}>{msg}</Text>}

          <GradientBtn label={t('admin.save')} onPress={save} disabled={saving} />
          <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/profile')} style={{ paddingVertical: 20, alignItems: 'center' }}><Text style={{ color: Palette.text, fontSize: 16, fontWeight: '800' }}>{msg ? 'Terminer et revenir au profil' : 'Retour au profil'}</Text></Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.2 },
  shared: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Palette.surface2, borderRadius: Radius.sm, padding: 10, marginBottom: Space.md },
  sharedText: { flex: 1, ...Type.small, color: Palette.textDim },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: Space.md },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 26, fontWeight: '800' },
  photoBtn: { borderWidth: 1.5, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  photoBtnText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  label: { ...Type.label, color: Palette.textMute, marginTop: Space.md, marginBottom: Space.sm },
  input: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Palette.text },
  row: { flexDirection: 'row', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  chipText: { fontSize: 12, fontWeight: '800', color: Palette.textDim, textTransform: 'uppercase', letterSpacing: 0.3 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, padding: 14, marginTop: Space.lg },
  toggleTitle: { fontSize: 14, fontWeight: '800', color: Palette.text },
  toggleHint: { fontSize: 12, color: Palette.textDim, marginTop: 2 },
  switch: { width: 46, height: 28, borderRadius: 14, backgroundColor: Palette.border, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  err: { ...Type.small, color: Palette.danger, marginTop: Space.md },
  msg: { ...Type.body, fontWeight: '700', color: Palette.success, marginTop: Space.md },
  save: { marginTop: Space.xl, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
});
