import { geoDistance } from 'd3-geo';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Chip, glass, hairline, Tap } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { useQuery } from '@/lib/data';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

// Places of worship from OpenStreetMap via the free Overpass API (© OpenStreetMap contributors, ODbL).
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const RADII = [3, 10, 25] as const;

type Masjid = { id: string; name: string; lat: number; lng: number; km: number; address: string | null };
type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

async function findMasjids(lat: number, lng: number, radiusKm: number): Promise<Masjid[]> {
  const sel = `["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusKm * 1000},${lat},${lng})`;
  const query = `[out:json][timeout:20];(node${sel};way${sel};relation${sel};);out center 80;`;
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SalahCircle/1.0' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(res.status === 429 ? 'Map service is busy. Try again in a minute.' : `Couldn’t search (${res.status}).`);
  const json = (await res.json()) as { elements: El[] };
  return json.elements
    .map((e) => {
      const la = e.lat ?? e.center?.lat;
      const lo = e.lon ?? e.center?.lon;
      if (la == null || lo == null) return null;
      const t = e.tags ?? {};
      const address = [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ') || null;
      return { id: `${e.type}${e.id}`, name: t.name ?? t['name:en'] ?? 'Masjid', lat: la, lng: lo, km: geoDistance([lng, lat], [lo, la]) * 6371, address };
    })
    .filter((m): m is Masjid => !!m)
    .sort((a, b) => a.km - b.km);
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

const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`);

export default function MasjidsScreen() {
  const { profile } = useSession();
  const [here, setHere] = useState<{ lat: number; lng: number; live: boolean } | null>(null);
  const [radius, setRadius] = useState<(typeof RADII)[number]>(RADII[0]);

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
  const key = here ? `masjids:${here.lat.toFixed(2)},${here.lng.toFixed(2)}:${radius}` : null;
  const list = useQuery(key, () => findMasjids(here!.lat, here!.lng, radius));

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle k={here ? (here.live ? 'NEAR YOU' : `NEAR ${(profile?.city ?? 'YOUR CITY').toUpperCase()}`) : ' '} t="Masjids" style={{ marginTop: 16 }} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 }}>
        {RADII.map((r) => (
          <Chip key={r} selected={r === radius} bg={r === radius ? '#fff' : 'rgba(255,255,255,0.08)'} c={r === radius ? SC.ink : '#fff'} style={{ height: 36 }} textStyle={{ fontSize: 14 }} onPress={() => setRadius(r)}>
            {`Within ${r} km`}
          </Chip>
        ))}
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
          <T style={{ fontSize: 15, fontWeight: '600' }}>{`No masjids found within ${radius} km`}</T>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Try a wider search. Missing one? Anyone can add it on OpenStreetMap.</T>
        </View>
      )}
      {!!list.data?.length && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 16, paddingHorizontal: 16 }]}>
          {list.data.map((m, i) => (
            <Tap
              key={m.id}
              onPress={() => openInMaps(m)}
              accessibilityLabel={`${m.name}, ${fmtKm(m.km)} away. Opens in Maps.`}
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
              <T style={{ fontSize: 13, opacity: 0.7 }}>{fmtKm(m.km)}</T>
            </Tap>
          ))}
        </View>
      )}
      <T style={{ marginTop: 16, textAlign: 'center', fontSize: 11, opacity: 0.4 }}>Map data © OpenStreetMap contributors</T>
    </Screen>
  );
}
