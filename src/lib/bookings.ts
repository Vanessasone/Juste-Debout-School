/**
 * RÉSERVATIONS — les cours réservés par l'élève, chacun avec son QR à scanner à
 * l'entrée (le QR porte l'id de réservation → le cours précis est connu, donc
 * les stats savent lequel des cours simultanés est suivi).
 * Démo : dérive quelques cours à venir. Réel (Phase B) : jointure jds_bookings.
 */
import type { Session } from '@/lib/schools';
import {supabase} from '@/lib/supabase';

export type Booking = { id: string; session: Session; qr: string };

/** QR encodé pour une réservation. */
export function bookingQr(id: string): string {
  return `JDS-BK-${id}`;
}
/** QR encodé pour la carte membre. */
export function memberQr(id: string): string {
  return `JDS-MB-${id}`;
}

export async function getMyBookings(): Promise<Booking[]> {
  const {data:{user},error:authError}=await supabase.auth.getUser();if(authError)throw authError;if(!user)return [];
  const {data,error}=await supabase.from('jds_bookings').select('id,status,jds_sessions(*,jds_schools(code),jds_studios(name),jds_teachers(name))').eq('profile_id',user.id).order('created_at',{ascending:false});
  if(error)throw error;
  return (data??[]).filter((r:any)=>['booked','confirmed','paid','checked_in'].includes(r.status)&&r.jds_sessions).map((r:any)=>{const s=r.jds_sessions;return {id:r.id,qr:bookingQr(r.id),session:{id:s.id,schoolCode:s.jds_schools?.code,style:s.style,level:s.level,kind:s.kind,startsAt:new Date(s.starts_at),durationMin:s.duration_min,capacity:s.capacity,booked:0,studioName:s.jds_studios?.name??null,teacherName:s.jds_teachers?.name??null,priceCents:s.price_cents}};});
}
