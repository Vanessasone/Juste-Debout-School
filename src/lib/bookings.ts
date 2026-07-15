/**
 * RÉSERVATIONS — les cours réservés par l'élève, chacun avec son QR à scanner à
 * l'entrée (le QR porte l'id de réservation → le cours précis est connu, donc
 * les stats savent lequel des cours simultanés est suivi).
 * Démo : dérive quelques cours à venir. Réel (Phase B) : jointure jds_bookings.
 */
import { getUpcomingSessions, type Session } from '@/lib/schools';

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
  const sessions = await getUpcomingSessions('ALL', 3).catch(() => [] as Session[]);
  return sessions.map((s) => ({ id: s.id, session: s, qr: bookingQr(s.id) }));
}
