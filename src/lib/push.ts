/**
 * PUSH — enregistrement du jeton Expo pour les notifications distantes.
 * Sur web / hors device / sans Supabase : no-op. Le jeton est stocké dans
 * jds_push_tokens ; l'envoi réel se fait via une Edge Function (voir
 * supabase/functions/push-on-notify). Nécessite un build device (pas Expo Go web).
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function registerForPush(): Promise<void> {
  try {
    if (Platform.OS === 'web' || !isSupabaseConfigured || !Device.isDevice) return;

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Juste Debout School',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const tokenResp = await Notifications.getExpoPushTokenAsync();
    const token = tokenResp?.data;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !token) return;

    await supabase
      .from('jds_push_tokens')
      .upsert({ profile_id: user.id, token, platform: Platform.OS }, { onConflict: 'token' });
  } catch {
    /* pas de projet EAS / permission refusée / offline → silencieux */
  }
}
