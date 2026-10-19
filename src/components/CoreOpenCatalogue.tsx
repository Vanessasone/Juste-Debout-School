import {useMemo,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Palette,Radius,Space} from '@/constants/brand';
import {useI18n} from '@/lib/i18n';
import {coreOpenCourses,coreOpenPoster,type CoreOpenCourse} from '@/lib/core-open';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function CoreOpenCatalogue({day,compact=false}:{day?:number;compact?:boolean}){
 const {locale}=useI18n();const fr=locale==='fr';const insets=useSafeAreaInsets();
 const [query,setQuery]=useState('');const [selected,setSelected]=useState<CoreOpenCourse|null>(null);
 const visible=useMemo(()=>coreOpenCourses.filter(c=>(day===undefined||c.day===day)&&normalize([c.teacher,...c.aliases,c.style,c.ages??''].join(' ')).includes(normalize(query))),[day,query]);
 const days=fr?['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 return <View style={styles.section}>
  <Text style={styles.title}>CORE · OPEN CLASSES</Text>
  <Text style={styles.note}>{fr?'Programme hebdomadaire 2026–2027 · Sans réservation · Paiement sur place. Confirme les remplacements auprès de l’accueil.':'2026–2027 weekly programme · No booking · Pay on site. Confirm teacher replacements with reception.'}</Text>
  {!compact&&<TextInput value={query} onChangeText={setQuery} style={styles.search} accessibilityLabel={fr?'Rechercher un cours open':'Search open classes'} placeholder={fr?'Professeur, style ou âge…':'Teacher, style or age…'} placeholderTextColor={Palette.textMute} autoCapitalize="none" autoCorrect={false}/>}
  {visible.length===0?<Text style={styles.note}>{fr?'Aucun cours open avec ces filtres.':'No open classes match these filters.'}</Text>:<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
   {visible.map(c=><Pressable key={c.id} style={styles.card} onPress={()=>setSelected(c)} accessibilityRole="button" accessibilityLabel={`${fr?'Voir l’affiche':'View poster'} · ${c.teacher} · ${c.style} · ${days[c.day]} ${c.start}`}>
    <Image source={coreOpenPoster(c)} style={styles.poster} resizeMode="contain" accessibilityLabel={`${c.teacher} · ${c.style}`}/>
    <View style={styles.caption}><Text style={styles.teacher}>{c.teacher}</Text><Text style={styles.meta}>{days[c.day]} · {c.start}{c.ages?' · '+(fr?c.ages:c.ages.replace('ans','years')):''}</Text><Text style={styles.meta}>{c.style} ↗</Text></View>
   </Pressable>)}
  </ScrollView>}
  <Modal visible={selected!==null} transparent animationType="fade" onRequestClose={()=>setSelected(null)}>
   <View style={[styles.overlay,{paddingTop:insets.top+12,paddingBottom:insets.bottom+12}]}>
    <Pressable style={styles.close} onPress={()=>setSelected(null)} accessibilityRole="button" accessibilityLabel={fr?'Fermer l’affiche':'Close poster'}><Text style={styles.closeText}>{fr?'Fermer':'Close'} ×</Text></Pressable>
    {selected&&<Image source={coreOpenPoster(selected)} style={styles.fullPoster} resizeMode="contain" accessibilityLabel={`${selected.teacher} · ${selected.style} · ${days[selected.day]} ${selected.start}`}/>}
   </View>
  </Modal>
 </View>;
}
const styles=StyleSheet.create({
 section:{marginTop:Space.lg,marginBottom:Space.lg},title:{fontSize:20,fontWeight:'800',color:Palette.text,marginHorizontal:Space.lg},
 note:{fontSize:12,lineHeight:18,color:Palette.textDim,marginHorizontal:Space.lg,marginTop:8,marginBottom:12},
 search:{marginHorizontal:Space.lg,marginBottom:12,padding:12,borderWidth:1,borderColor:Palette.border,borderRadius:Radius.md,backgroundColor:Palette.surface,color:Palette.text,fontSize:14},
 rail:{paddingHorizontal:Space.lg,gap:14},card:{width:220,borderRadius:Radius.lg,overflow:'hidden',borderWidth:1,borderColor:Palette.border,backgroundColor:Palette.surface},
 poster:{width:'100%',height:280,backgroundColor:'#111416'},caption:{padding:12},teacher:{fontSize:15,fontWeight:'800',color:Palette.text},meta:{fontSize:12,lineHeight:18,color:Palette.textDim,marginTop:3},
 overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.96)',paddingHorizontal:12},close:{alignSelf:'flex-end',padding:12,minHeight:44},closeText:{color:'#fff',fontSize:16,fontWeight:'700'},fullPoster:{flex:1,width:'100%'}
});
