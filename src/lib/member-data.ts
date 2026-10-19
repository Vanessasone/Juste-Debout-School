import { supabase } from '@/lib/supabase';
export type MemberCard = { id: string; credits_total: number; credits_left: number; expires_at: string | null; status: string; jds_card_types: { name: string } | null };
export async function getMyCards(): Promise<MemberCard[]> {
 const {data:{user},error:authError}=await supabase.auth.getUser(); if(authError) throw authError; if(!user) return [];
 const {data,error}=await supabase.from('jds_user_cards').select('id,credits_total,credits_left,expires_at,status,jds_card_types(name)').eq('profile_id',user.id).eq('status','active').order('purchased_at',{ascending:false});
 if(error) throw error;
 return (data??[]).filter(c=>!c.expires_at||new Date(c.expires_at)>new Date()) as unknown as MemberCard[];
}
export async function getMyAttendance() {
 const {data:{user},error:authError}=await supabase.auth.getUser(); if(authError) throw authError; if(!user) return [];
 const {data,error}=await supabase.from('jds_checkins').select('id,checked_at,jds_sessions(style)').eq('member_id',user.id).order('checked_at',{ascending:false}).limit(1000);
 if(error) throw error; return data??[];
}
