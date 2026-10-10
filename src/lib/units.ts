import type { Profile } from './supabase';

export type DistanceUnit = 'km' | 'mi';
const KM_PER_MI = 1.609344;
const MILES_COUNTRIES = new Set(['US', 'GB', 'LR', 'MM']);

/** The person's choice, or miles where that's the local norm. */
export function distanceUnit(profile: Pick<Profile, 'distance_unit' | 'country_code'> | null | undefined): DistanceUnit {
  if (profile?.distance_unit === 'km' || profile?.distance_unit === 'mi') return profile.distance_unit;
  return MILES_COUNTRIES.has((profile?.country_code ?? '').toUpperCase()) ? 'mi' : 'km';
}

export const toKm = (value: number, unit: DistanceUnit) => (unit === 'mi' ? value * KM_PER_MI : value);

/** e.g. "450 m", "2.4 km", "0.3 mi", "1,240 mi". */
export function formatDistance(km: number, unit: DistanceUnit) {
  if (unit === 'mi') {
    const mi = km / KM_PER_MI;
    return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi).toLocaleString()} mi`;
  }
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString()} km`;
}
