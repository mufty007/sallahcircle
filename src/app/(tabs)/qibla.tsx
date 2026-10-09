import { geoInterpolate } from 'd3-geo';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Circle, Rect, Text as SvgText } from 'react-native-svg';

import { bearing, compassWord, distanceKm, Globe } from '@/components/globe';
import { Btn, glass } from '@/components/ui/primitives';
import { PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { MAKKAH } from '@/data/mock';
import { useSession } from '@/state/session';
import { FONT, mintA, SC } from '@/theme/colors';

/** Live compass heading while the screen is focused (null where unavailable, e.g. web). */
function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      let sub: Location.LocationSubscription | undefined;
      let live = true;
      (async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted' || !live) return;
        sub = await Location.watchHeadingAsync((h) => setHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading));
      })().catch(() => {});
      return () => {
        live = false;
        sub?.remove();
      };
    }, []),
  );
  return heading;
}

export default function QiblaScreen() {
  const { profile } = useSession();
  const { width } = useWindowDimensions();
  const heading = useHeading();
  const size = Math.min(360, width - 30);

  if (profile?.latitude == null || profile.longitude == null) {
    return (
      <Screen bg="navy" withTabBar>
        <PageTitle t="Qibla" style={{ marginTop: 8 }} />
        <View style={[glass, { marginHorizontal: 16, marginTop: 24, padding: 20 }]}>
          <T style={{ fontSize: 16, fontWeight: '600' }}>Set your location</T>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 4, marginBottom: 14 }}>We need your location to point you to the Kaʿbah.</T>
          <Btn kind="mint" style={{ height: 48 }} textStyle={{ fontSize: 15 }} onPress={() => router.push('/setup-location')}>
            Set location
          </Btn>
        </View>
      </Screen>
    );
  }

  return <QiblaView lng={profile.longitude} lat={profile.latitude} city={profile.city} heading={heading} size={size} />;
}

function QiblaView({ lng, lat, city, heading, size }: { lng: number; lat: number; city: string | null; heading: number | null; size: number }) {
  // Primitive inputs let the compiler memoize these, so compass ticks don't re-project the globe.
  const home: [number, number] = [lng, lat];
  const brg = bearing(home, MAKKAH);
  const km = distanceKm(home, MAKKAH);
  const mid = geoInterpolate(home, MAKKAH)(0.5) as [number, number];
  const route: [[number, number], [number, number]] = [home, MAKKAH];

  // Signed turn in (-180, 180]: positive = turn right.
  const turn = heading == null ? null : Math.round(((brg - heading + 540) % 360) - 180);
  const aligned = turn != null && Math.abs(turn) <= 3;

  return (
    <Screen bg="navy" withTabBar>
      <PageTitle k={city ? `FROM ${city.toUpperCase()}` : 'FROM YOUR LOCATION'} t="Qibla" style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 24, marginTop: 14 }}>
        <T style={{ fontSize: 96, fontWeight: '700', letterSpacing: -5, lineHeight: 92 }}>{brg}°</T>
        <T style={{ paddingBottom: 10, fontSize: 15, opacity: 0.7, lineHeight: 20 }}>
          {compassWord(brg)}
          {'\n'}
          {km.toLocaleString()} km to Makkah
        </T>
      </View>

      <View style={{ alignSelf: 'center', marginTop: 12, width: size, height: size }}>
        <View style={{ position: 'absolute', inset: 4, borderRadius: size, borderWidth: 1, borderColor: mintA(aligned ? 0.6 : 0.15) }} />
        <Globe
          id="qibla"
          center={mid}
          size={size}
          scale={size * 0.467}
          route={route}
          overlay={(project) => {
            const [ax, ay] = project(home);
            const [mx, my] = project(MAKKAH);
            return (
              <>
                <Circle cx={ax} cy={ay} r={10} fill={mintA(0.25)} />
                <Circle cx={ax} cy={ay} r={5} fill="#fff" />
                <Circle cx={mx} cy={my} r={14} fill={mintA(0.25)} />
                <Rect x={mx - 5} y={my - 5} width={10} height={10} fill={SC.mint} />
                <SvgText x={mx + 14} y={my + 20} fill="#fff" fontSize={13} fontFamily={FONT[600]}>
                  Makkah
                </SvgText>
                <SvgText x={ax - 12} y={ay + 22} fill="#fff" fontSize={13} fontFamily={FONT[600]} textAnchor="end">
                  You
                </SvgText>
              </>
            );
          }}
        />
      </View>

      <View
        style={[
          glass,
          { marginHorizontal: 16, marginTop: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
          aligned && { backgroundColor: mintA(0.16), borderColor: mintA(0.5) },
        ]}>
        <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: aligned ? SC.mint : 'rgba(255,255,255,0.2)' }}>
          {turn != null && <Needle color="#fff" deg={-turn} />}
          <Needle color={SC.mint} deg={0} />
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 18, fontWeight: '600' }}>
            {turn == null ? `Face ${brg}° ${compassWord(brg).toLowerCase()}` : aligned ? 'You’re facing the Qibla' : `Turn ${Math.abs(turn)}° ${turn > 0 ? 'right' : 'left'}`}
          </T>
          <T style={{ fontSize: 13, opacity: 0.6 }}>
            {heading == null ? 'Compass unavailable here. Use the bearing above.' : `You’re facing ${Math.round(heading)}°. Hold flat, away from metal.`}
          </T>
        </View>
      </View>
    </Screen>
  );
}

function Needle({ color, deg }: { color: string; deg: number }) {
  // 2×22 needle pivoting at its bottom end, which sits at the dial's centre.
  return (
    <View
      style={{
        position: 'absolute',
        left: 22,
        top: 2,
        width: 2,
        height: 22,
        borderRadius: 1,
        backgroundColor: color,
        transformOrigin: '1px 22px',
        transform: [{ rotate: `${deg}deg` }],
      }}
    />
  );
}
