// Prayer times and the Islamic calendar from the AlAdhan API (https://aladhan.com/prayer-times-api).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { Enums } from './supabase';

const BASE = 'https://api.aladhan.com/v1';

export type AsrMethod = Enums<'asr_method'>;
export type PrayerKey = Enums<'prayer_name'>;
/** AlAdhan calculation method id. */
export type CalcMethod = number;
export type Place = { latitude: number; longitude: number; timezone?: string | null };

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const PRAYER_LABEL: Record<PrayerKey, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };

/** AlAdhan methods (GET /v1/methods), most common first. */
export const METHODS: { id: CalcMethod; name: string; sub: string }[] = [
  { id: 2, name: 'ISNA', sub: 'North America · 15°' },
  { id: 3, name: 'Muslim World League', sub: 'Europe, Far East · 18°' },
  { id: 4, name: 'Umm al-Qura', sub: 'Arabian Peninsula' },
  { id: 5, name: 'Egyptian Authority', sub: 'Africa, Levant · 19.5°' },
  { id: 1, name: 'Karachi', sub: 'Pakistan, South Asia · 18°' },
  { id: 15, name: 'Moonsighting Committee', sub: 'Seasonal adjustment' },
  { id: 8, name: 'Gulf Region', sub: 'Gulf states' },
  { id: 16, name: 'Dubai', sub: 'UAE' },
  { id: 10, name: 'Qatar', sub: 'Qatar · 18°' },
  { id: 9, name: 'Kuwait', sub: 'Kuwait · 18°' },
  { id: 11, name: 'Singapore', sub: 'MUIS · Southeast Asia' },
  { id: 17, name: 'JAKIM', sub: 'Malaysia' },
  { id: 20, name: 'KEMENAG', sub: 'Indonesia' },
  { id: 13, name: 'Diyanet', sub: 'Türkiye' },
  { id: 12, name: 'UOIF', sub: 'France · 12°' },
  { id: 14, name: 'Russia', sub: 'Spiritual Administration of Muslims' },
  { id: 18, name: 'Tunisia', sub: 'Tunisia' },
  { id: 19, name: 'Algeria', sub: 'Algeria' },
  { id: 21, name: 'Morocco', sub: 'Morocco' },
  { id: 22, name: 'Lisbon', sub: 'Portugal' },
  { id: 23, name: 'Jordan', sub: 'Ministry of Awqaf' },
  { id: 7, name: 'Tehran', sub: 'Institute of Geophysics' },
  { id: 0, name: 'Jafari', sub: 'Shia Ithna-Ashari, Qum' },
];

const BY_COUNTRY: Record<string, CalcMethod> = {
  US: 2, CA: 2, SA: 4, YE: 4, EG: 5, SD: 5, LY: 5, SY: 5, LB: 5, IQ: 5, NG: 5,
  PK: 1, IN: 1, BD: 1, AF: 1, AE: 16, BH: 8, OM: 8, QA: 10, KW: 9, SG: 11,
  MY: 17, ID: 20, BN: 11, TR: 13, FR: 12, RU: 14, TN: 18, DZ: 19, MA: 21, PT: 22, JO: 23, PS: 23, IR: 7, GB: 15,
};
/** Reasonable default by country; the user can always change it. */
export const suggestMethod = (countryCode?: string | null): CalcMethod => BY_COUNTRY[countryCode ?? ''] ?? 3;

export type Hijri = {
  date: string;
  day: string;
  month: { number: number; en: string; ar: string; days: number };
  year: string;
  weekday: { en: string; ar: string };
  holidays: string[];
};

export type DayTimes = {
  times: Record<PrayerKey, Date>;
  /** Start of the fast (a few minutes before Fajr). */
  imsak: Date;
  sunrise: Date;
  sunset: Date;
  hijri: Hijri;
  timezone: string;
  /** DD-MM-YYYY (the place's local date) */
  date: string;
};

type ApiDay = {
  timings: Record<string, string>;
  date: { gregorian: { date: string }; hijri: Hijri };
  meta: { timezone: string };
};

