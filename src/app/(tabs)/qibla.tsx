import { geoInterpolate } from 'd3-geo';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { bearing, compassWord, distanceKm, Globe } from '@/components/globe';
import { LocationPrompt } from '@/components/location-prompt';
import { Btn, glass } from '@/components/ui/primitives';
import { PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { MAKKAH } from '@/data/mock';
import { distanceUnit, formatDistance, type DistanceUnit } from '@/lib/units';
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
  const size = Math.min(320, width - 40);

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

  return <QiblaView lng={profile.longitude} lat={profile.latitude} city={profile.city} heading={heading} size={size} unit={distanceUnit(profile)} />;
}

function QiblaView({ lng, lat, city, heading, size, unit }: { lng: number; lat: number; city: string | null; heading: number | null; size: number; unit: DistanceUnit }) {
  const home: [number, number] = [lng, lat];
  const brg = bearing(home, MAKKAH);
  const km = distanceKm(home, MAKKAH);
  const mid = geoInterpolate(home, MAKKAH)(0.5) as [number, number];
  const route: [[number, number], [number, number]] = [home, MAKKAH];

  const turn = heading == null ? null : Math.round(((brg - heading + 540) % 360) - 180);
  const aligned = turn != null && Math.abs(turn) <= 3;

  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    wasAligned.current = aligned;
  }, [aligned]);

  const roseRot = useSharedValue(0);
  useEffect(() => {
    if (heading == null) return;
    roseRot.value = withTiming(-heading, { duration: 100 });
  }, [heading, roseRot]);

  const roseStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${roseRot.value}deg` }] }));
  const globeSize = Math.min(160, size * 0.55);

  return (
    <Screen bg="navy" withTabBar>
      <PageTitle k={city ? `FROM ${city.toUpperCase()}` : 'FROM YOUR LOCATION'} t="Qibla" style={{ marginTop: 8 }} />
      <LocationPrompt dark />

      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <T style={{ fontSize: 15, opacity: 0.65, marginBottom: 6, textAlign: 'center', paddingHorizontal: 24 }}>
          {heading == null ? 'Compass unavailable — use the bearing below' : 'Hold flat. Turn until the Kaʿbah lines up.'}
        </T>

        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 9,
            borderRightWidth: 9,
            borderBottomWidth: 14,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: aligned ? SC.mint : '#fff',
            marginBottom: 6,
          }}
        />

        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: aligned ? SC.mint : mintA(0.25),
            backgroundColor: aligned ? mintA(0.08) : 'rgba(8,12,30,0.55)',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Animated.View style={[{ width: size, height: size }, roseStyle]}>
            <Svg width={size} height={size}>
              <CompassRose size={size} qiblaDeg={brg} aligned={aligned} />
            </Svg>
          </Animated.View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: aligned ? SC.mint : '#fff',
              borderWidth: 3,
              borderColor: SC.navy,
            }}
          />
        </View>

        <View style={{ marginTop: 14, alignItems: 'center', paddingHorizontal: 20 }}>
          <T style={{ fontSize: 26, fontWeight: '700', color: aligned ? SC.mint : '#fff', textAlign: 'center' }}>
            {turn == null ? `${brg}° ${compassWord(brg)}` : aligned ? 'You’re facing the Qibla' : `Turn ${Math.abs(turn)}° ${turn > 0 ? 'right' : 'left'}`}
          </T>
          <T style={{ fontSize: 14, opacity: 0.6, marginTop: 4, textAlign: 'center' }}>
            {formatDistance(km, unit)} to Makkah
            {heading != null ? ` · facing ${Math.round(heading)}°` : ''}
          </T>
        </View>
      </View>

      <View style={{ alignSelf: 'center', marginTop: 18, width: globeSize, height: globeSize, opacity: 0.9 }}>
        <Globe
          id="qibla"
          center={mid}
          size={globeSize}
          scale={globeSize * 0.467}
          route={route}
          overlay={(project) => {
            const [ax, ay] = project(home);
            const [mx, my] = project(MAKKAH);
            return (
              <>
                <Circle cx={ax} cy={ay} r={6} fill="#fff" />
                <Rect x={mx - 4} y={my - 4} width={8} height={8} fill={SC.mint} />
                <SvgText x={mx + 10} y={my + 4} fill="#fff" fontSize={10} fontFamily={FONT[600]}>
                  Makkah
                </SvgText>
              </>
            );
          }}
        />
      </View>

      {heading == null && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 16, padding: 16 }]}>
          <T style={{ fontSize: 15, fontWeight: '600' }}>Compass unavailable</T>
          <T style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
            {Platform.OS === 'web'
              ? 'Open the app on your phone to use the live compass. Face about '
              : 'Allow location, then hold the phone flat and away from metal. Face about '}
            {brg}° {compassWord(brg).toLowerCase()}.
          </T>
        </View>
      )}
    </Screen>
  );
}

function CompassRose({ size, qiblaDeg, aligned }: { size: number; qiblaDeg: number; aligned: boolean }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const labels: { deg: number; text: string }[] = [
    { deg: 0, text: 'N' },
    { deg: 90, text: 'E' },
    { deg: 180, text: 'S' },
    { deg: 270, text: 'W' },
  ];
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const tipR = r - 8;
  const qx = cx + tipR * Math.cos(rad(qiblaDeg));
  const qy = cy + tipR * Math.sin(rad(qiblaDeg));
  const baseR = 28;
  const bx = cx + baseR * Math.cos(rad(qiblaDeg));
  const by = cy + baseR * Math.sin(rad(qiblaDeg));

  return (
    <>
      {ticks.map((deg) => {
        const major = deg % 30 === 0;
        const inner = major ? r - 14 : r - 8;
        const a = rad(deg);
        return (
          <Line
            key={deg}
            x1={cx + inner * Math.cos(a)}
            y1={cy + inner * Math.sin(a)}
            x2={cx + r * Math.cos(a)}
            y2={cy + r * Math.sin(a)}
            stroke={deg === 0 ? SC.coral : 'rgba(255,255,255,0.35)'}
            strokeWidth={major ? 2 : 1}
          />
        );
      })}
      {labels.map(({ deg, text }) => {
        const a = rad(deg);
        const lr = r - 28;
        return (
          <SvgText
            key={text}
            x={cx + lr * Math.cos(a)}
            y={cy + lr * Math.sin(a) + 5}
            fill={deg === 0 ? SC.coral : 'rgba(255,255,255,0.75)'}
            fontSize={deg === 0 ? 18 : 14}
            fontFamily={FONT[700]}
            textAnchor="middle">
            {text}
          </SvgText>
        );
      })}
      <Path d={`M ${bx} ${by} L ${qx} ${qy}`} stroke={aligned ? SC.mint : SC.lime} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={qx} cy={qy} r={10} fill={aligned ? SC.mint : SC.lime} />
      <SvgText x={qx} y={qy + 4} fill={SC.ink} fontSize={9} fontFamily={FONT[700]} textAnchor="middle">
        Q
      </SvgText>
    </>
  );
}
