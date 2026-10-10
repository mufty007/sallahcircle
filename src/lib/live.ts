import { useEffect } from 'react';
import { AppState } from 'react-native';

import { invalidate } from './data';
import { registerForNotifications } from './notifications';
import { listenForReminderTaps, syncReminders } from './reminders';
import { supabase, type Profile } from './supabase';
import { updatePrayerWidget } from './widget';

/**
 * Keeps a signed-in session fresh while the app is open:
 * - reschedules prayer reminders when the profile changes or the app returns to the foreground
 * - opens the log sheet from a tapped reminder
 * - refetches queries when nudges or circle-mates' prayers change (Supabase Realtime)
 */
export function useLiveSync(userId: string | undefined, profile: Profile | null) {
  useEffect(() => {
    if (!userId || !profile) return;
    syncReminders(userId, profile).catch((e) => console.warn('Reminder sync failed', e));
    updatePrayerWidget(profile).catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        invalidate();
        syncReminders(userId, profile).catch(() => {});
        updatePrayerWidget(profile).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [userId, profile]);

  // Keep this device's push token current (no prompt; permission is asked during setup).
  useEffect(() => {
    if (userId) registerForNotifications(userId, false).catch(() => {});
  }, [userId]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let live = true;
    listenForReminderTaps().then((s) => (live ? (stop = s) : s()));
    return () => {
      live = false;
      stop?.();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Several rows often change together (log + details); refetch once.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(invalidate, 300);
    };
    const channel = supabase
      .channel(`live:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nudges' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_logs' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'circle_members' }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
