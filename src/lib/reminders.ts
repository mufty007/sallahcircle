import { router } from 'expo-router';

import { addDays, localDateTime } from './cycle';
import { currentPushToken, notificationsSupported, registerForNotifications } from './notifications';
import { fetchMonth, formatTime, PRAYER_KEYS, PRAYER_LABEL, shiftHijri, type DayTimes, type PrayerKey } from './prayer-times';
import { supabase, type Profile } from './supabase';

/** iOS keeps at most 64 pending local notifications; leave headroom. */
const MAX_PENDING = 60;
/** Local notifications cover a few days; server pushes cover a month. */
const LOCAL_DAYS = 6;
const SERVER_DAYS = 30;
// Android channels can't change sound once created, so these IDs carry the sound name.
export const CHIME = 'chime.wav';
const CHANNEL_SOUND = 'prayer-chime';
export const CHANNEL_NUDGES = 'nudges-chime';
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
    await N.setNotificationChannelAsync(CHANNEL_SOUND, { name: 'Prayer reminders', importance: N.AndroidImportance.HIGH, sound: CHIME });
    await N.setNotificationChannelAsync(CHANNEL_NUDGES, { name: 'Nudges from your circles', importance: N.AndroidImportance.HIGH, sound: CHIME });
    // Channels from earlier versions (default sound).
    await Promise.all(['prayer', 'nudges'].map((id) => N.deleteNotificationChannelAsync(id).catch(() => {})));
    await N.setNotificationChannelAsync(CHANNEL_SILENT, { name: 'Silent prayer reminders', importance: N.AndroidImportance.DEFAULT, sound: null, vibrationPattern: [0] });
  }
  return N;
}

type Kind = 'at' | 'before' | 'jumuah' | 'fast' | 'recap' | 'excused';
type Planned = { id: string; at: Date; title: string; body: string; silent: boolean; data: { prayer?: PrayerKey; date: string; kind: Kind } };

/** DD-MM-YYYY → YYYY-MM-DD */
const iso = (dmy: string) => dmy.split('-').reverse().join('-');

/** One reminder, the morning after the length they set, including while prayer reminders are paused. */
async function excusedLimit(userId: string, profile: Profile, nowMs: number): Promise<Planned | null> {
  if (!profile.track_excused) return null;
  const { data, error } = await supabase
    .from('excused_periods')
    .select('started_on, expected_days, continued')
    .eq('user_id', userId)
    .is('ended_on', null)
    .maybeSingle();
  if (error || !data?.expected_days || data.continued) return null;
  const date = addDays(data.started_on, data.expected_days);
  const at = localDateTime(date, 8, 0, profile.timezone);
  if (at.getTime() <= nowMs + 5_000) return null;
  return {
    id: 'excused-limit',
    at,
    title: 'Excused days',
    body: `This is longer than the ${data.expected_days} days you set. You can end them or continue.`,
    silent: false,
    data: { date, kind: 'excused' },
  };
}

