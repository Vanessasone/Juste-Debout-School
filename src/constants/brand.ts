/**
 * Juste Debout School — Design System « Atelier / Affiche ».
 *
 * Identité PROPRE à l'école, distincte de l'app événement (vert/noir).
 * Base : papier chaud + encre. Système par campus : chaque école porte sa
 * couleur signature réelle — CORE = orange, INDUSTRY = cobalt (relevées sur
 * leurs comptes Instagram). Le wordmark manuscrit « Juste Debout School » et
 * l'homme de Vitruve restent le fil commun de la famille Juste Debout.
 *
 * Typo : système pour l'instant (aucune police custom requise → tourne sans
 * fichier .ttf). À remplacer par une vraie grotesque d'affiche quand les
 * fontes officielles seront fournies (voir Type.display).
 */

export const Palette = {
  // « Kinetic » — base claire raffinée + accents vifs (hero sombre géré par écran)
  bg: '#F4F1EC',
  surface: '#FFFFFF',
  surface2: '#EEEAE2',
  border: '#E7E1D7',
  borderStrong: '#D6CEC1',

  // Texte — encre profonde (léger biais prune)
  text: '#141019',
  textDim: '#5B5560',
  textMute: '#948E9A',

  // Couleurs signature — vives
  core: '#FF6A16',
  coreTint: '#FFE9D8',
  industry: '#2F40E6',
  industryTint: '#E5E7FD',
  pink: '#FF2E7E',

  // Sémantique
  success: '#3E9E59',
  warning: '#C98A1E',
  danger: '#E0483A',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(20,16,25,0.5)',
} as const;

export type CampusCode = 'CORE' | 'INDUSTRY';

/** Couleur d'accent d'un campus (défaut : orange CORE). */
export function accentFor(code?: CampusCode | 'ALL' | null): string {
  if (code === 'INDUSTRY') return Palette.industry;
  if (code === 'CORE') return Palette.core;
  return Palette.core; // 'ALL' / inconnu → orange maison
}

/** Teinte claire d'un campus (fonds de puces, badges). */
export function tintFor(code?: CampusCode | 'ALL' | null): string {
  if (code === 'INDUSTRY') return Palette.industryTint;
  return Palette.coreTint;
}

/** Dégradé signature : CORE = orange, INDUSTRY = bleu, ALL = orange → bleu (les deux). */
export function gradientFor(code?: CampusCode | 'ALL' | null): readonly [string, string] {
  if (code === 'INDUSTRY') return ['#2F40E6', '#5B6BFF'];
  if (code === 'ALL') return ['#FF6A16', '#2F40E6'];
  return ['#FF6A16', '#FF9346'];
}

export const Radius = { sm: 10, md: 14, lg: 18, xl: 26, pill: 999 } as const;

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/**
 * Échelle typographique. Titres en gras appuyé + capitales + interlettrage
 * serré (esprit affiche), sans police custom pour l'instant.
 */
export const Type = {
  display: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    textTransform: 'uppercase' as const,
  },
  h2: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  h3: { fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.2 },
  body: { fontSize: 15, fontWeight: '500' as const, lineHeight: 21 },
  small: { fontSize: 13, fontWeight: '500' as const },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

export const Shadow = {
  card: {
    shadowColor: '#1B1917',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
} as const;
