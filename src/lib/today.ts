import { useAppState } from '@/state/app-state';
import { useSession } from '@/state/session';
import type { Period } from '@/theme/colors';

import { decimalHour, isoDate, useNow, useQuery } from './data';
import { fetchDay, PRAYER_KEYS, PRAYER_LABEL, type DayTimes, type PrayerKey } from './prayer-times';

const MIN = 60_000;

/** Which sky gradient fits the moment, relative to the day's prayer times. */
export function skyFor(now: Date, t: DayTimes): Period {
  const { fajr, maghrib, isha } = t.times;
  if (now < fajr) return fajr.getTime() - now.getTime() < 90 * MIN ? 'fajr' : 'isha';
  if (now < t.sunrise) return 'fajr';
  if (now.getTime() < maghrib.getTime() - 45 * MIN) return 'dhuhr';
  if (now < isha) return 'maghrib';
  return 'isha';
}

export const SKY_IS_DARK: Record<Period, boolean> = { fajr: true, dhuhr: false, maghrib: true, isha: true };

/**
 * The signed-in user's day: today's times, the next prayer (rolling to tomorrow's
 * Fajr after Isha), the live sky and dial positions.
 */
export function useMyDay(tickMs = 1000) {
  const { profile } = useSession();
  const { skyOverride } = useAppState();
  const now = useNow(tickMs);

  const tz = profile?.timezone ?? null;
  const place =
    profile?.latitude != null && profile.longitude != null ? { latitude: profile.latitude, longitude: profile.longitude, timezone: tz } : null;
  const method = profile?.calc_method ?? 2;
  const asr = profile?.asr_method ?? 'standard';
  const todayIso = isoDate(now, tz);
  const placeKey = place ? `${place.latitude},${place.longitude},${tz},${method},${asr}` : null;

  const today = useQuery(placeKey && `day:${placeKey}:${todayIso}`, () => fetchDay(place!, method, asr, now));
  const afterIsha = !!today.data && now >= today.data.times.isha;
  const tomorrow = useQuery(placeKey && afterIsha ? `day:${placeKey}:${todayIso}:next` : null, () =>
    fetchDay(place!, method, asr, new Date(now.getTime() + 24 * 3600 * 1000)),
  );

  let next: { key: PrayerKey; at: Date; date: string } | null = null;
  if (today.data) {
    const key = PRAYER_KEYS.find((p) => today.data!.times[p] > now);
    if (key) next = { key, at: today.data.times[key], date: todayIso };
    else if (tomorrow.data) next = { key: 'fajr', at: tomorrow.data.times.fajr, date: isoDate(tomorrow.data.times.fajr, tz) };
  }

  const realSky = today.data ? skyFor(now, today.data) : 'maghrib';
  const sky = skyOverride ?? realSky;
  const hour = (d: Date) => decimalHour(d, tz);

  return {
    profile,
    place,
    now,
    todayIso,
    day: today.data,
    error: today.error,
    loading: today.loading,
    next,
    sky,
    dark: SKY_IS_DARK[sky],
    dial: today.data
      ? {
          now: hour(now),
          prayers: PRAYER_KEYS.map((p) => [PRAYER_LABEL[p], hour(today.data!.times[p])] as [string, number]),
          sunrise: hour(today.data.sunrise),
          sunset: hour(today.data.sunset),
        }
      : null,
  };
}
