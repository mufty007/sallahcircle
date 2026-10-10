import { geoDistance } from 'd3-geo';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Chip, glass, hairline, Tap } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { useQuery } from '@/lib/data';
import { distanceUnit, formatDistance, toKm, type DistanceUnit } from '@/lib/units';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

// Places of worship from OpenStreetMap (© OpenStreetMap contributors, ODbL).
// Overpass gives complete results but its free public servers are often overloaded (504s), so we
// try a few mirrors with short timeouts and fall back to Photon's name search if they're all down.
const OVERPASS_MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const PHOTON = 'https://photon.komoot.io/api/';
const RADII: Record<DistanceUnit, number[]> = { km: [3, 10, 25], mi: [2, 5, 15] };

type Masjid = { id: string; name: string; lat: number; lng: number; km: number; address: string | null };
type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
type PhotonFeature = { geometry: { coordinates: [number, number] }; properties: { osm_type: string; osm_id: number; name?: string; street?: string; housenumber?: string; city?: string } };

const kmBetween = (lat: number, lng: number, la: number, lo: number) => geoDistance([lng, lat], [lo, la]) * 6371;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fromOverpass(lat: number, lng: number, radiusKm: number): Promise<Masjid[]> {
  const query = `[out:json][timeout:12];nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${Math.round(radiusKm * 1000)},${lat},${lng});out center 80;`;
  let lastError: unknown;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SalahCircle/1.0 (prayer app)' }, body: `data=${encodeURIComponent(query)}` }, 12_000);
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = (await res.json()) as { elements: El[] };
      return json.elements.flatMap((e) => {
        const la = e.lat ?? e.center?.lat;
        const lo = e.lon ?? e.center?.lon;
        if (la == null || lo == null) return [];
        const t = e.tags ?? {};
        const address = [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ') || null;
        return [{ id: `${e.type[0]}${e.id}`, name: t.name ?? t['name:en'] ?? 'Masjid', lat: la, lng: lo, km: kmBetween(lat, lng, la, lo), address }];
      });
    } catch (e) {
      lastError = e; // try the next mirror
    }
  }
  throw lastError;
}

async function fromPhoton(lat: number, lng: number, radiusKm: number): Promise<Masjid[]> {
  const terms = ['mosque', 'masjid', 'islamic'];
  const results = await Promise.all(
    terms.map(async (q) => {
      const url = `${PHOTON}?q=${q}&lat=${lat}&lon=${lng}&limit=50&osm_tag=amenity:place_of_worship`;
      const res = await fetchWithTimeout(url, {}, 10_000);
      if (!res.ok) return [];
      return ((await res.json()) as { features: PhotonFeature[] }).features;
    }),
  );
  const seen = new Set<string>();
  return results.flat().flatMap((f) => {
    const id = `${f.properties.osm_type.toLowerCase()}${f.properties.osm_id}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const [lo, la] = f.geometry.coordinates;
    const km = kmBetween(lat, lng, la, lo);
    if (km > radiusKm) return [];
    const p = f.properties;
    const address = [p.housenumber, p.street, p.city].filter(Boolean).join(' ') || null;
    return [{ id, name: p.name ?? 'Masjid', lat: la, lng: lo, km, address }];
  });
}

async function findMasjids(lat: number, lng: number, radiusKm: number): Promise<Masjid[]> {
  let list: Masjid[];
  try {
    list = await fromOverpass(lat, lng, radiusKm);
  } catch {
    try {
      list = await fromPhoton(lat, lng, radiusKm);
    } catch {
      throw new Error('The map service isn’t responding right now.');
    }
  }
  return list.sort((a, b) => a.km - b.km);
}

function openInMaps(m: Masjid) {
  const label = encodeURIComponent(m.name);
  const url =
    Platform.OS === 'ios'
      ? `maps:?q=${label}&ll=${m.lat},${m.lng}`
      : Platform.OS === 'android'
        ? `geo:${m.lat},${m.lng}?q=${m.lat},${m.lng}(${label})`
        : `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=18/${m.lat}/${m.lng}`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`));
}


