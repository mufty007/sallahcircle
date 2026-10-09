import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * expo-notifications throws on import inside Expo Go on Android (removed in SDK 53),
 * so it is only loaded where it works: development/production builds and iOS Expo Go.
 */
export const notificationsSupported =
  Platform.OS !== 'web' && !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

/**
 * Ask for notification permission and store the Expo push token.
 * Returns false if notifications are unavailable here or the user declined.
 */
export async function registerForNotifications(userId: string) {
  if (!notificationsSupported) return false;
  const Notifications = await import('expo-notifications');

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').upsert({
      token,
      user_id: userId,
      platform: Platform.OS as 'ios' | 'android',
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    // Expo Go can't always issue push tokens; local reminders still work.
    console.warn('Push token unavailable', e);
  }
  return true;
}
