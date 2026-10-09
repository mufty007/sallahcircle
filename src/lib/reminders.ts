import { router } from 'expo-router';

import { notificationsSupported } from './notifications';
import { fetchDay, formatTime, PRAYER_KEYS, PRAYER_LABEL, type PrayerKey } from './prayer-times';
import { supabase, type Profile } from './supabase';

/** iOS keeps at most 64 pending local notifications; leave headroom. */
const MAX_PENDING = 60;
const DAYS_AHEAD = 6;
const CHANNEL_SOUND = 'prayer';
const CHANNEL_SILENT = 'prayer-silent';

let handlerReady = false;
/** Load expo-notifications and set up the foreground handler and Android channels (once). */
export async function prepareNotifications() {
  const N = await import('expo-notifications');
  if (!handlerReady) {
    handlerReady = true;
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
    });
    await N.setNotificationChannelAsync(CHANNEL_SOUND, { name: 'Prayer reminders', importance: N.AndroidImportance.HIGH, sound: 'default' });
    await N.setNotificationChannelAsync('nudges', { name: 'Nudges from your circles', importance: N.AndroidImportance.HIGH, sound: 'default' });
    await N.setNotificationChannelAsync(CHANNEL_SILENT, { name: 'Silent prayer reminders', importance: N.AndroidImportance.DEFAULT, sound: null, vibrationPattern: [0] });
  }
  return N;
}

type Planned = { id: string; at: Date; title: string; body: string; silent: boolean; data: { prayer?: PrayerKey; date: string; kind: 'at' | 'before' | 'jumuah' | 'fast' } };

/** DD-MM-YYYY → YYYY-MM-DD */
const iso = (dmy: string) => dmy.split('-').reverse().join('-');

async function plan(userId: string, profile: Profile): Promise<Planned[]> {
  if (profile.latitude == null || profile.longitude == null) return [];
  // Excused days: no prayer or fasting reminders until they end.
  if (profile.paused_since) return [];
  const place = { latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone };

  const [r, s] = await Promise.all([
    supabase.from('prayer_reminders').select('prayer, enabled, sound').eq('user_id', userId),
    supabase.from('reminder_settings').select('heads_up_minutes, fasting_reminders, jumuah_reminder').eq('user_id', userId).maybeSingle(),
  ]);
  if (r.error) throw r.error;
  if (s.error) throw s.error;
  const prefs = new Map((r.data ?? []).map((x) => [x.prayer, x]));
  const headsUp = s.data?.heads_up_minutes ?? 0;
  const fasting = s.data?.fasting_reminders ?? false;
  const jumuah = s.data?.jumuah_reminder ?? true;

  const start = Date.now();
  const days = await Promise.all(
    Array.from({ length: DAYS_AHEAD }, (_, i) => fetchDay(place, profile.calc_method, profile.asr_method, new Date(start + i * 86_400_000)).catch(() => null)),
  );

  const out: Planned[] = [];
  const extras: Planned[] = [];
  const time = (d: Date) => formatTime(d, profile.timezone, true);
  for (const day of days) {
    if (!day) continue;
    const date = iso(day.date);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const ramadan = day.hijri.month.number === 9;
    const extra = (key: string, at: Date, title: string, body: string, kind: 'jumuah' | 'fast') =>
      extras.push({ id: `${date}-${key}`, at, title, body, silent: false, data: { date, kind } });

    if (jumuah && weekday === 5) {
      extra('jumuah-morning', new Date(day.sunrise.getTime() + 2 * 3_600_000), 'Jumuʿah Mubārak', 'A good day to read Sūrat al-Kahf and send ṣalawāt.', 'jumuah');
      extra('jumuah-soon', new Date(day.times.dhuhr.getTime() - 3_600_000), 'Jumuʿah in 1 hour', `Head out early. Dhuhr is at ${time(day.times.dhuhr)}.`, 'jumuah');
    }
    if (fasting) {
      if (ramadan) {
        extra('suhur', new Date(day.imsak.getTime() - 30 * 60_000), 'Suḥūr ends in 30 min', `Imsāk at ${time(day.imsak)}. Eat something, it’s blessed.`, 'fast');
        extra('iftar', day.times.maghrib, `Ifṭār · ${time(day.times.maghrib)}`, 'Time to break your fast. Make duʿāʾ, it’s answered now.', 'fast');
      } else {
        if (weekday === 0 || weekday === 3) {
          extra('sunnah-fast', day.times.isha, `Fast tomorrow? It’s ${weekday === 0 ? 'Monday' : 'Thursday'}`, 'A sunnah fast. Set your intention and eat suḥūr.', 'fast');
        }
        if (day.hijri.day === '12') {
          extra('white-days', day.times.isha, 'The white days start tomorrow', 'Fasting the 13th, 14th and 15th is a sunnah.', 'fast');
        }
      }
    }
    for (const p of PRAYER_KEYS) {
      const pref = prefs.get(p) ?? { enabled: true, sound: 'chime' as const };
      if (!pref.enabled) continue;
      const at = day.times[p];
      const name = PRAYER_LABEL[p];
      const silent = pref.sound === 'silent';
      out.push({
        id: `${date}-${p}-at`,
        at,
        title: `${name} · ${formatTime(at, profile.timezone, true)}`,
        body: `It’s time for ${name}. Tap to log it when you’ve prayed.`,
        silent,
        data: { prayer: p, date, kind: 'at' },
      });
      if (headsUp > 0) {
        out.push({
          id: `${date}-${p}-before`,
          at: new Date(at.getTime() - headsUp * 60_000),
          title: `${name} in ${headsUp} min`,
          body: `Get ready, ${name} is at ${formatTime(at, profile.timezone, true)}.`,
          silent,
          data: { prayer: p, date, kind: 'before' },
        });
      }
    }
  }
  // Extras are few, so they're always kept; prayer reminders fill the remaining slots.
  const upcoming = (list: Planned[]) => list.filter((n) => n.at.getTime() > start + 5_000).sort((a, b) => a.at.getTime() - b.at.getTime());
  const kept = upcoming(extras).slice(0, 12);
  return [...kept, ...upcoming(out).slice(0, MAX_PENDING - kept.length)].sort((a, b) => a.at.getTime() - b.at.getTime());
}

