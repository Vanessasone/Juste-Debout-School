import {supabase} from '@/lib/supabase';
import {getMyProfile,isAdmin} from '@/lib/profile';
export type SchoolResponsibility={id:string;display_name:string;email:string;title:string;campus:'CORE'|'INDUSTRY'|null;profile_id:string|null;enabled:boolean};
export type SchoolAccess={admin:boolean;campuses:('CORE'|'INDUSTRY')[]};
export async function getSchoolAccess():Promise<SchoolAccess>{
 const profile=await getMyProfile();
 if(isAdmin(profile))return {admin:true,campuses:['CORE','INDUSTRY']};
 if(!profile)return {admin:false,campuses:[]};
 const {data,error}=await supabase.from('jds_school_responsibilities').select('campus').eq('profile_id',profile.id).eq('enabled',true);
 if(error)throw error;
 return {admin:false,campuses:(['CORE','INDUSTRY'] as const).filter(c=>data?.some(r=>r.campus===null||r.campus===c))};
}
export async function getSchoolResponsibilities():Promise<SchoolResponsibility[]>{
 const {data,error}=await supabase.from('jds_school_responsibilities').select('*').order('display_name');
 if(error)throw error;return data??[];
}
