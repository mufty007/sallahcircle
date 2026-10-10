import * as Location from 'expo-location';

export type Place = {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country_code: string | null;
  /** IANA zone for the place, or the phone's zone when geocoding has none. */
  timezone: string | null;
};

/** ~1 km: accurate prayer times without sharing an exact address. */
export const roundCoord = (n: number) => Math.round(n * 100) / 100;

export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const iana = (tz: string | null | undefined) => (tz && tz.includes('/') ? tz : null);

export async function describePlace(latitude: number, longitude: number): Promise<Place> {
  let geo: Location.LocationGeocodedAddress | undefined;
  try {
    [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
  } catch {
    // Reverse geocoding isn't available everywhere (e.g. web); coordinates are enough.
  }
  return {
    latitude: roundCoord(latitude),
    longitude: roundCoord(longitude),
    city: geo?.city ?? geo?.subregion ?? geo?.district ?? null,
    region: geo?.region ?? null,
    country_code: geo?.isoCountryCode?.toUpperCase() ?? null,
    timezone: iana(geo?.timezone) ?? deviceTimezone(),
  };
}

/** Great-circle distance in kilometres. */
export function kmBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
