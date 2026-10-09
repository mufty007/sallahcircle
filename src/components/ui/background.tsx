import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { INNER, MEMBER_WASH, SC, SKY, type Gradient, type Period } from '@/theme/colors';

export type BgKind = Period | 'navy' | 'inner' | 'member' | 'onboard';

/** Full-bleed screen background matching the design's gradients. */
export function Background({ kind }: { kind: BgKind }) {
  if (kind === 'navy') return <View style={[StyleSheet.absoluteFill, { backgroundColor: SC.navy }]} />;
  if (kind === 'onboard') return <OnboardGlow />;
  if (kind === 'inner' || kind === 'member') {
    const g = kind === 'inner' ? INNER : MEMBER_WASH;
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: SC.navy }]}>
        <LinearGradient colors={g.colors} locations={g.locations} style={{ height: g.height }} />
      </View>
    );
  }
  return <Sky g={SKY[kind]} />;
}

export function Sky({ g, style }: { g: Gradient; style?: object }) {
  return <LinearGradient colors={g.colors} locations={g.locations} style={[StyleSheet.absoluteFill, style]} />;
}

/** radial-gradient(130% 55% at 50% 0%, #2C2A68, #141A3E 45%, #0A1226 75%) */
function OnboardGlow() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: SC.navy }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="ob" cx="0.5" cy="0" rx="1.3" ry="0.55" fx="0.5" fy="0" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor="#2C2A68" />
            <Stop offset="0.45" stopColor="#141A3E" />
            <Stop offset="0.75" stopColor={SC.navy} />
            <Stop offset="1" stopColor={SC.navy} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ob)" />
      </Svg>
    </View>
  );
}
