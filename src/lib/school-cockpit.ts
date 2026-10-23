import {supabase} from './supabase';
export type CockpitGroup={id:string;campus:string;name:string;season:string};
export type CockpitAction={key:string;bucket:'decision'|'complete'|'review'|'draft';campus:string|null;group_id:string|null;detail:string;count:number};
export type CockpitData={generated_at:string;date:string;term:number;name:string;campuses:string[];central:boolean;can_teacher_ranking:boolean;can_finance:boolean;groups:CockpitGroup[];actions:CockpitAction[];agenda:{id:string;campus:string;group_id:string|null;title:string;teacher:string|null;room:string|null;starts_at:string;ends_at:string;kind:string}[];members:number;linked_members:number;published_bulletins:number;rental_imports:{month:string;imported_at:string}[];payments_ready:boolean};
export async function getSchoolCockpit(campus:string,group:string,term:number,date:string):Promise<CockpitData>{
 const {data,error}=await supabase.rpc('jds_school_cockpit',{target_campus:campus||null,target_group:group||null,target_term:term,target_date:date});
 if(error)throw new Error(error.message);
 if(!data||!Array.isArray(data.actions)||!Array.isArray(data.groups))throw new Error('Le cockpit n’a pas pu être chargé.');
 return data as CockpitData;
}
export const cockpitActionLabels:Record<string,string>={tuition_prepare:'Conditions financières à reprendre / confirmer',tuition_schedule:'Échéanciers à confirmer',tuition_overdue:'Dossiers avec échéance de paiement dépassée',tuition_funding:'Financements externes en attente de décision',enrollment_rules:'Modalités d’inscription à confirmer',enrollment_submitted:'Dossiers d’inscription à vérifier',access:'Demandes d’accès à valider',directory:'Fiches de l’annuaire à vérifier',members:'Comptes élèves à rattacher',subjects:'Matières à configurer',evaluations_missing:'Évaluations à compléter',evaluations_received:'Évaluations transmises à consulter',summaries:'Synthèses en brouillon',absences:'Déclarations d’absence à vérifier',warnings:'Seuils d’assiduité à examiner',calls:'Appels incomplets',documents:'Documents et annonces en brouillon',planning:'Cours en préparation',responsibilities:'Accès de responsables à compléter',periods:'Périodes de calendrier prévisionnelles'};
export function cockpitActionPath(action:CockpitAction,term:number){
 const params=new URLSearchParams();if(action.group_id)params.set('group',action.group_id);if(['CORE','INDUSTRY'].includes(action.campus||''))params.set('campus',action.campus!);params.set('term',String(term));
 let path='/admin-training';
 if(action.key.startsWith('tuition_')){path='/tuition.html';if(action.key==='tuition_overdue')params.set('focus','late');}
 else if(action.key.startsWith('enrollment_')){path='/enrollments.html';if(action.key==='enrollment_submitted')params.set('focus','submitted');}
 else if(['subjects','evaluations_missing','evaluations_received','summaries'].includes(action.key)){path='/bulletins.html';params.set('focus',action.key);}
 else if(action.key==='access')path='/school-role.html';
 else if(action.key==='directory'){path='/admin-directory';params.set('review','pending');params.set('kind',action.detail);}
 else if(action.key==='absences')path='/absences';
 else if(action.key==='warnings')path='/attendance-ranking';
 else if(action.key==='responsibilities')path='/admin-responsibilities';
 else if(action.key==='calls')params.set('tab','attendance');
 else if(action.key==='documents')params.set('tab','posts');
 else if(action.key==='planning')params.set('tab','planning');
 else if(action.key==='periods')params.set('tab','calendar');
 return path+'?'+params.toString();
}
