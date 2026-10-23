import {Ionicons} from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Palette,Radius} from '@/constants/brand';
import {useI18n} from '@/lib/i18n';

const accounts=[
 {campus:'CORE',handle:'jdschool',colour:Palette.core},
 {campus:'INDUSTRY',handle:'jdschoolindustry',colour:Palette.industry},
] as const;

export function SchoolInstagram(){
 const {locale}=useI18n();
 return <View style={styles.section}><Text style={styles.title}>{locale==='fr'?'Retrouve les écoles sur Instagram':'Follow the schools on Instagram'}</Text>
  {accounts.map(a=><Pressable key={a.handle} accessibilityRole="link" accessibilityLabel={`Instagram ${a.campus} · @${a.handle}`} onPress={()=>void Linking.openURL(`https://www.instagram.com/${a.handle}/`)} style={styles.link}>
   <Ionicons name="logo-instagram" size={23} color={a.colour}/><View style={{flex:1}}><Text style={styles.school}>{a.campus}</Text><Text style={styles.handle}>@{a.handle}</Text></View><Text style={[styles.arrow,{color:a.colour}]}>↗</Text>
  </Pressable>)}
 </View>;
}
const styles=StyleSheet.create({section:{gap:10,marginVertical:18},title:{fontSize:17,fontWeight:'700',color:Palette.text},link:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderRadius:Radius.lg,borderWidth:1,borderColor:Palette.border,backgroundColor:Palette.surface},school:{fontSize:14,fontWeight:'800',color:Palette.text},handle:{fontSize:13,color:Palette.textDim,marginTop:3},arrow:{fontSize:24}});
