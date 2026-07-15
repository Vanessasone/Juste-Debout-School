/**
 * Couche données LOCATION DE SALLES — tarifs par créneau, par école.
 * Repli démo sur les données réelles seedées.
 */
import type { CampusCode } from '@/constants/brand';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type RentalPrice = { slot: string; priceCents: number };
export type RentalRate = {
  id: string;
  label: string;
  areaM2: number | null;
  combo: string | null;
  prices: RentalPrice[];
};

const MOCK: Record<CampusCode, RentalRate[]> = {
  CORE: [
    { id: 'c1', label: 'Salle 1', areaM2: 132, combo: null, prices: [
      { slot: 'Journée sem. (10h-19h)', priceCents: 4000 }, { slot: 'Soir sem. (19h-22h)', priceCents: 7000 }, { slot: 'Week-end (avant 19h)', priceCents: 4000 }] },
    { id: 'c2', label: 'Salle 2', areaM2: 75, combo: null, prices: [
      { slot: 'Journée sem. (10h-19h)', priceCents: 3500 }, { slot: 'Soir sem. (19h-22h)', priceCents: 5000 }, { slot: 'Week-end (avant 19h)', priceCents: 3500 }] },
    { id: 'c3', label: 'Salle 3', areaM2: 50, combo: null, prices: [
      { slot: 'Journée sem. (10h-19h)', priceCents: 3000 }, { slot: 'Soir sem. (19h-22h)', priceCents: 4500 }, { slot: 'Week-end (avant 19h)', priceCents: 3000 }] },
  ],
  INDUSTRY: [
    { id: 'd1', label: 'Salle 1', areaM2: 98, combo: null, prices: [
      { slot: '9h-18h30', priceCents: 5000 }, { slot: '18h30-23h', priceCents: 8000 }, { slot: 'Après 23h', priceCents: 11000 }] },
    { id: 'd2', label: 'Salle 2', areaM2: 61, combo: null, prices: [
      { slot: '9h-18h30', priceCents: 4500 }, { slot: '18h30-23h', priceCents: 6000 }, { slot: 'Après 23h', priceCents: 9500 }] },
    { id: 'd3', label: 'Salle 3', areaM2: 53, combo: null, prices: [
      { slot: '9h-18h30', priceCents: 4000 }, { slot: '18h30-23h', priceCents: 5500 }, { slot: 'Après 23h', priceCents: 8500 }] },
    { id: 'd23', label: 'Salles 2 + 3', areaM2: 110, combo: '2+3', prices: [
      { slot: '9h-18h30', priceCents: 8500 }, { slot: '18h30-23h', priceCents: 11500 }, { slot: 'Après 23h', priceCents: 14500 }] },
    { id: 'd13', label: 'Salles 1 + 3', areaM2: 150, combo: '1+3', prices: [
      { slot: '9h-18h30', priceCents: 9000 }, { slot: '18h30-23h', priceCents: 13500 }, { slot: 'Après 23h', priceCents: 16500 }] },
    { id: 'd123', label: 'Salles 1 + 2 + 3', areaM2: 210, combo: '1+2+3', prices: [
      { slot: '9h-18h30', priceCents: 15000 }, { slot: '18h30-23h', priceCents: 22000 }, { slot: 'Après 23h', priceCents: 25000 }] },
  ],
};

export async function getRentalRates(school: CampusCode): Promise<RentalRate[]> {
  if (!isSupabaseConfigured) return MOCK[school];
  const { data, error } = await supabase
    .from('jds_rental_rates')
    .select('id, label, area_m2, combo, sort_order, jds_schools!inner(code), jds_rental_prices(slot_label, slot_order, price_cents)')
    .eq('jds_schools.code', school)
    .order('sort_order');
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    label: r.label,
    areaM2: r.area_m2,
    combo: r.combo,
    prices: (r.jds_rental_prices ?? [])
      .sort((a: any, b: any) => a.slot_order - b.slot_order)
      .map((p: any) => ({ slot: p.slot_label, priceCents: p.price_cents })),
  }));
}

export function euros(cents: number): string {
  return `${(cents / 100).toFixed(0)} €`;
}
