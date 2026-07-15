/**
 * CARTES & ÉCONOMIES — catalogue des cartes prépayées + calcul d'économie
 * par rapport au tarif à l'unité. Sert au « nudge d'économie » (pousser
 * gentiment vers la carte quand on paie à l'unité) et à la boutique cartes.
 * Prix : fiches JDS (CORE) — cartes identiques CORE/INDUSTRY, seul le tarif
 * unité diffère (CORE 15 € / INDUSTRY 17 €). À confirmer avec les prix 2026.
 */
import type { CampusCode } from '@/constants/brand';

export type CardOffer = { classes: number; priceEuros: number };

export const CARD_OFFERS: CardOffer[] = [
  { classes: 5, priceEuros: 75 },
  { classes: 10, priceEuros: 135 },
  { classes: 20, priceEuros: 245 },
  { classes: 50, priceEuros: 555 },
];

export const SINGLE_PRICE_EUROS: Record<CampusCode, number> = {
  CORE: 15,
  INDUSTRY: 17,
};

export function singlePrice(campus: CampusCode): number {
  return SINGLE_PRICE_EUROS[campus] ?? 15;
}

export function perClassEuros(o: CardOffer): number {
  return o.priceEuros / o.classes;
}

export type Saving = { offer: CardOffer; savings: number; perClass: number };

/** Économie de chaque carte vs. acheter le même nombre de cours à l'unité. */
export function savingsLadder(campus: CampusCode): Saving[] {
  const single = singlePrice(campus);
  return CARD_OFFERS.map((o) => ({
    offer: o,
    savings: Math.round(single * o.classes - o.priceEuros),
    perClass: Math.round(perClassEuros(o)),
  }));
}

/** La carte qui fait économiser le plus (accroche du nudge). */
export function bestSaving(campus: CampusCode): Saving {
  return savingsLadder(campus).reduce((a, b) => (b.savings > a.savings ? b : a));
}