async function plan(userId: string, profile: Profile, daysAhead: number, cap: number): Promise<Planned[]> {
  const nowMs = Date.now();
  const notice = await excusedLimit(userId, profile, nowMs);
  const withNotice = (rest: Planned[]) => (notice ? [notice, ...rest.filter((n) => n.id !== notice.id)].slice(0, cap) : rest);
  if (profile.latitude == null || profile.longitude == null) return withNotice([]);
  // Excused days: no prayer or fasting reminders until they end. The length reminder still goes out.
  if (profile.paused_since) return withNotice([]);
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

  const start = nowMs;
  // This month and next (two requests), trimmed to the window starting today.
  const now = new Date(start);
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const months = await Promise.all([
    fetchMonth(place, profile.calc_method, profile.asr_method, now.getUTCFullYear(), now.getUTCMonth() + 1).catch(() => [] as DayTimes[]),
    fetchMonth(place, profile.calc_method, profile.asr_method, nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1).catch(() => [] as DayTimes[]),
  ]);
  const all = shiftHijri(months.flat(), profile.hijri_offset ?? 0);
  const firstIdx = all.findIndex((d) => d.times.isha.getTime() > start);
  const days = firstIdx < 0 ? [] : all.slice(firstIdx, firstIdx + daysAhead);

  const out: Planned[] = [];
  const extras: Planned[] = [];
  const time = (d: Date) => formatTime(d, profile.timezone, true);
  for (const day of days) {
    const date = iso(day.date);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const ramadan = day.hijri.month.number === 9;
    const extra = (key: string, at: Date, title: string, body: string, kind: 'jumuah' | 'fast' | 'recap') =>
      extras.push({ id: `${date}-${key}`, at, title, body, silent: false, data: { date, kind } });

    // Sunday evening: weekly recap (the server fills in the numbers when it sends).
    if (weekday === 0) extra('recap', new Date(day.times.isha.getTime() + 45 * 60_000), 'Your week in prayer', 'Tap to see how your week went.', 'recap');
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
  const kept = upcoming(extras).slice(0, Math.min(12, cap));
  return withNotice([...kept, ...upcoming(out).slice(0, cap - kept.length)].sort((a, b) => a.at.getTime() - b.at.getTime()));
}

let queue: Promise<unknown> = Promise.resolve();
let lastSignature = '';

export type ReminderStatus = { mode: 'server' | 'local'; count: number } | null;

/** Upload reminders for the server to push (replaces this person's unsent ones). */
async function uploadSchedule(userId: string, planned: Planned[]) {
  const { error: delErr } = await supabase.from('scheduled_pushes').delete().eq('user_id', userId).is('sent_at', null);
  if (delErr) throw delErr;
  const rows = planned.map((n) => ({
    user_id: userId,
    key: n.id,
    send_at: n.at.toISOString(),
    kind: n.data.kind,
    title: n.title,
    body: n.body,
    data: n.data,
    silent: n.silent,
  }));
  for (let i = 0; i < rows.length; i += 200) {
    // Rows already sent keep their key, so re-uploading never sends twice.
    const { error } = await supabase.from('scheduled_pushes').upsert(rows.slice(i, i + 200), { onConflict: 'user_id,key', ignoreDuplicates: true });
    if (error) throw error;
  }
}

/**
 * Keep reminders in step with the user's preferences. Safe to call often: runs serially and
 * skips if nothing changed.
 * - With a push token, the server sends the next 30 days, even if the app isn't opened.
 * - Without one, the phone schedules the next few days itself.
 */
export function syncReminders(userId: string, profile: Profile, force = false): Promise<ReminderStatus> {
  const run = async (): Promise<ReminderStatus> => {
    if (!notificationsSupported) return null;
    const N = await prepareNotifications();
    const { status } = await N.getPermissionsAsync();
    if (status !== 'granted') return null;

    if (!currentPushToken()) await registerForNotifications(userId, false).catch(() => false);
    const server = !!currentPushToken();
    const planned = await plan(userId, profile, server ? SERVER_DAYS : LOCAL_DAYS, server ? 400 : MAX_PENDING);
    const signature = JSON.stringify([server, planned.map((n) => [n.id, n.at.getTime(), n.silent, n.title])]);
    if (!force && signature === lastSignature) return { mode: server ? 'server' : 'local', count: planned.length };

    await N.cancelAllScheduledNotificationsAsync();
    if (server) {
      await uploadSchedule(userId, planned);
    } else {
      for (const n of planned) {
        await N.scheduleNotificationAsync({
          identifier: n.id,
          content: { title: n.title, body: n.body, data: n.data, sound: n.silent ? false : CHIME, interruptionLevel: 'timeSensitive' },
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: n.silent ? CHANNEL_SILENT : CHANNEL_SOUND },
        });
      }
    }
    lastSignature = signature;
    return { mode: server ? 'server' : 'local', count: planned.length };
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

/** Remove every scheduled reminder, on the phone and on the server (e.g. on sign out). */
export async function clearReminders() {
  lastSignature = '';
  await supabase
    .from('scheduled_pushes')
    .delete()
    .is('sent_at', null)
    .then(
      () => {},
      () => {},
    );
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
    else if (data?.kind === 'recap') router.push('/me');
    else if (data?.kind === 'excused') router.push('/excused');
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
