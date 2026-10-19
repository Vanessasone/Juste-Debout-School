/**
 * Couche données VIDÉOS — replays & tutos par style.
 * Pour l'instant : données d'exemple (mode démo).
 * TODO backend : table `jds_videos` (titre, style, durée, vues, url) + stockage
 * Supabase Storage / streaming, sur le même projet — même schéma de repli.
 */
export type Video = {
  id: string;
  title: string;
  style: string;
  durationSec: number;
  views: number;
  likes: number;
  section: 'new' | 'popular' | 'tuto';
  hue: string;
};

const H = {
  house: '#2A3CC0',
  popping: '#B8620D',
  locking: '#2F7D4E',
  hiphop: '#4A4A52',
  waacking: '#8A2E6B',
};

export const VIDEOS: Video[] = [];

export const VIDEO_STYLES = ['House', 'Popping', 'Locking', 'Hip-Hop', 'Waacking'];

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function getVideos(style?: string | null): Video[] {
  if (!style) return VIDEOS;
  return VIDEOS.filter((v) => v.style === style);
}
