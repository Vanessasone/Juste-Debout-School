import {supabase} from './supabase';
export const teacherCriteria=["Education - Qualité de l’enseignement","Education - Disponibilité pour remplacements","Implication - Disponibilité pour réunions","Implication - Réactivité","Implication - Force de proposition","Communication (Interne)","Mindset - Ponctualité","Mindset - Corporatisme","Réputation - Popularité avec les élèves","Réputation - Réseaux sociaux"];
export type TeacherSkill={id:string;teacher_name:string;period:string;formation:boolean|null;open_classes:boolean|null;scores:(number|null)[];revision:number;source:string};
export async function canReadTeacherSkills(){const {data,error}=await supabase.rpc('jds_teacher_ranking_access');if(error)throw error;return data===true;}
export async function getTeacherSkills(){const {data,error}=await supabase.from('jds_teacher_skill_scores').select('*').order('teacher_name');if(error)throw error;return (data??[]) as TeacherSkill[];}
export function rankTeacherSkills(rows:TeacherSkill[]){
 const values=rows.map(row=>{const scored=row.scores.filter((s):s is number=>s!==null);return {...row,count:scored.length,score:scored.length?scored.reduce((a,b)=>a+b,0)/scored.length:null};}).sort((a,b)=>(b.score??-1)-(a.score??-1)||a.teacher_name.localeCompare(b.teacher_name,'fr'));
 return values.map((row,index)=>({...row,rank:row.score===null?null:1+values.slice(0,index).filter(r=>r.score!==null&&r.score>row.score!).length}));
}
export function parseSkillScores(inputs:string[]){if(inputs.length!==10)throw new Error('Dix critères sont requis.');return inputs.map(s=>{if(!s.trim())return null;if(!/^[1-5]$/.test(s.trim()))throw new Error('Chaque note doit être un entier de 1 à 5, ou rester vide.');return Number(s.trim());});}
export async function saveTeacherSkills(row:{id?:string;teacher_name:string;period:string;scores:(number|null)[];formation:boolean|null;open_classes:boolean|null;revision?:number}){
 const {data,error}=await supabase.rpc('jds_save_teacher_skills',{score_key:row.id??null,label:row.teacher_name,period_label:row.period,values10:row.scores,formation_flag:row.formation,open_flag:row.open_classes,expected_revision:row.revision??null});if(error)throw error;if(typeof data!=='string')throw new Error('Enregistrement non confirmé.');return data;
}
