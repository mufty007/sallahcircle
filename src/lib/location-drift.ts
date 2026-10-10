import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { invalidate } from '@/lib/data';
import { describePlace, deviceTimezone, kmBetween, type Place } from '@/lib/place';
import { syncReminders } from '@/lib/reminders';
import type { Profile } from '@/lib/supabase';

/**
 * Salah times shift about a minute every 20 km. Anything closer is a commute,
 * not a new place — and a coarse fix can be off by several kilometres.
 */
const MOVED_KM = 30;
/** "Not now" stays quiet for a day, unless they move on again. */
const SNOOZE_MS = 24 * 60 * 60 * 1000;
/** Don't spin up another fix just because the app flickered to the background. */
const CHECK_GAP_MS = 2 * 60 * 1000;

export type Drift = {
  reason: 'moved' | 'timezone';
  savedLabel: string | null;
  hereLabel: string | null;
  /** GPS fix we can save in one tap. Null when we only noticed a time-zone change. */
  here: Place | null;
  anchor: { latitude: number; longitude: number };
};

type Snap = { drift: Drift | null; busy: boolean; error: string | null };
type Snooze = { until: number; latitude: number; longitude: number };
type Saved = { latitude: number; longitude: number; timezone: string | null; city: string | null; region: string | null };

let snap: Snap = { drift: null, busy: false, error: null };
let generation = 0;
let lastDetectAt = 0;
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function publish(patch: Partial<Snap>) {
  const next = { ...snap, ...patch };
  if (next.busy === snap.busy && next.error === snap.error && JSON.stringify(next.drift) === JSON.stringify(snap.drift)) return;
  snap = next;
  listeners.forEach((l) => l());
}

const snoozeKey = (userId: string) => `location-snooze:${userId}`;
const placeLabel = (city: string | null, region: string | null) => [city, region].filter(Boolean).join(', ') || null;

function movedFar(km: number, accuracyMeters: number | null) {
  const slackKm = accuracyMeters == null ? 0 : accuracyMeters / 1000;
  return km - slackKm >= MOVED_KM;
}

async function readSnooze(userId: string): Promise<Snooze | null> {
  const raw = await AsyncStorage.getItem(snoozeKey(userId)).catch(() => null);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Snooze;
    if (typeof v.until !== 'number' || typeof v.latitude !== 'number' || typeof v.longitude !== 'number') return null;
    return v;
  } catch {
    return null;
  }
}

const snoozeBlocks = (snooze: Snooze | null, point: { latitude: number; longitude: number }) =>
  !!snooze && Date.now() < snooze.until && kmBetween(snooze, point) < MOVED_KM;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
    );
  });
}

/** A fresh coarse fix, falling back to a recent cached one. Never asks for permission. */
async function readFix(): Promise<Location.LocationObject | null> {
  const fresh = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low, mayShowUserSettingsDialog: false }),
    8_000,
  );
  if (fresh) return fresh;
  return Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000, requiredAccuracy: 15_000 });
}

async function detect(userId: string, saved: Saved, gen: number, force: boolean) {
  if (!force && Date.now() - lastDetectAt < CHECK_GAP_MS) return;
  lastDetectAt = Date.now();

  const tzChanged = !!saved.timezone && saved.timezone !== deviceTimezone();
  const finish = (drift: Drift | null) => {
    if (gen !== generation || snap.busy) return;
    publish({ drift, error: null });
  };

  let granted = false;
  try {
    granted = (await Location.getForegroundPermissionsAsync()).status === 'granted';
  } catch {
    granted = false;
  }

  const snooze = await readSnooze(userId);
  if (gen !== generation) return;

  if (!granted) {
    finish(tzChanged && !snoozeBlocks(snooze, saved) ? { reason: 'timezone', savedLabel: placeLabel(saved.city, saved.region), hereLabel: null, here: null, anchor: saved } : null);
    return;
  }

  const pos = await readFix().catch(() => null);
  if (gen !== generation) return;
  if (!pos) {
    finish(tzChanged && !snoozeBlocks(snooze, saved) ? { reason: 'timezone', savedLabel: placeLabel(saved.city, saved.region), hereLabel: null, here: null, anchor: saved } : null);
    return;
  }

  const herePoint = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  const far = movedFar(kmBetween(saved, herePoint), pos.coords.accuracy);
  if ((!far && !tzChanged) || snoozeBlocks(snooze, herePoint)) {
    finish(null);
    return;
  }

  const place = await describePlace(herePoint.latitude, herePoint.longitude);
  finish({
    reason: far ? 'moved' : 'timezone',
    savedLabel: placeLabel(saved.city, saved.region),
    hereLabel: placeLabel(place.city, place.region),
    here: place,
    anchor: saved,
  });
}

/** Check for a moved phone once the user is in the app, and again each time it comes forward. */
export function useLocationWatch(userId: string | undefined, profile: Profile | null) {
  const lat = profile?.latitude;
  const lng = profile?.longitude;
  const tz = profile?.timezone;
  const city = profile?.city;
  const region = profile?.region;

  useEffect(() => {
    if (!userId || lat == null || lng == null) {
      generation++;
      publish({ drift: null, error: null, busy: false });
      return;
    }
    const saved: Saved = { latitude: lat, longitude: lng, timezone: tz ?? null, city: city ?? null, region: region ?? null };
    const gen = ++generation;
    const run = (force: boolean) => void detect(userId, saved, gen, force).catch(() => {});
    run(true);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') run(false);
    });
    return () => {
      generation++;
      sub.remove();
    };
  }, [userId, lat, lng, tz, city, region]);
}

export function useLocationDrift() {
  return useSyncExternalStore(subscribe, () => snap, () => snap);
}

type SavePlace = (patch: {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country_code: string | null;
  timezone: string;
}) => Promise<Profile>;

/** Save the detected place and reschedule reminders for it. */
export async function applyLocationDrift(userId: string, updateProfile: SavePlace) {
  const here = snap.drift?.here;
  if (!here || snap.busy) return;
  publish({ busy: true, error: null });
  try {
    const saved = await updateProfile({
      latitude: here.latitude,
      longitude: here.longitude,
      city: here.city,
      region: here.region,
      country_code: here.country_code,
      timezone: here.timezone ?? deviceTimezone(),
    });
    await AsyncStorage.removeItem(snoozeKey(userId)).catch(() => {});
    syncReminders(userId, saved, true).catch((e) => console.warn('Reminder sync failed', e));
    invalidate();
    publish({ drift: null, busy: false, error: null });
  } catch (e) {
    publish({ busy: false, error: e instanceof Error ? e.message : 'Could not update your location.' });
  }
}

/** Hide the prompt for a day, or until they move somewhere else. */
export async function snoozeLocationDrift(userId: string) {
  const d = snap.drift;
  if (!d) return;
  const point = d.here ?? d.anchor;
  const snooze: Snooze = { until: Date.now() + SNOOZE_MS, latitude: point.latitude, longitude: point.longitude };
  await AsyncStorage.setItem(snoozeKey(userId), JSON.stringify(snooze)).catch(() => {});
  publish({ drift: null, error: null, busy: false });
}
