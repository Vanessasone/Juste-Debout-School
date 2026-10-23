import {schoolWebUrl} from '@/lib/school-web-links';
/**
 * Connexion — compte indépendant Juste Debout School.
 * Écran atteint uniquement quand Supabase est configuré. Style immersif sombre.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
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
import {schoolAuthError} from '@/lib/auth-messages';

const INK = '#14101c';
const BRAND_G = ['#FF6A16', '#FF2E7E'] as const;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'confirm'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName,setFullName]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [refCode, setRefCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    if(busy)return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Renseigne une adresse email valide.');
      if(mode==='confirm'){
        const {error}=await supabase.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:schoolWebUrl('/')}});
        if(error)throw error;
        setInfo('Si cette adresse correspond à une inscription en attente, un nouveau lien de confirmation va être envoyé. Vérifie aussi les courriers indésirables.');return;
      }
      if(mode==='reset') {
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:schoolWebUrl('/update-password')});
        if(error) throw error;
        setInfo('Si un compte correspond à cette adresse, un lien de réinitialisation va être envoyé. Vérifie aussi les courriers indésirables.');return;
      }
      if (mode === 'signup') {
        if(!fullName.trim()) throw new Error('Renseigne ton prénom et ton nom.');
        if(password!==confirmation) throw new Error('Les mots de passe ne correspondent pas.');
        if(password.length<8) throw new Error('Choisis un mot de passe d’au moins 8 caractères.');
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data:{full_name:fullName.trim()}, emailRedirectTo: schoolWebUrl('/') } });
        if (error) throw error;
        // Confirmation d'email activée → pas de session : on informe au lieu de renvoyer sans rien.
        if (!data.session) {
          if (refCode.trim()) await AsyncStorage.setItem('jds_pending_ref', refCode.trim());
          setPassword('');setConfirmation('');
          setInfo('Vérifie ta boîte email pour confirmer ton inscription. Si tu as déjà un compte, connecte-toi ou utilise « Mot de passe oublié ».');
          setMode('signin');
          return;
        }
        if (refCode.trim()) { try { await redeemReferral(refCode.trim()); } catch {} }
      } else {
        if(!password)throw new Error('Renseigne ton mot de passe School.');
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
      setError(schoolAuthError(e));
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
        <Text style={styles.sub}>{mode === 'signin' ? 'Retrouve ton espace Juste Debout School.' : mode==='reset'?'Reçois un lien pour choisir un nouveau mot de passe.':mode==='confirm'?'Demande un nouveau lien de confirmation d’email.':'Crée ton compte School.'}</Text>

        <Text style={styles.help}>Ton compte School est indépendant des applications Juste Debout et TOTF. Un compte billetterie ne crée pas automatiquement de compte School.</Text>
        <View style={styles.form}>
          <TextInput style={styles.input} accessibilityLabel="Email" placeholder="Email" placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy} keyboardType="email-address" value={email} onChangeText={setEmail} />
          {mode==='signup'&&<TextInput accessibilityLabel="Prénom et nom" style={styles.input} placeholder="Prénom et nom" placeholderTextColor="rgba(255,255,255,0.4)" value={fullName} onChangeText={setFullName}/>}
          {(mode==='signin'||mode==='signup')&&<TextInput accessibilityLabel="Mot de passe" style={styles.input} placeholder="Mot de passe" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChangeText={setPassword} />}
          {mode==='signup'&&<><TextInput accessibilityLabel="Confirmer le mot de passe" style={styles.input} placeholder="Confirmer le mot de passe" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} value={confirmation} onChangeText={setConfirmation}/><Text style={styles.help}>8 caractères minimum. L’équipe vérifiera séparément ton rattachement à une promotion.</Text></>}
          {mode === 'signup' && (
            <TextInput style={styles.input} placeholder="Code de parrainage (optionnel)" placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="characters" autoCorrect={false} value={refCode} onChangeText={setRefCode} />
          )}
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Text style={styles.help}>Ton email et ton identité servent à gérer ton compte School. Les champs complémentaires du profil sont facultatifs. La création du compte ne t’abonne pas à une newsletter commerciale.</Text>
          <Pressable accessibilityRole="link" onPress={()=>Linking.openURL(schoolWebUrl('/confidentialite.html'))}><Text style={styles.swap}>Confidentialité et droits sur mes données ↗</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={()=>Linking.openURL(schoolWebUrl('/mentions-legales.html'))}><Text style={styles.swap}>Mentions légales ↗</Text></Pressable>
          {info && <Text accessibilityRole="alert" style={styles.info}>{info}</Text>}

          {busy ? (
            <View style={styles.busy}><ActivityIndicator color="#fff" /></View>
          ) : (
            <GradientBtn label={mode === 'signin' ? 'Se connecter' : mode==='reset'?'Recevoir le lien':mode==='confirm'?'Renvoyer la confirmation':'Créer mon compte'} colors={BRAND_G} onPress={submit} />
          )}

          {mode==='signin'&&<Pressable disabled={busy} accessibilityRole="button" onPress={()=>{setMode('reset');setError(null);setInfo(null);}}><Text style={styles.swap}>Mot de passe oublié ?</Text></Pressable>}
          {mode==='signin'&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setMode('confirm');setPassword('');setConfirmation('');setError(null);setInfo(null);}}><Text style={styles.swap}>Email de confirmation non reçu ?</Text></Pressable>}
          <Pressable disabled={busy} accessibilityRole="button" onPress={() => { setPassword('');setConfirmation('');setError(null); setInfo(null); setMode(mode === 'signin' ? 'signup' : 'signin'); }} hitSlop={8}>
            <Text style={styles.swap}>{mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : 'Retour à la connexion'}</Text>
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
  help: {fontSize:12,color:'rgba(255,255,255,0.64)',lineHeight:18,marginTop:12},
  error: { fontSize: 13, fontWeight: '600', color: '#FF7A7A' },
  info: { fontSize: 13, fontWeight: '600', color: '#8CFF7A', lineHeight: 18 },
  busy: { paddingVertical: 16, alignItems: 'center' },
  swap: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: Space.md, fontWeight: '600' },
});
