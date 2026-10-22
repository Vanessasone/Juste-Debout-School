import {supabase} from './supabase';
export type AbsenceRequest={id:string;member_id:string;starts_on:string;ends_on:string;proof_path:string;proof_name:string;status:'pending'|'approved'|'rejected';submitted_by:string;created_at:string;review_note:string;reviewed_at:string|null};
const bucket='school-absence-proofs';
export function validateAbsence(first:string,last:string,file:{size:number;type:string}|null){
 for(const date of [first,last])if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('Renseigne des dates valides au format AAAA-MM-JJ.');
 if(last<first||Date.parse(last)-Date.parse(first)>366*86400000)throw new Error('Période invalide (366 jours maximum).');
 if(!file)throw new Error('Le justificatif est obligatoire.');
 if(!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error('Joins un PDF ou une image JPG / PNG.');
 if(file.size<=0||file.size>10*1024*1024)throw new Error('Le justificatif doit être non vide et ne pas dépasser 10 Mo.');
}
export async function getAbsenceRequests(){const {data,error}=await supabase.from('jds_absence_requests').select('*').order('created_at',{ascending:false}).limit(1000);if(error)throw error;return (data??[]) as AbsenceRequest[];}
export async function submitAbsence(member:string,first:string,last:string,file:File){
 validateAbsence(first,last,file);
 const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error('Reconnecte-toi pour transmettre la déclaration.');
 const ext=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg';
 const path=`${user.id}/${member}/${crypto.randomUUID()}.${ext}`;
 const {error:uploadError}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;
 const {data,error}=await supabase.rpc('jds_submit_absence',{target_member:member,first_day:first,last_day:last,document_path:path,document_name:file.name.slice(0,200)});
 // Keep an uploaded proof if the network response was lost: the server may have committed the declaration.
 if(error)throw error;if(typeof data!=='string')throw new Error('Transmission non confirmée. Actualise les déclarations avant de réessayer.');return data;
}
export async function reviewAbsence(id:string,decision:'approved'|'rejected',note:string){const {data,error}=await supabase.rpc('jds_review_absence',{request_id:id,decision,decision_note:note});if(error)throw error;if(data!==id)throw new Error('Décision non confirmée. Actualise avant de réessayer.');}
export async function absenceProofUrl(path:string){const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,60);if(error)throw error;if(!data?.signedUrl)throw new Error('Justificatif indisponible.');return data.signedUrl;}
