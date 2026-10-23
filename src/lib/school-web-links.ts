import {Platform} from 'react-native';

/** Preserve the web origin and the Expo Router deployment prefix. */
export function schoolWebUrl(path = '/') {
  const base = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin + (process.env.EXPO_BASE_URL || '')
    : 'https://www.juste-debout-school.com/app';
  return base + '/' + path.replace(/^\/+/, '');
}
