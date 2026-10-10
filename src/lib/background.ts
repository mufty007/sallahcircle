import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';

import { currentPushToken, notificationsSupported } from './notifications';
import { PRAYER_LABEL } from './prayer-times';
import { CHANNEL_NUDGES, CHIME, prepareNotifications, syncReminders } from './reminders';
import { supabase } from './supabase';

/**
 * Background refresh (Android WorkManager / iOS BGTaskScheduler, roughly every 15–30 min).
 * Without Firebase there's no remote push on Android, so this task:
 *  1. tops up the prayer reminders scheduled on the phone, so they never run out;
 *  2. checks Supabase for new nudges and replies, and shows them as notifications.
 * Phones that do have a push token (iPhones) get nudges by push instead, so step 2 is skipped there.
 */
export const BACKGROUND_TASK = 'salah-circle-refresh';
const LAST_CHECK_KEY = 'nudges-last-check';

const KIND_TITLE: Record<string, (name: string, prayer: string) => string> = {
  together: (n, p) => `${n} wants to pray ${p} together`,
  dua: (n) => `${n} made duʿāʾ for you`,
  voice: (n) => `${n} sent you a voice note`,
  nudge: (n, p) => `${n} nudged you for ${p}`,
};

const minutesNow = (tz: string | null) => {
  const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz ?? undefined }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0) * 60 + Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
};
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
function inQuietHours(start: string | null, end: string | null, tz: string | null) {
  if (!start || !end) return false;
  const now = minutesNow(tz);
  const s = toMin(start);
  const e = toMin(end);
  return s <= e ? now >= s && now < e : now >= s || now < e;
}

/** Mark everything up to now as seen (the app is open, so Activity already shows it). */
export const markNudgesSeen = () => AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString()).catch(() => {});

async function notifyNewNudges(userId: string, timezone: string | null) {
  const since = await AsyncStorage.getItem(LAST_CHECK_KEY).catch(() => null);
  const now = new Date().toISOString();
  await markNudgesSeen();
  // First run, or the app is open (Activity updates live): nothing to announce.
  if (!since || AppState.currentState === 'active') return;

  const [received, replies, settings] = await Promise.all([
    supabase
      .from('nudges')
      .select('id, kind, prayer, message, sender:profiles!nudges_from_user_fkey(display_name, username)')
      .eq('to_user', userId)
      .gt('created_at', since)
      .lte('created_at', now)
      .order('created_at')
      .limit(10),
    supabase
      .from('nudges')
      .select('id, response, recipient:profiles!nudges_to_user_fkey(display_name, username)')
      .eq('from_user', userId)
      .gt('responded_at', since)
      .lte('responded_at', now)
      .limit(10),
    supabase.from('reminder_settings').select('allow_nudges, quiet_start, quiet_end').eq('user_id', userId).maybeSingle(),
  ]);
  const N = await prepareNotifications();
  const quiet = inQuietHours(settings.data?.quiet_start ?? null, settings.data?.quiet_end ?? null, timezone);
  const show = (title: string, body: string, id: string) =>
    N.scheduleNotificationAsync({
      content: { title, body, sound: quiet ? false : CHIME, data: { type: 'nudge', id } },
      trigger: { channelId: quiet ? 'prayer-silent' : CHANNEL_NUDGES },
    });

  if (settings.data?.allow_nudges !== false) {
    for (const n of received.data ?? []) {
      const name = n.sender?.display_name ?? n.sender?.username ?? 'Someone';
      const prayer = PRAYER_LABEL[n.prayer];
      await show((KIND_TITLE[n.kind] ?? KIND_TITLE.nudge)(name, prayer), n.message ?? `Don’t miss ${prayer}.`, n.id);
    }
  }
  for (const r of replies.data ?? []) {
    const name = r.recipient?.display_name ?? r.recipient?.username ?? 'Someone';
    if (r.response) await show(`${name} replied`, r.response, r.id);
  }
}

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !notificationsSupported) return BackgroundTask.BackgroundTaskResult.Success;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!profile) return BackgroundTask.BackgroundTaskResult.Success;

    await syncReminders(userId, profile).catch(() => null);
    // With a push token (iPhone), nudges already arrive by push from Supabase.
    if (!currentPushToken()) await notifyNewNudges(userId, profile.timezone);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Ask the OS to run the refresh periodically (it decides exactly when). */
export async function startBackgroundRefresh() {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (!(await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK))) {
    await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, { minimumInterval: 15 });
  }
}

export async function stopBackgroundRefresh() {
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)) await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK);
}
