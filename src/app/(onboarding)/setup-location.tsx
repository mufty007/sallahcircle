import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Linking, TextInput, useWindowDimensions, View } from 'react-native';

import { Globe } from '@/components/globe';
import { OBHead, OBTop, useSetupNext } from '@/components/onboarding';
import { Icon } from '@/components/ui/icon';
import { Btn, glass, Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { suggestMethod } from '@/lib/prayer-times';
import { useSession } from '@/state/session';
import { FONT, mintA, SC } from '@/theme/colors';

type Place = {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country_code: string | null;
};

// ~1 km precision: accurate prayer times without sharing an exact address.
const round = (n: number) => Math.round(n * 100) / 100;
const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function describe(latitude: number, longitude: number): Promise<Place> {
  let geo: Location.LocationGeocodedAddress | undefined;
  try {
    [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
  } catch {
    // Reverse geocoding isn't available everywhere (e.g. web); coordinates are enough.
  }
  return {
    latitude: round(latitude),
    longitude: round(longitude),
    city: geo?.city ?? geo?.subregion ?? geo?.district ?? null,
    region: geo?.region ?? null,
    country_code: geo?.isoCountryCode?.toUpperCase() ?? null,
  };
}

const fmtCoord = (lat: number, lng: number) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;

export default function SetupLocationScreen() {
  const next = useSetupNext();
  const { profile, updateProfile } = useSession();
  const { height } = useWindowDimensions();
  const size = Math.min(260, height * 0.3);

  const saved: Place | null =
    profile?.latitude != null && profile.longitude != null
      ? { latitude: profile.latitude, longitude: profile.longitude, city: profile.city, region: profile.region, country_code: profile.country_code }
      : null;
  const [place, setPlace] = useState<Place | null>(saved);
  const [busy, setBusy] = useState<null | 'locate' | 'search' | 'save'>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [denied, setDenied] = useState(false);

  const locate = async () => {
    setBusy('locate');
    setError(null);
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDenied(!canAskAgain);
        setError('Location permission was not granted. You can search for your city instead.');
        setSearching(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPlace(await describe(pos.coords.latitude, pos.coords.longitude));
    } catch {
      setError('Couldn’t get your location. Try searching for your city.');
      setSearching(true);
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    if (!query.trim()) return;
    setBusy('search');
    setError(null);
    try {
      const [hit] = await Location.geocodeAsync(query.trim());
      if (!hit) {
        setError(`No match for “${query.trim()}”.`);
        return;
      }
      const p = await describe(hit.latitude, hit.longitude);
      setPlace({ ...p, city: p.city ?? query.trim() });
      setSearching(false);
    } catch {
      setError('City search isn’t available on this device. Use your location instead.');
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!place) return;
    setBusy('save');
    setError(null);
    try {
      await updateProfile({
        ...place,
        timezone: deviceTimezone(),
        // Only pre-pick a method on first setup; never override the user's choice.
        ...(!profile?.onboarded_at && { calc_method: suggestMethod(place.country_code) }),
      });
      next('/setup-method');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your location.');
    } finally {
      setBusy(null);
    }
  };

  const center: [number, number] = place ? [place.longitude, place.latitude] : [20, 25];

  return (
    <>
      <Screen
        bg="onboard"
        header={<OBTop step={2} />}
        footer={
          <>
            {error && <T style={{ color: SC.coral, fontSize: 14, textAlign: 'center' }}>{error}</T>}
            {denied && (
              <Btn kind="text" style={{ height: 36 }} textStyle={{ fontSize: 15, color: SC.mint }} onPress={() => Linking.openSettings()}>
                Open Settings
              </Btn>
            )}
            {place ? (
              <Btn kind="mint" disabled={!!busy} icon={busy === 'save' ? <ActivityIndicator color={SC.ink} /> : undefined} onPress={save}>
                Continue
              </Btn>
            ) : (
              <Btn
                kind="mint"
                disabled={!!busy}
                icon={busy === 'locate' ? <ActivityIndicator color={SC.ink} /> : <Icon n="pin" s={20} c={SC.ink} />}
                onPress={locate}>
                Use my location
              </Btn>
            )}
            {!searching && (
              <Btn kind="text" style={{ height: 40 }} textStyle={{ fontSize: 15, opacity: 0.8 }} onPress={() => setSearching(true)}>
                Search for a city instead
              </Btn>
            )}
          </>
        }>
        <OBHead k="STEP 2 OF 5" t="Where do you pray?" sub="We use your location for accurate prayer times and Qibla. Your circle only sees your city." />
        <View style={{ alignSelf: 'center', marginTop: 24 }}>
          <Globe id="loc" center={center} tilt={12} size={size} pins={place ? [center] : []} />
        </View>

        {searching && (
          <View style={{ marginHorizontal: 16, marginTop: 20, flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
              <Icon n="search" s={20} c="rgba(255,255,255,0.6)" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="City, e.g. Lagos"
                placeholderTextColor="rgba(255,255,255,0.45)"
                selectionColor={SC.mint}
                returnKeyType="search"
                onSubmitEditing={search}
                autoFocus
                style={{ flex: 1, height: '100%', color: '#fff', fontSize: 16, fontFamily: FONT[400] }}
              />
            </View>
            <Tap onPress={search} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: SC.mint, alignItems: 'center', justifyContent: 'center' }}>
              {busy === 'search' ? <ActivityIndicator color={SC.ink} /> : <Icon n="chev" s={22} c={SC.ink} w={2.2} />}
            </Tap>
          </View>
        )}

        {place && (
          <View style={[glass, { marginHorizontal: 16, marginTop: 20, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: mintA(0.16), alignItems: 'center', justifyContent: 'center' }}>
              <Icon n="pin" s={20} c={SC.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 16, fontWeight: '600' }}>{[place.city, place.region].filter(Boolean).join(', ') || 'Your location'}</T>
              <T style={{ fontSize: 13, opacity: 0.6 }}>
                {fmtCoord(place.latitude, place.longitude)} · {deviceTimezone()}
              </T>
            </View>
            <T onPress={locate} style={{ fontSize: 14, color: SC.mint, fontWeight: '600' }}>
              {busy === 'locate' ? '…' : 'Update'}
            </T>
          </View>
        )}
      </Screen>
    </>
  );
}
