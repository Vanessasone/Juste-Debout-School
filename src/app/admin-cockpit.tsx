import {useCallback,useState} from 'react';
import {useFocusEffect,useRouter} from 'expo-router';
import {ActivityIndicator,Linking,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {TrainingButton as Button,TrainingField as Field} from '@/components/training/ui';
import {Palette,Radius} from '@/constants/brand';
import {useAuth} from '@/lib/auth';
import {parisDay,slotTime} from '@/lib/rental-calendar';
import {getSchoolCockpit,cockpitActionLabels,cockpitActionPath,type CockpitData,type CockpitAction} from '@/lib/school-cockpit';
import {schoolWebUrl} from '@/lib/school-web-links';

const buckets=[['decision','À valider'],['complete','À compléter'],['review','À consulter'],['draft','Brouillons et prévisions']] as const;
const detailLabels:Record<string,string>={teacher:'Professeurs',student:'Élèves',team:'Équipe',open:'Cours open',missing:'Compte à créer',unconfirmed:'Email à confirmer',ready:'Prêt à activer'};

export default function SchoolCockpit(){
 const router=useRouter(),insets=useSafeAreaInsets(),{session,initializing}=useAuth();
 const [data,setData]=useState<CockpitData|null>(null),[campus,setCampus]=useState(''),[group,setGroup]=useState(''),[term,setTerm]=useState(1),[date,setDate]=useState(parisDay),[shownDate,setShownDate]=useState(parisDay),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[bucket,setBucket]=useState('decision');
 useFocusEffect(useCallback(()=>{let live=true;setLoading(true);setError('');if(initializing)return()=>{live=false};if(!session){setLoading(false);setData(null);return()=>{live=false};}
  getSchoolCockpit(campus,group,term,shownDate).then(r=>{if(live)setData(r);}).catch(e=>{if(live){setData(null);setError(e instanceof Error?e.message:'Chargement impossible.');}}).finally(()=>{if(live)setLoading(false);});return()=>{live=false};
 },[session?.user.id,initializing,campus,group,term,shownDate,revision]));
 function open(path:string){if(path.split('?')[0].endsWith('.html'))void Linking.openURL(schoolWebUrl(path));else router.push(path as never);}
 function actionTitle(a:CockpitAction){return cockpitActionLabels[a.key]||a.key;}
 const visibleGroups=data?.groups.filter(g=>!campus||g.campus===campus)??[];
 const total=(key:string)=>data?.actions.filter(a=>a.key===key).reduce((n,a)=>n+Number(a.count),0)??0;
 const actions=data?.actions.filter(a=>a.bucket===bucket&&a.count>0)??[];
 return <View style={s.page}><ScrollView contentContainerStyle={[s.body,{paddingTop:insets.top+24}]}>
  <View style={s.top}><View style={{flex:1}}><Text style={s.kicker}>CORE & INDUSTRY</Text><Text style={s.title}>Cockpit School</Text><Text style={s.subtitle}>{data?`Bonjour ${data.name}. Ta vue de gestion des écoles.`:'Direction et administration des écoles'}</Text></View><Button title="Mon espace" onPress={()=>router.push('/(tabs)/profile')}/></View>
  {!initializing&&!session?<View style={s.card}><Text style={s.heading}>Connexion School requise</Text><Text style={s.text}>Connecte-toi avec ton compte de direction ou d’administration pour ouvrir le cockpit.</Text><Button title="Me connecter" onPress={()=>router.push('/login')}/></View>:<>
  <View style={s.filters}><View style={s.row}><Button title="Les deux écoles" selected={!campus} disabled={loading} onPress={()=>{setCampus('');setGroup('');}}/>{(data?.campuses??['CORE','INDUSTRY']).map(c=><Button key={c} title={c} selected={campus===c} disabled={loading} onPress={()=>{setCampus(c);setGroup('');}}/>)}</View>
  <View style={s.row}><Button title="Toutes les promotions" selected={!group} disabled={loading} onPress={()=>setGroup('')}/>{visibleGroups.map(g=><Button key={g.id} title={`${g.campus} ${g.name}`} selected={group===g.id} disabled={loading} onPress={()=>setGroup(g.id)}/>)}</View>
  <View style={s.row}>{[1,2,3].map(t=><Button key={t} title={`Trimestre ${t}`} selected={term===t} disabled={loading} onPress={()=>setTerm(t)}/>)}</View></View>
  {!!error&&<View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Réessayer" onPress={()=>setRevision(n=>n+1)}/></View>}
  {loading?<ActivityIndicator accessibilityLabel="Chargement du cockpit" size="large" color={Palette.core}/>:data&&<>
   <View style={s.top}><Text style={s.text}>Actualisé à {slotTime(data.generated_at)} · heure de Paris</Text><Button title="Actualiser" onPress={()=>setRevision(n=>n+1)}/></View>
   <View style={s.metrics}>{[{label:'Demandes d’accès',value:total('access'),key:'access'},{label:'Absences à vérifier',value:total('absences'),key:'absences'},{label:'Élèves dans les promotions',value:data.members,key:'members'},{label:'Bulletins publiés · trimestre',value:data.published_bulletins,key:'summaries'}].map(m=><Pressable key={m.label} accessibilityRole="button" accessibilityLabel={`${m.label} : ${m.value}`} style={s.metric} onPress={()=>{const a=data.actions.find(a=>a.key===m.key);a?open(cockpitActionPath(a,term)):open(m.key==='summaries'?'/bulletins.html?term='+term:'/admin-training');}}><Text style={s.value}>{m.value}</Text><Text style={s.text}>{m.label}</Text></Pressable>)}</View>
   <Text style={s.heading}>Le point sur les dossiers</Text><View style={s.row}>{buckets.map(([id,label])=><Button key={id} title={label} selected={bucket===id} onPress={()=>setBucket(id)}/>)}</View>
   {bucket==='draft'&&<Text style={s.text}>Ces préparations ne sont pas des validations en retard. Elles restent privées jusqu’à publication.</Text>}
   {!actions.length&&<View style={s.card}><Text style={s.text}>Aucun élément dans cette catégorie pour les filtres choisis.</Text></View>}
   {actions.map((a,i)=>{const g=data.groups.find(g=>g.id===a.group_id);return <Pressable key={`${a.key}-${a.campus}-${a.group_id}-${a.detail}-${i}`} accessibilityRole="button" onPress={()=>open(cockpitActionPath(a,term))} style={s.action}><Text style={s.count}>{a.count}</Text><View style={{flex:1,gap:4}}><Text style={s.actionTitle}>{actionTitle(a)}</Text><Text style={s.text}>{[a.campus||'Calendrier commun',g?.name,g?.season,detailLabels[a.detail]].filter(Boolean).join(' · ')}</Text></View><Text style={s.arrow}>↗</Text></Pressable>;})}
   <View style={s.top}><Text style={s.heading}>La journée</Text><Text style={s.text}>{data.agenda.length} cours publié(s)</Text></View><View style={s.date}><Field label="Date à consulter (AAAA-MM-JJ)" value={date} onChange={setDate}/><Button title="Afficher" disabled={!/^\d{4}-\d{2}-\d{2}$/.test(date)} onPress={()=>setShownDate(date)}/></View>
   {!data.agenda.length&&<Text style={s.text}>Aucun cours publié dans l’application pour cette journée et ces filtres.</Text>}
   {data.agenda.map(a=><Pressable key={a.id} accessibilityRole="button" style={s.card} onPress={()=>open(a.group_id?`/admin-training?group=${a.group_id}&tab=planning`:'/admin-planning')}><Text style={s.actionTitle}>{slotTime(a.starts_at)}–{slotTime(a.ends_at)} · {a.title}</Text><Text style={s.text}>{[a.campus,data.groups.find(g=>g.id===a.group_id)?.name,a.teacher,a.room].filter(Boolean).join(' · ')}</Text></Pressable>)}
   <Text style={s.heading}>Gérer les écoles</Text>
   <View style={s.modules}>{[
    {title:'Élèves et promotions',sub:'Dossiers, rattachements, plannings et documents',path:'/admin-training'},
    {title:'Professeurs et équipe',sub:'Comptes, fonctions et demandes d’accès',path:'/school-role.html'},
    {title:'Bulletins et matières',sub:'Coefficients, cours réalisés, évaluations et publications',path:'/bulletins.html?term='+term},
    {title:'Absences et justificatifs',sub:'Déclarations à examiner dans leur espace protégé',path:'/absences'},
    {title:'Assiduité',sub:'Appels, cumul pondéré et seuil de 15',path:'/attendance-ranking'},
    {title:'Classements élèves',sub:'Notes, assiduité, global et bonnes actions',path:'/student-rankings'},
    {title:'Annuaire privé',sub:'Élèves, professeurs et coordonnées à vérifier',path:'/admin-directory'},
    {title:'Documents et annonces',sub:'Préparer et publier pour chaque promotion',path:'/admin-training?tab=posts'},
    ...(data.campuses.includes('CORE')?[{title:'Salles et locations CORE',sub:'Planning de novembre, occupations et réservations annuelles',path:'/admin-rentals'}]:[]),
    ...(data.central?[{title:'Planning des cours open',sub:'Cours ponctuels et récurrents',path:'/admin-planning'},{title:'Communication',sub:'Notifications et messages School',path:'/admin-notif'},{title:'Droits et responsables',sub:'Comptes et périmètres de gestion',path:'/admin-responsibilities'}]:[]),
    ...(data.can_teacher_ranking?[{title:'Ranking professeurs · confidentiel',sub:'Réservé aux quatre directeurs autorisés',path:'/teacher-ranking'}]:[]),
    {title:'Tous les outils',sub:'Retrouver les autres fonctions d’administration',path:'/admin-tools'}
   ].map(m=><Pressable key={m.title} accessibilityRole="button" style={s.module} onPress={()=>open(m.path)}><Text style={s.actionTitle}>{m.title} ↗</Text><Text style={s.text}>{m.sub}</Text></Pressable>)}</View>
   <View style={s.card}><Text style={s.heading}>Locations et paiements</Text><Text style={s.text}>{data.rental_imports.length?'Planning CORE importé : '+data.rental_imports.map(i=>i.month.slice(0,7)).join(', ')+'.':'Aucun planning de location importé pour le moment.'}</Text><Text style={s.text}>Le nouveau compte Stripe School reste à connecter. Aucun encaissement ni aucune facture de paiement n’est simulé dans le cockpit.</Text><Button title="Voir le calendrier public CORE" onPress={()=>void Linking.openURL('https://www.juste-debout-school.com/locations-core.html')}/></View>
  </>}
  </>}
 </ScrollView></View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:Palette.bg},body:{padding:20,paddingBottom:100,gap:18,maxWidth:1200,width:'100%',alignSelf:'center'},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'},kicker:{color:Palette.core,fontSize:12,fontWeight:'800',letterSpacing:2},title:{fontSize:34,fontWeight:'900',color:Palette.text,marginTop:6},subtitle:{fontSize:15,lineHeight:22,color:Palette.textDim,marginTop:8},heading:{fontSize:22,fontWeight:'800',color:Palette.text},text:{fontSize:13,lineHeight:20,color:Palette.textDim},filters:{gap:12,paddingVertical:12},row:{flexDirection:'row',flexWrap:'wrap',gap:8},metrics:{flexDirection:'row',flexWrap:'wrap',gap:12},metric:{flexGrow:1,flexBasis:210,padding:20,gap:8,borderWidth:1,borderColor:Palette.border,borderRadius:Radius.lg,backgroundColor:Palette.surface},value:{fontSize:36,color:Palette.core,fontWeight:'800'},card:{padding:20,gap:12,borderWidth:1,borderColor:Palette.border,borderRadius:Radius.lg,backgroundColor:Palette.surface},action:{flexDirection:'row',alignItems:'center',gap:16,padding:18,borderWidth:1,borderColor:Palette.border,borderRadius:Radius.lg,backgroundColor:Palette.surface},actionTitle:{fontSize:16,fontWeight:'700',color:Palette.text},count:{fontSize:27,fontWeight:'800',color:Palette.core,minWidth:42},arrow:{fontSize:24,color:Palette.core},modules:{flexDirection:'row',flexWrap:'wrap',gap:12},module:{flexBasis:280,flexGrow:1,borderWidth:1,borderColor:Palette.border,borderRadius:Radius.lg,padding:20,gap:10,backgroundColor:Palette.surface},date:{gap:10},error:{color:Palette.danger,fontSize:15,lineHeight:22}});
