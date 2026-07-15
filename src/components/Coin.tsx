/**
 * JD COIN — visuel de pièce de la monnaie de fidélité (noir & or).
 * Pièce sombre à double liseré doré, wavetruv « embossé » or au centre.
 * <Coin size={64} /> — réutilisable partout (solde, accueil, récompenses).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Wavetruv } from '@/components/Logo';

const GOLD = '#E8B54B';

export function Coin({ size = 64 }: { size?: number }) {
  const inset = Math.max(2, size * 0.12);
  const edge = Math.max(1.5, size * 0.045);
  const ring = Math.max(1, size * 0.028);
  return (
    <LinearGradient
      colors={['#3A342A', '#1A1712', '#050505'] as const}
      start={{ x: 0.2, y: 0.05 }}
      end={{ x: 0.82, y: 0.98 }}
      style={[styles.disc, { width: size, height: size, borderRadius: size / 2, borderWidth: edge }]}
    >
      {/* reflet doré en haut à gauche */}
      <View style={[styles.shine, { width: size * 0.3, height: size * 0.3, borderRadius: size, top: size * 0.14, left: size * 0.16 }]} />
      {/* rim gravé + face, wavetruv or */}
      <View
        style={[
          styles.inner,
          { top: inset, left: inset, right: inset, bottom: inset, borderRadius: size / 2, borderWidth: ring },
        ]}
      >
        <Wavetruv size={size * 0.5} tint={GOLD} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderColor: GOLD },
  shine: { position: 'absolute', backgroundColor: 'rgba(232,181,75,0.28)' },
  inner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(232,181,75,0.55)',
    backgroundColor: 'rgba(232,181,75,0.05)',
  },
});
