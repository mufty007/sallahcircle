import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { fetchMonth, formatTime, PRAYER_KEYS, PRAYER_LABEL } from './prayer-times';
import type { Profile } from './supabase';

/** expo-widgets is iOS-only and not in Expo Go, so it's loaded only in iOS builds. */
const widgetsSupported = Platform.OS === 'ios' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/**
 * Give the home-screen widget a timeline: from each prayer time it shows the one after,
 * so it stays correct for the next couple of days without the app running.
 */
export async function updatePrayerWidget(profile: Profile | null) {
  if (!widgetsSupported || !profile || profile.latitude == null || profile.longitude == null) return;
  const { default: widget } = await import('../widgets/next-prayer');
  const place = { latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone };
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const months = await Promise.all([
    fetchMonth(place, profile.calc_method, profile.asr_method, now.getUTCFullYear(), now.getUTCMonth() + 1),
    fetchMonth(place, profile.calc_method, profile.asr_method, next.getUTCFullYear(), next.getUTCMonth() + 1).catch(() => []),
  ]);
  const times = months
    .flat()
    .flatMap((d) => PRAYER_KEYS.map((p) => ({ name: PRAYER_LABEL[p], at: d.times[p] })))
    .filter((t) => t.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 16);
  if (times.length < 2) return;

  const label = (d: Date) => formatTime(d, profile.timezone, true);
  const entry = (i: number) => ({
    name: times[i].name,
    at: times[i].at.getTime(),
    timeLabel: label(times[i].at),
    thenName: times[i + 1]?.name ?? '',
    thenLabel: times[i + 1] ? label(times[i + 1].at) : '',
    city: profile.city ?? '',
  });
  widget.updateTimeline([
    { date: now, props: entry(0) },
    // At each prayer time, switch to counting down to the following one.
    ...times.slice(0, -1).map((t, i) => ({ date: t.at, props: entry(i + 1) })),
  ]);
}
