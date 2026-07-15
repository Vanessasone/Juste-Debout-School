/**
 * Connexion — même compte que l'app événement Juste Debout (Supabase Auth).
 * Écran atteint uniquement quand Supabase est configuré. Style immersif sombre.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv, Wordmark } from '@/components/Logo';
import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space } from '@/constants/brand';
import { redeemReferral } from '@/lib/referrals';
import { supabase } from '@/lib/supabase';

const INK = '#14101c';
const BRAND_G = ['#FF6A16', '#FF2E7E'] as const;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refCode, setRefCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        // Confirmation d'email activée → pas de session : on informe au lieu de renvoyer sans rien.
        if (!data.session) {
          if (refCode.trim()) await AsyncStorage.setItem('jds_pending_ref', refCode.trim());
          setInfo('Compte créé. Confirme ton email (ou désactive la confirmation dans Supabase), puis connecte-toi.');
          setMode('signin');
          return;
        }
        if (refCode.trim()) { try { await redeemReferral(refCode.trim()); } catch {} }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // Code de parrainage en attente (saisi lors d'une inscription à confirmer).
        try {
          const pending = await AsyncStorage.getItem('jds_pending_ref');
          if (pending) { await redeemReferral(pending); await AsyncStorage.removeItem('jds_pending_ref'); }
        } catch {}
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: INK }}>
      <LinearGradient colors={['rgba(47,64,230,0.4)', 'transparent'] as const} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.glow} pointerEvents="none" />
      <LinearGradient colors={['rgba(255,106,22,0.3)', 'transparent'] as const} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0.8 }} style={styles.glow} pointerEvents="none" />
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + Space.xxxl, paddingBottom: insets.bottom + Space.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}><Wavetruv size={54} tint="#fff" /></View>
        <Wordmark width={210} tint="#fff" />
        <Text style={styles.schoolLabel}>School</Text>
        <Text style={styles.sub}>{mode === 'signin' ? 'Connecte-toi pour réserver tes cours.' : 'Crée ton compte élève.'}</Text>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Mot de passe" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry value={password} onChangeText={setPassword} />
          {mode === 'signup' && (
            <TextInput style={styles.input} placeholder="Code de parrainage (optionnel)" placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="characters" autoCorrect={false} value={refCode} onChangeText={setRefCode} />
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          {busy ? (
            <View style={styles.busy}><ActivityIndicator color="#fff" /></View>
          ) : (
            <GradientBtn label={mode === 'signin' ? 'Se connecter' : 'Créer mon compte'} colors={BRAND_G} onPress={submit} />
          )}

          <Pressable onPress={() => { setError(null); setMode(mode === 'signin' ? 'signup' : 'signin'); }} hitSlop={8}>
            <Text style={styles.swap}>{mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : "J'ai déjà un compte"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  wrap: { flexGrow: 1, paddingHorizontal: Space.lg },
  badge: { width: 84, height: 84, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: Space.lg },
  schoolLabel: { fontSize: 20, fontWeight: '800', letterSpacing: 5, textTransform: 'uppercase', color: '#fff', marginTop: 6 },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.66)', marginTop: Space.sm, lineHeight: 21 },
  form: { marginTop: Space.xxl, gap: Space.md },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: Radius.md, paddingHorizontal: Space.lg, paddingVertical: 15, fontSize: 15, color: '#fff' },
  error: { fontSize: 13, fontWeight: '600', color: '#FF7A7A' },
  info: { fontSize: 13, fontWeight: '600', color: '#8CFF7A', lineHeight: 18 },
  busy: { paddingVertical: 16, alignItems: 'center' },
  swap: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: Space.md, fontWeight: '600' },
});
