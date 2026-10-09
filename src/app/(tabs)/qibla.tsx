import { geoInterpolate } from 'd3-geo';
import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Circle, Rect, Text as SvgText } from 'react-native-svg';

import { bearing, compassWord, distanceKm, Globe } from '@/components/globe';
import { glass } from '@/components/ui/primitives';
import { PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { HOME_COORD, MAKKAH } from '@/data/mock';
import { FONT, mintA, SC } from '@/theme/colors';

// The phone heading will come from the magnetometer (expo-sensors); fixed for the UI pass.
const DEVICE_HEADING = 36;

export default function QiblaScreen() {
  const { width } = useWindowDimensions();
  const size = Math.min(360, width - 30);
  const brg = bearing(HOME_COORD, MAKKAH);
  const km = distanceKm(HOME_COORD, MAKKAH);
  const mid = useMemo(() => geoInterpolate(HOME_COORD, MAKKAH)(0.5) as [number, number], []);
  const route = useMemo(() => [HOME_COORD, MAKKAH] as [[number, number], [number, number]], []);
  const turn = brg - DEVICE_HEADING;

  return (
    <Screen bg="navy" withTabBar>
      <PageTitle k="FROM CHICAGO" t="Qibla" style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 24, marginTop: 14 }}>
        <T style={{ fontSize: 96, fontWeight: '700', letterSpacing: -5, lineHeight: 92 }}>{brg}°</T>
        <T style={{ paddingBottom: 10, fontSize: 15, opacity: 0.7, lineHeight: 20 }}>
          {compassWord(brg)}
          {'\n'}
          {km.toLocaleString()} km to Makkah
        </T>
      </View>

      <View style={{ alignSelf: 'center', marginTop: 12, width: size, height: size }}>
        <View style={{ position: 'absolute', inset: 4, borderRadius: size, borderWidth: 1, borderColor: mintA(0.15) }} />
        <Globe
          id="qibla"
          center={mid}
          size={size}
          scale={size * 0.467}
          route={route}
          overlay={(project) => {
            const [ax, ay] = project(HOME_COORD);
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

      <View style={[glass, { marginHorizontal: 16, marginTop: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
        <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Needle color="#fff" deg={-turn} />
          <Needle color={SC.mint} deg={0} />
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 18, fontWeight: '600' }}>{turn === 0 ? 'Facing the Qibla' : `Turn ${Math.abs(turn) % 360}° ${turn > 0 ? 'right' : 'left'}`}</T>
          <T style={{ fontSize: 13, opacity: 0.6 }}>You’re facing {DEVICE_HEADING}°. Hold flat, away from metal.</T>
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