export default function MasjidsScreen() {
  const { profile, updateProfile } = useSession();
  const unit = distanceUnit(profile);
  const [here, setHere] = useState<{ lat: number; lng: number; live: boolean } | null>(null);
  const [step, setStep] = useState(0);
  const radius = RADII[unit][step];
  const radiusKm = toKm(radius, unit);

  // Prefer where you are right now (if location is allowed); fall back to your saved city.
  useEffect(() => {
    let live = true;
    const fallback = () => profile?.latitude != null && profile.longitude != null && live && setHere({ lat: profile.latitude, lng: profile.longitude, live: false });
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return fallback();
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (live) setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude, live: true });
    })().catch(fallback);
    return () => {
      live = false;
    };
  }, [profile?.latitude, profile?.longitude]);

  // Rounded to ~1 km so the cache is reused and your exact position isn't in the key.
  // Plain values (not `here!.lat`): the React Compiler reads member paths as dependencies on every render.
  const lat = here?.lat ?? null;
  const lng = here?.lng ?? null;
  const key = lat != null && lng != null ? `masjids:${lat.toFixed(2)},${lng.toFixed(2)}:${radiusKm.toFixed(1)}` : null;
  const list = useQuery(key, () => findMasjids(lat!, lng!, radiusKm));

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle k={here ? (here.live ? 'NEAR YOU' : `NEAR ${(profile?.city ?? 'YOUR CITY').toUpperCase()}`) : ' '} t="Masjids" style={{ marginTop: 16 }} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 }}>
        {RADII[unit].map((r, i) => (
          <Chip key={r} selected={i === step} bg={i === step ? '#fff' : 'rgba(255,255,255,0.08)'} c={i === step ? SC.ink : '#fff'} style={{ height: 36 }} textStyle={{ fontSize: 14 }} onPress={() => setStep(i)}>
            {`${r} ${unit}`}
          </Chip>
        ))}
        <Chip
          accessibilityLabel={`Show distances in ${unit === 'km' ? 'miles' : 'kilometres'}`}
          bg="rgba(255,255,255,0.08)"
          style={{ height: 36, marginLeft: 'auto' }}
          textStyle={{ fontSize: 14 }}
          onPress={() => updateProfile({ distance_unit: unit === 'km' ? 'mi' : 'km' }).catch(() => {})}>
          {unit === 'km' ? 'km → mi' : 'mi → km'}
        </Chip>
      </View>

      {!here && profile?.latitude == null && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 20, padding: 18 }]}>
          <T style={{ fontSize: 15, opacity: 0.7 }}>Set your location in Settings to find masjids nearby.</T>
        </View>
      )}
      {(list.loading || (!here && profile?.latitude != null)) && <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />}
      {list.error && (
        <Tap onPress={list.refresh} style={[glass, { marginHorizontal: 16, marginTop: 20, padding: 18 }]}>
          <T style={{ fontSize: 15, fontWeight: '600' }}>{list.error}</T>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Tap to try again</T>
        </Tap>
      )}
      {list.data?.length === 0 && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 20, padding: 18 }]}>
          <T style={{ fontSize: 15, fontWeight: '600' }}>{`No masjids found within ${radius} ${unit}`}</T>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Try a wider search. Missing one? Anyone can add it on OpenStreetMap.</T>
        </View>
      )}
      {!!list.data?.length && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 16, paddingHorizontal: 16 }]}>
          {list.data.map((m, i) => (
            <Tap
              key={m.id}
              onPress={() => openInMaps(m)}
              accessibilityLabel={`${m.name}, ${formatDistance(m.km, unit)} away. Opens in Maps.`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="pin" s={18} c={SC.mint} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                  {m.name}
                </T>
                {m.address && (
                  <T style={{ fontSize: 12, opacity: 0.55 }} numberOfLines={1}>
                    {m.address}
                  </T>
                )}
              </View>
              <T style={{ fontSize: 13, opacity: 0.7 }}>{formatDistance(m.km, unit)}</T>
            </Tap>
          ))}
        </View>
      )}
      <T style={{ marginTop: 16, textAlign: 'center', fontSize: 11, opacity: 0.4 }}>Map data © OpenStreetMap contributors</T>
    </Screen>
  );
}
