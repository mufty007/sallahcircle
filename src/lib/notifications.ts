import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * expo-notifications throws on import inside Expo Go on Android (removed in SDK 53),
 * so it is only loaded where it works: development/production builds and iOS Expo Go.
 */
export const notificationsSupported =
  Platform.OS !== 'web' && !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

let deviceToken: string | null = null;

/** This device's Expo push token, once registered (null in Expo Go on Android, on web, or if denied). */
export const currentPushToken = () => deviceToken;

/** Stop pushes to this device for the signed-out user. */
export async function unregisterDevice() {
  if (deviceToken) await supabase.from('push_tokens').delete().eq('token', deviceToken);
  deviceToken = null;
}

/** Ask Supabase to push a fresh nudge (or reply) to the other person. Best effort. */
export function pushNudge(nudgeId: string) {
  supabase.functions.invoke('notify', { body: { nudge_id: nudgeId } }).catch(() => {});
}

/**
 * Ask for notification permission (or, with `ask = false`, only check it) and store the Expo push token.
 * Returns false if notifications are unavailable here or not allowed.
 */
export async function registerForNotifications(userId: string, ask = true) {
  if (!notificationsSupported) return false;
  // Android 13+ only shows the permission prompt once a channel exists.
  const Notifications = await (await import('./reminders')).prepareNotifications();

  const { status } = ask ? await Notifications.requestPermissionsAsync() : await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    // If another account left this phone's token behind, RLS refuses the upsert and we fall back to local reminders.
    const { error } = await supabase.from('push_tokens').upsert({
      token,
      user_id: userId,
      platform: Platform.OS as 'ios' | 'android',
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    deviceToken = token;
  } catch (e) {
    // Expo Go can't always issue push tokens; local reminders still work.
    console.warn('Push token unavailable', e);
  }
  return true;
}
