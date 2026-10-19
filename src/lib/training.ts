import {supabase} from '@/lib/supabase';
export type TrainingGroup={id:string;campus:'CORE'|'INDUSTRY';name:string;season:string};
export type TrainingMember={id:string;group_id:string;person_id:string;profile_id:string|null};
export type TrainingLesson={id:string;group_id:string;title:string;teacher:string;room:string;starts_at:string;ends_at:string;status:'draft'|'published'|'cancelled'};
export type Attendance={id:string;lesson_id:string;member_id:string;status:'present'|'absent'|'late'|'excused';note:string;recorded_at:string};
export type TrainingPost={id:string;group_id:string;title:string;body:string;kind:'announcement'|'document';storage_path:string|null;status:'draft'|'published';created_at:string};
export type TrainingPeriod={id:string;title:string;starts_on:string;ends_on:string;source:string;published:boolean};
async function rows<T>(query:PromiseLike<{data:unknown;error:unknown}>):Promise<T[]>{const {data,error}=await query;if(error)throw error;return (data??[]) as T[];}
export async function getTraining(attendanceLesson?:string){
 const [groups,members,lessons,attendance,posts,periods]=await Promise.all([
 rows<TrainingGroup>(supabase.from('jds_training_groups').select('*').order('campus').order('name')),
 rows<TrainingMember>(supabase.from('jds_training_members').select('*').limit(1000)),
 rows<TrainingLesson>(supabase.from('jds_training_lessons').select('*').order('starts_at').limit(1000)),
 attendanceLesson===''?Promise.resolve([] as Attendance[]):rows<Attendance>(attendanceLesson?supabase.from('jds_training_attendance').select('*').eq('lesson_id',attendanceLesson).order('recorded_at',{ascending:false}).limit(1000):supabase.from('jds_training_attendance').select('*').order('recorded_at',{ascending:false}).limit(1000)),
 rows<TrainingPost>(supabase.from('jds_training_posts').select('*').order('created_at',{ascending:false}).limit(500)),
 rows<TrainingPeriod>(supabase.from('jds_training_periods').select('*').order('starts_on'))]);
 return {groups,members,lessons,attendance,posts,periods};
}
export type TrainingData=Awaited<ReturnType<typeof getTraining>>;
export const EMPTY_TRAINING:TrainingData={groups:[],members:[],lessons:[],attendance:[],posts:[],periods:[]};
export function parisDateTime(date:string,time:string):string{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw new Error('Date AAAA-MM-JJ et heure HH:MM requises.');
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);const base=Date.UTC(y,m-1,d,h,min);
 if(h>23||min>59||new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==date)throw new Error('Date ou heure invalide.');
 const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let candidate=base;
 for(let i=0;i<3;i++){const p=Object.fromEntries(format.formatToParts(new Date(candidate)).map(p=>[p.type,p.value]));const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);candidate+=base-local;}
 if(format.format(new Date(candidate)).replace(' ','T')!==`${date}T${time}`)throw new Error('Cette heure n’existe pas à Paris (changement d’heure).');
 return new Date(candidate).toISOString();
}
export const parisLabel=(value:string)=>new Date(value).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'medium',timeStyle:'short'});
export const dateLabel=(value:string)=>value.split('-').reverse().join('/');
export async function assignTrainingMember(groupId:string,personId:string){const {error}=await supabase.rpc('jds_assign_training_member',{target_group:groupId,target_person:personId});if(error)throw error;}
export async function linkTrainingMember(memberId:string,profileId:string|null){const {error}=await supabase.from('jds_training_members').update({profile_id:profileId}).eq('id',memberId).select('id').single();if(error)throw error;}
export async function saveTrainingLessons(input:{id?:string;group_id:string;title:string;teacher:string;room:string;date:string;start:string;end:string;repeat:number},periods:TrainingPeriod[]){
 if(!input.title.trim())throw new Error('Le titre du cours est requis.');
 if(!Number.isInteger(input.repeat)||input.repeat<1||input.repeat>30)throw new Error('Choisis de 1 à 30 semaines.');
 parisDateTime(input.date,input.start);
 const values=[];
 for(let i=0;i<(input.id?1:input.repeat);i++){
  const day=new Date(input.date+'T12:00:00Z');if(Number.isNaN(day.getTime()))throw new Error('Date invalide.');day.setUTCDate(day.getUTCDate()+7*i);const date=day.toISOString().slice(0,10);
  const starts_at=parisDateTime(date,input.start),ends_at=parisDateTime(date,input.end);
  if(ends_at<=starts_at)throw new Error('L’heure de fin doit suivre l’heure de début.');
  if(!input.id&&periods.some(p=>p.published&&p.starts_on<=date&&p.ends_on>=date&&p.title.startsWith('Vacances')))continue;
  values.push({group_id:input.group_id,title:input.title.trim(),teacher:input.teacher.trim(),room:input.room.trim(),starts_at,ends_at,status:'draft'});
 }
 if(!values.length)throw new Error('Toutes les dates sont dans les vacances validées.');
 const result=input.id?await supabase.from('jds_training_lessons').update(values[0]).eq('id',input.id).select('id').single():await supabase.from('jds_training_lessons').insert(values).select('id');
 if(result.error)throw result.error;return values.length;
}
export async function setLessonStatus(id:string,status:TrainingLesson['status']){const {error}=await supabase.from('jds_training_lessons').update({status}).eq('id',id).select('id').single();if(error)throw error;}
export async function recordAttendance(lessonId:string,memberId:string,status:Attendance['status']){const {error}=await supabase.from('jds_training_attendance').upsert({lesson_id:lessonId,member_id:memberId,status},{onConflict:'lesson_id,member_id'}).select('id').single();if(error)throw error;}
export async function saveTrainingPost(groupId:string,title:string,body:string,file:File|null){
 if(!title.trim())throw new Error('Le titre est requis.');let path:string|null=null;
 if(file){if(file.size>20*1024*1024)throw new Error('Fichier limité à 20 Mo.');const ext=file.name.split('.').pop()?.toLowerCase();if(!ext||!['pdf','png','jpg','jpeg','docx','xlsx'].includes(ext))throw new Error('Formats : PDF, PNG, JPEG, DOCX, XLSX.');path=groupId+'/'+crypto.randomUUID()+'.'+ext;
 const mime=file.type||({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'} as Record<string,string>)[ext];
 const {error}=await supabase.storage.from('school-training').upload(path,file,{contentType:mime,upsert:false});if(error)throw error;}
 const {error}=await supabase.from('jds_training_posts').insert({group_id:groupId,title:title.trim(),body:body.trim(),kind:file?'document':'announcement',storage_path:path,status:'draft'});
 if(error){if(path)await supabase.storage.from('school-training').remove([path]);throw error;}
}
export async function setPostStatus(id:string,status:TrainingPost['status']){const {error}=await supabase.from('jds_training_posts').update({status}).eq('id',id).select('id').single();if(error)throw error;}
export async function setPeriodPublished(id:string,published:boolean){const {error}=await supabase.from('jds_training_periods').update({published}).eq('id',id).select('id').single();if(error)throw error;}
export async function trainingDocumentUrl(path:string){const {data,error}=await supabase.storage.from('school-training').createSignedUrl(path,60);if(error)throw error;return data.signedUrl;}
