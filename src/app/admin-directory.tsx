import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radius, Space } from '@/constants/brand';
import { goBack } from '@/lib/nav';
import { getMyProfile, isAdmin } from '@/lib/profile';
import { DirectoryInput, DirectoryPerson, getPrivateDirectory, importPrivateDirectory, parseDirectoryCsv, verifyDirectoryPerson } from '@/lib/private-directory';

export default function AdminDirectory() {
  const router = useRouter(); const insets = useSafeAreaInsets();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [search, setSearch] = useState('');
  const [campus, setCampus] = useState('ALL');
  const [csv, setCsv] = useState(''); const [preview, setPreview] = useState<DirectoryInput[]>([]);
  const [importing, setImporting] = useState(false); const [showImport, setShowImport] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const load = useCallback(async () => { setPeople(await getPrivateDirectory()); }, []);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ok = isAdmin(await getMyProfile());
        if (!mounted) return;
        setAllowed(ok);
        if (ok) await load();
      } catch { if (mounted) { setAllowed(false); setError('Impossible de vérifier l’accès.'); } }
    })();
    return () => { mounted = false; };
  }, [load]);
  const filtered = useMemo(() => {
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = norm(search.trim());
    return people.filter(p => (campus === 'ALL' || p.campus === campus) && norm([p.first_name,p.last_name,p.email,p.phone,p.cohort,p.file_code].join(' ')).includes(q))
      .sort((a,b) => a.first_name.localeCompare(b.first_name,'fr',{sensitivity:'base'}) || a.last_name.localeCompare(b.last_name,'fr',{sensitivity:'base'}));
  }, [people, search, campus]);
  const analyze = () => { setError(''); setMessage(''); try { setPreview(parseDirectoryCsv(csv)); } catch(e) { setPreview([]); setError(e instanceof Error ? e.message : 'Fichier invalide.'); } };
  const save = async () => {
    setImporting(true); setError('');
    try { await importPrivateDirectory(preview); setMessage(`${preview.length} fiches enregistrées. Aucun compte créé ni email envoyé.`); setPreview([]); setCsv(''); await load(); }
    catch(e) { setError(e instanceof Error ? e.message : 'Import impossible.'); }
    finally { setImporting(false); }
  };
  const verify = async (id: string) => { setVerifying(id); setError(''); try { await verifyDirectoryPerson(id); await load(); } catch { setError('Vérification impossible.'); } finally { setVerifying(null); } };
  if (allowed === null) return <View style={styles.center}><ActivityIndicator color={Palette.core} /></View>;
  if (!allowed) return <View style={styles.center}><Text style={styles.title}>Accès administrateur requis</Text><Text style={styles.body}>Cet annuaire contient des coordonnées privées.</Text><Pressable onPress={() => goBack(router)}><Text style={styles.action}>Retour</Text></Pressable></View>;
  return <View style={{flex:1,backgroundColor:Palette.bg}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:Space.lg,paddingTop:insets.top+Space.lg,paddingBottom:insets.bottom+40,gap:16}}>
      <Pressable accessibilityRole="button" onPress={() => goBack(router)}><Text style={styles.action}>← Administration</Text></Pressable>
      <Text style={styles.title}>Annuaire privé</Text>
      <Text style={styles.body}>Élèves et professeurs · Accès administrateur uniquement. Les fiches restent distinctes des comptes de connexion et des profils publics.</Text>
      <TextInput accessibilityLabel="Rechercher dans l’annuaire privé" placeholder="Prénom, nom, email, promo ou dossier…" value={search} onChangeText={setSearch} style={styles.input}/>
      <View style={{flexDirection:'row',gap:8}}>{['ALL','CORE','INDUSTRY'].map(c => <Pressable key={c} accessibilityRole="button" accessibilityState={{selected:campus===c}} onPress={() => setCampus(c)} style={[styles.chip,campus===c&&styles.selected]}><Text style={{color:campus===c?'#fff':Palette.text,fontWeight:'700'}}>{c==='ALL'?'Tous':c}</Text></Pressable>)}</View>
      <Pressable accessibilityRole="button" onPress={() => setShowImport(!showImport)}><Text style={styles.action}>{showImport?'Fermer l’import':'Importer une liste CSV'}</Text></Pressable>
      {showImport && <View style={styles.card}>
        <Text style={styles.heading}>1. Coller la liste</Text>
        <Text style={styles.body}>En-têtes requis : prenom;nom;campus;type{ '\n' }Optionnels : email;telephone;promo;dossier{ '\n' }Type : student ou teacher. Les imports répétés mettent à jour la même fiche. Ne change pas son campus, sa promo ou son numéro de dossier pour corriger une fiche.</Text>
        <TextInput accessibilityLabel="Contenu CSV à importer" multiline autoCapitalize="none" autoCorrect={false} placeholder="prenom;nom;campus;type;email;telephone;promo;dossier" value={csv} onChangeText={v => {setCsv(v);setPreview([]);setMessage('');}} style={[styles.input,{minHeight:140,textAlignVertical:'top'}]} />
        <Pressable accessibilityRole="button" onPress={analyze} style={styles.button}><Text style={styles.buttonText}>Vérifier et prévisualiser</Text></Pressable>
        {!!preview.length && <>
          <Text style={styles.heading}>2. Vérifier les {preview.length} fiches</Text>
          {preview.slice(0,20).map(p => <Text key={p.external_key} style={styles.body}>{p.first_name} {p.last_name} · {p.campus} · {p.person_type==='student'?'Élève':'Professeur'} · {p.cohort??'Sans promo'}{ '\n' }{p.email??'Sans email'} · {p.phone??'Sans téléphone'}</Text>)}
          {preview.length>20 && <Text style={styles.body}>Aperçu limité aux 20 premières fiches.</Text>}
          <Pressable accessibilityRole="button" disabled={importing} onPress={save} style={styles.button}><Text style={styles.buttonText}>{importing?'Enregistrement…':`Enregistrer ${preview.length} fiches privées`}</Text></Pressable>
        </>}
      </View>}
      {!!error && <Text accessibilityRole="alert" style={{color:Palette.danger}}>{error}</Text>}
      {!!message && <Text accessibilityRole="alert" style={{color:Palette.success}}>{message}</Text>}
      <Text style={styles.heading}>{filtered.length} fiche{filtered.length!==1?'s':''}</Text>
      {!filtered.length && <Text style={styles.body}>{people.length?'Aucun résultat pour cette recherche.':'Aucune fiche privée importée pour le moment.'}</Text>}
      {filtered.map(p => <View key={p.id} style={styles.card}>
        <Text style={styles.heading}>{p.first_name} {p.last_name}</Text>
        <Text style={styles.body}>{p.campus} · {p.person_type==='student'?'Élève':'Professeur'}{p.cohort?` · ${p.cohort}`:''}</Text>
        {!!p.email && <Text selectable style={styles.body}>{p.email}</Text>}
        {!!p.phone && <Text selectable style={styles.body}>{p.phone}</Text>}
        {!!p.file_code && <Text style={styles.body}>Dossier {p.file_code}</Text>}
        <Text style={styles.badge}>{p.review_status==='verified'?'Vérifiée':'À vérifier'}</Text>
        {p.review_status==='pending' && <Pressable accessibilityRole="button" disabled={verifying!==null} onPress={() => verify(p.id)}><Text style={styles.action}>{verifying===p.id?'Enregistrement…':'Marquer cette fiche comme vérifiée'}</Text></Pressable>}
      </View>)}
    </ScrollView>
  </View>;
}
const styles=StyleSheet.create({center:{flex:1,backgroundColor:Palette.bg,alignItems:'center',justifyContent:'center',padding:24,gap:16},title:{fontSize:28,fontWeight:'800',color:Palette.text},heading:{fontSize:17,fontWeight:'700',color:Palette.text},body:{fontSize:14,lineHeight:21,color:Palette.textDim},input:{borderWidth:1,borderColor:Palette.borderStrong,borderRadius:Radius.md,padding:14,backgroundColor:Palette.surface,color:Palette.text},card:{backgroundColor:Palette.surface,borderWidth:1,borderColor:Palette.border,borderRadius:Radius.lg,padding:18,gap:10},action:{color:Palette.industry,fontWeight:'700',fontSize:15},chip:{padding:10,borderRadius:20,backgroundColor:Palette.surface2},selected:{backgroundColor:Palette.industry},button:{padding:15,borderRadius:Radius.md,backgroundColor:Palette.industry,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'700'},badge:{fontSize:12,color:Palette.warning,fontWeight:'700'}});
