/**
 * Composants UI partagés — signature Kinetic (dégradés).
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Palette, Radius, Space } from '@/constants/brand';
import { Fav, useFavorites } from '@/lib/favorites';
import { tap } from '@/lib/haptics';

/** Cœur favori (toggle) — cours/profs/stages/vidéos. */
export function FavHeart({ fav, size = 18, color = '#fff' }: { fav: Fav; size?: number; color?: string }) {
  const { isFav, toggle } = useFavorites();
  const on = isFav(fav.key);
  return (
    <Pressable hitSlop={8} onPress={() => { tap(); toggle(fav); }}>
      <Ionicons name={on ? 'heart' : 'heart-outline'} size={size} color={on ? Palette.pink : color} />
    </Pressable>
  );
}

/** Pressable avec micro-animation (léger scale au tap) + haptique. */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  haptic = true,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      onPressIn={() => !disabled && to(0.96)}
      onPressOut={() => to(1)}
      onPress={() => { if (!disabled) { if (haptic) tap(); onPress?.(); } }}
      disabled={disabled}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Entrée en fondu + léger glissement, au montage. */
export function FadeInView({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Toggle entre l'app School (active) et l'app événement Juste Debout.
 * Un clic sur « Juste Debout » ouvre le site événement, sans transfert de session.
 */
export function AppSwitch() {
  return (
    <View style={sw.wrap}>
      <LinearGradient colors={['#FF6A16', '#FF2E7E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sw.active}>
        <Text style={sw.activeText}>JD School</Text>
      </LinearGradient>
      <Pressable style={sw.inactive} onPress={() => { tap(); Linking.openURL('https://www.justedeboutapp.com'); }}>
        <Text style={sw.inactiveText}>Juste Debout</Text>
      </Pressable>
    </View>
  );
}

const sw = StyleSheet.create({
  wrap: { flexDirection: 'row', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.pill, padding: 4 },
  active: { borderRadius: Radius.pill, paddingHorizontal: 18, paddingVertical: 8 },
  activeText: { fontSize: 12, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  inactive: { borderRadius: Radius.pill, paddingHorizontal: 18, paddingVertical: 8, justifyContent: 'center' },
  inactiveText: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.4 },
});

/** Bouton d'action principal, en dégradé (orange par défaut). */
export function GradientBtn({
  label,
  onPress,
  disabled,
  colors,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  colors?: readonly [string, string];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[{ marginTop: Space.xl, borderRadius: Radius.md, overflow: 'hidden', opacity: disabled ? 0.5 : 1 }, style]}>
      <LinearGradient
        colors={colors ?? ['#FF6A16', '#FF9346']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ paddingVertical: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </Text>
      </LinearGradient>
    </PressableScale>
  );
}
