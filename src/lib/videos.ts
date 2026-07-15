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

export const VIDEOS: Video[] = [
  { id: 'v1', title: 'Les bases de la House', style: 'House', durationSec: 252, views: 1240, likes: 312, section: 'new', hue: H.house },
  { id: 'v2', title: 'Popping · dime stop', style: 'Popping', durationSec: 363, views: 980, likes: 205, section: 'new', hue: H.popping },
  { id: 'v3', title: 'Locking · les points', style: 'Locking', durationSec: 421, views: 760, likes: 150, section: 'new', hue: H.locking },
  { id: 'v4', title: 'Replay open class — House', style: 'House', durationSec: 4800, views: 3200, likes: 540, section: 'popular', hue: H.house },
  { id: 'v5', title: 'Musicalité en Hip-Hop', style: 'Hip-Hop', durationSec: 512, views: 2600, likes: 480, section: 'popular', hue: H.hiphop },
  { id: 'v6', title: 'Waacking · les bras', style: 'Waacking', durationSec: 388, views: 2100, likes: 410, section: 'popular', hue: H.waacking },
  { id: 'v7', title: 'Tuto footwork House', style: 'House', durationSec: 300, views: 1500, likes: 260, section: 'tuto', hue: H.house },
  { id: 'v8', title: 'Tuto boogaloo', style: 'Popping', durationSec: 340, views: 1100, likes: 190, section: 'tuto', hue: H.popping },
  { id: 'v9', title: 'Tuto Hip-Hop groove', style: 'Hip-Hop', durationSec: 275, views: 1700, likes: 300, section: 'tuto', hue: H.hiphop },
];

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