let queue: Promise<unknown> = Promise.resolve();
let lastSignature = '';

/**
 * Replace the device's scheduled prayer reminders with the next few days, based on the
 * user's saved preferences. Safe to call often: runs serially and skips if nothing changed.
 * Returns how many notifications are scheduled (or null where unsupported / not permitted).
 */
export function syncReminders(userId: string, profile: Profile, force = false): Promise<number | null> {
  const run = async () => {
    if (!notificationsSupported) return null;
    const N = await prepareNotifications();
    const { status } = await N.getPermissionsAsync();
    if (status !== 'granted') return null;

    const planned = await plan(userId, profile);
    const signature = JSON.stringify(planned.map((n) => [n.id, n.at.getTime(), n.silent]));
    if (!force && signature === lastSignature) return planned.length;

    await N.cancelAllScheduledNotificationsAsync();
    for (const n of planned) {
      await N.scheduleNotificationAsync({
        identifier: n.id,
        content: { title: n.title, body: n.body, data: n.data, sound: n.silent ? false : 'default', interruptionLevel: 'timeSensitive' },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: n.silent ? CHANNEL_SILENT : CHANNEL_SOUND },
      });
    }
    lastSignature = signature;
    return planned.length;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

/** Remove every scheduled reminder (e.g. on sign out). */
export async function clearReminders() {
  lastSignature = '';
  if (!notificationsSupported) return;
  const N = await prepareNotifications();
  await N.cancelAllScheduledNotificationsAsync();
}

const handled = new Set<string>();

/** Route a tapped notification (including the one that launched the app): reminders open the log sheet, nudges open Activity. */
export async function listenForReminderTaps() {
  if (!notificationsSupported) return () => {};
  const N = await prepareNotifications();
  const open = (res: import('expo-notifications').NotificationResponse) => {
    const req = res.notification.request;
    if (handled.has(req.identifier) || res.actionIdentifier !== N.DEFAULT_ACTION_IDENTIFIER) return;
    handled.add(req.identifier);
    const data = req.content.data as (Partial<Planned['data']> & { type?: string }) | undefined;
    if (data?.type === 'nudge') router.push('/activity');
    else if (data?.kind === 'fast') router.push('/fasting');
    else if (data?.kind === 'at' && data.prayer && data.date) {
      router.push({ pathname: '/log-prayer', params: { prayer: data.prayer, date: data.date } });
    }
    N.clearLastNotificationResponse();
  };
  const last = N.getLastNotificationResponse();
  if (last) open(last);
  const sub = N.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
