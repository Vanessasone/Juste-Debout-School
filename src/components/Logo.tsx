/**
 * Logos Juste Debout.
 * - Wordmark : le lettrage manuscrit « Juste Debout » (wordmark-black.png).
 * - Wavetruv : l'homme de Vitruve (vitruve.png).
 * Ce sont les logos de la famille Juste Debout (réutilisés de l'app événement).
 * ⚠️ Le logo « School » spécifique remplacera le wordmark quand il sera fourni.
 * Les PNG sont des silhouettes noires → `tint` les recolore (blanc sur fond sombre).
 */
import { Image, View } from 'react-native';

const WORDMARK = require('@/assets/brand/wordmark-black.png');
const VITRUVE = require('@/assets/brand/vitruve.png');

export function Wordmark({ width = 200, tint }: { width?: number; tint?: string }) {
  return (
    <Image
      source={WORDMARK}
      style={{ width, height: width * 0.4, tintColor: tint }}
      resizeMode="contain"
    />
  );
}

export function Wavetruv({ size = 44, bg, tint }: { size?: number; bg?: string; tint?: string }) {
  const img = (
    <Image
      source={VITRUVE}
      style={{ width: bg ? size * 0.64 : size, height: bg ? size * 0.64 : size, tintColor: tint }}
      resizeMode="contain"
    />
  );
  if (!bg) return img;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {img}
    </View>
  );
}