/** DD-MM-YYYY for `d` in the given time zone. */
export function ddmmyyyy(d: Date, timezone?: string | null) {
  const parts = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone ?? undefined }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}-${get('month')}-${get('year')}`;
}

const school = (asr: AsrMethod) => (asr === 'hanafi' ? 1 : 0);
const placeQuery = (p: Place, method: CalcMethod, asr: AsrMethod) =>
  `latitude=${p.latitude}&longitude=${p.longitude}&method=${method}&school=${school(asr)}&iso8601=true` +
  (p.timezone ? `&timezonestring=${encodeURIComponent(p.timezone)}` : '');

const toDay = (d: ApiDay): DayTimes => ({
  times: {
    fajr: new Date(d.timings.Fajr),
    dhuhr: new Date(d.timings.Dhuhr),
    asr: new Date(d.timings.Asr),
    maghrib: new Date(d.timings.Maghrib),
    isha: new Date(d.timings.Isha),
  },
  imsak: new Date(d.timings.Imsak ?? d.timings.Fajr),
  sunrise: new Date(d.timings.Sunrise),
  sunset: new Date(d.timings.Sunset),
  hijri: d.date.hijri,
  timezone: d.meta.timezone,
  date: d.date.gregorian.date,
});

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.code !== 200) throw new Error(typeof body?.data === 'string' ? body.data : `Prayer times unavailable (${res.status})`);
  return body.data as T;
}

// Responses are cached in memory and on disk, so a day's times keep working offline.
const memory = new Map<string, unknown>();
async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (memory.has(key)) return memory.get(key) as T;
  const storageKey = `aladhan:${key}`;
  try {
    const value = await load();
    memory.set(key, value);
    AsyncStorage.setItem(storageKey, JSON.stringify(value)).catch(() => {});
    return value;
  } catch (e) {
    const stored = await AsyncStorage.getItem(storageKey).catch(() => null);
    if (stored) {
      const value = JSON.parse(stored) as T;
      memory.set(key, value);
      return value;
    }
    throw e;
  }
}

/** Prayer times + Hijri date for one day at a place. */
export async function fetchDay(place: Place, method: CalcMethod, asr: AsrMethod, date = new Date()): Promise<DayTimes> {
  const day = ddmmyyyy(date, place.timezone);
  const q = placeQuery(place, method, asr);
  const raw = await cached(`day:${q}:${day}`, () => getJson<ApiDay>(`/timings/${day}?${q}`));
  return toDay(raw);
}

/** A whole Gregorian month of prayer times (for the calendar). */
export async function fetchMonth(place: Place, method: CalcMethod, asr: AsrMethod, year: number, month: number): Promise<DayTimes[]> {
  const q = placeQuery(place, method, asr);
  const raw = await cached(`month:${q}:${year}-${month}`, () => getJson<ApiDay[]>(`/calendar/${year}/${month}?${q}`));
  return raw.map(toDay);
}

export type CalendarDay = { gregorian: { date: string; day: string }; hijri: Hijri };
/** Gregorian month mapped to Hijri dates, including holidays. */
export function fetchHijriMonth(year: number, month: number) {
  return cached(`gToH:${year}-${month}`, () => getJson<CalendarDay[]>(`/gToHCalendar/${month}/${year}`));
}

/** Islamic holidays for a Hijri year. */
export function fetchHolidays(hijriYear: number) {
  return cached(`holidays:${hijriYear}`, () => getJson<CalendarDay[]>(`/islamicHolidaysByHijriYear/${hijriYear}`));
}

/** The next prayer after `now`, rolling over to tomorrow's Fajr after Isha. */
export async function fetchNextPrayer(place: Place, method: CalcMethod, asr: AsrMethod, now = new Date()) {
  const today = await fetchDay(place, method, asr, now);
  for (const key of PRAYER_KEYS) if (today.times[key] > now) return { key, at: today.times[key], day: today };
  const tomorrow = await fetchDay(place, method, asr, new Date(now.getTime() + 24 * 3600 * 1000));
  return { key: 'fajr' as const, at: tomorrow.times.fajr, day: tomorrow };
}

type Async<T> = { data: T | null; error: string | null; loading: boolean };

/** Load something async whenever `key` changes (null key = skip). */
export function useAsync<T>(key: string | null, load: () => Promise<T>): Async<T> {
  const [state, setState] = useState<Async<T> & { key: string | null }>({ data: null, error: null, loading: !!key, key: null });
  useEffect(() => {
    if (!key) return;
    let live = true;
    load()
      .then((data) => live && setState({ data, error: null, loading: false, key }))
      .catch((e) => live && setState({ data: null, error: e instanceof Error ? e.message : String(e), loading: false, key }));
    return () => {
      live = false;
    };
    // `load` is recreated every render; `key` captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : { data: null, error: null, loading: !!key };
}

/** Today's (or `date`'s) prayer times for a place, from AlAdhan. */
export function useDayTimes(place: Place | null, method: CalcMethod, asr: AsrMethod, date?: Date) {
  const key = place ? `${place.latitude},${place.longitude},${place.timezone},${method},${asr},${date ? ddmmyyyy(date) : 'today'}` : null;
  return useAsync(key, () => fetchDay(place!, method, asr, date));
}

/** "4:12" or "4:12 AM" in the place's own time zone. */
export function formatTime(d: Date, timezone?: string | null, withPeriod = false) {
  const s = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone ?? undefined });
  return withPeriod ? s : s.replace(/\s?[AP]M$/, '');
}

export function formatIn(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h} hour${h === 1 ? '' : 's'}`;
}

/**
 * Apply a moon-sighting offset (±days) to a run of consecutive days: day i takes the Hijri date
 * AlAdhan gives for day i + offset. The ends of the run reuse the nearest available date.
 */
export function shiftHijri<T extends { hijri: Hijri }>(days: T[], offset: number): T[] {
  if (!offset || !days.length) return days;
  return days.map((d, i) => ({ ...d, hijri: days[Math.min(days.length - 1, Math.max(0, i + offset))].hijri }));
}

/** A Gregorian month's Hijri dates with the user's offset applied (borrows from the neighbouring months). */
export async function fetchHijriMonthAdjusted(year: number, month: number, offset: number): Promise<CalendarDay[]> {
  if (!offset) return fetchHijriMonth(year, month);
  const prev = month === 1 ? [year - 1, 12] : [year, month - 1];
  const next = month === 12 ? [year + 1, 1] : [year, month + 1];
  const [a, b, c] = await Promise.all([fetchHijriMonth(prev[0], prev[1]), fetchHijriMonth(year, month), fetchHijriMonth(next[0], next[1])]);
  const run = [...a, ...b, ...c];
  return b.map((d, i) => ({ ...d, hijri: run[a.length + i + offset]?.hijri ?? d.hijri }));
}
