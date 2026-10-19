import {useEffect,useState} from 'react';
import {ActivityIndicator,ScrollView,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {TrainingButton as Button,trainingStyles as s} from '@/components/training/ui';
import {getSchoolAccess,getSchoolResponsibilities,type SchoolResponsibility} from '@/lib/school-access';
import {useAuth} from '@/lib/auth';
import {Palette} from '@/constants/brand';
export default function Responsibilities(){
 const router=useRouter(),insets=useSafeAreaInsets(),{session,initializing}=useAuth();
 const [allowed,setAllowed]=useState<boolean|null>(null),[rows,setRows]=useState<SchoolResponsibility[]>([]),[error,setError]=useState('');
 useEffect(()=>{if(initializing)return;let active=true;(async()=>{try{const access=session?await getSchoolAccess():{admin:false};if(!active)return;setAllowed(access.admin);if(access.admin){const records=await getSchoolResponsibilities();if(active)setRows(records);}}catch{if(active){setAllowed(false);setError('Chargement impossible. Réessaie depuis l’administration.');}}})();return()=>{active=false};},[initializing,session?.user.id]);
 if(allowed===null)return <View style={s.page}><ActivityIndicator style={{marginTop:70}}/></View>;
 return <ScrollView style={s.page} contentContainerStyle={[s.body,{paddingTop:insets.top+20}]}><Button title="← Administration" onPress={()=>router.replace('/admin')}/><Text style={s.title}>Responsables des écoles</Text>{error&&<Text style={{color:Palette.danger}}>{error}</Text>}{!allowed?<Text style={s.text}>Cet écran est réservé à l’administration centrale.</Text>:<><Text style={s.text}>Accès préparés. Les coordonnées seules n’accordent aucun droit. L’activation nécessitera le rattachement explicite d’un compte School vérifié. Aucune invitation n’est envoyée depuis cet écran.</Text>{rows.map(r=><View key={r.id} style={s.card}><Text style={s.heading}>{r.display_name} · {r.title}</Text><Text style={s.text}>{r.campus??'CORE + INDUSTRY'}{ '\n' }{r.email}{ '\n' }{r.enabled?'Accès activé':'Accès préparé · inactif'}</Text></View>)}<Text style={s.heading}>Périmètre de gestion</Text><Text style={s.text}>Les responsables gèrent les fiches, promotions, cours, présences et documents de leur école. La supervision globale couvre les deux écoles. Le calendrier commun, les rôles et le rattachement des comptes restent sous le contrôle de l’administration centrale.</Text></>}</ScrollView>;
}
