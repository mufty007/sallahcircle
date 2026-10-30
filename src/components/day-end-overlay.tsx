import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Btn } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { SC } from '@/theme/colors';

export type DayEndKind = 'victory' | 'encourage';

const flagKey = (date: string, kind: DayEndKind) => `day-end:${kind}:${date}`;

/** Deterministic 0–1 from an index (no Math.random in render). */
const frac = (i: number, salt: number) => ((i * 37 + salt * 17) % 100) / 100;

/** Decide whether to show an overlay; returns null if already shown today or not applicable. */
async function decide(date: string, count: number, ishaStarted: boolean): Promise<DayEndKind | null> {
  if (count >= 5) {
    const seen = await AsyncStorage.getItem(flagKey(date, 'victory'));
    if (seen) return null;
    await AsyncStorage.setItem(flagKey(date, 'victory'), '1');
    return 'victory';
  }
  if (ishaStarted && count >= 3 && count < 5) {
    const seen = await AsyncStorage.getItem(flagKey(date, 'encourage'));
    if (seen) return null;
    await AsyncStorage.setItem(flagKey(date, 'encourage'), '1');
    return 'encourage';
  }
  return null;
}

const COLORS = [SC.mint, SC.lime, SC.amber, SC.coral, '#C7AFF5', '#8CC3FC'] as const;

function Confetti({ w, h }: { w: number; h: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        x: frac(i, 1) * w,
        delay: frac(i, 2) * 400,
        color: COLORS[i % COLORS.length],
        size: 6 + frac(i, 3) * 8,
        drift: (frac(i, 4) - 0.5) * 80,
        duration: 2200 + frac(i, 5) * 800,
      })),
    [w],
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {bits.map((b) => (
        <ConfettiBit key={b.id} {...b} h={h} />
      ))}
    </View>
  );
}

function ConfettiBit({
  x,
  delay,
  color,
  size,
  drift,
  duration,
  h,
}: {
  x: number;
  delay: number;
  color: string;
  size: number;
  drift: number;
  duration: number;
  h: number;
}) {
  const y = useSharedValue(-20);
  const rot = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withTiming(h + 40, { duration, easing: Easing.out(Easing.quad) }));
    rot.value = withDelay(delay, withRepeat(withTiming(360, { duration: 900 }), -1));
  }, [delay, duration, h, rot, y]);
  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: x + drift * (y.value / Math.max(h, 1)),
    top: y.value,
    width: size,
    height: size * 0.6,
    borderRadius: 2,
    backgroundColor: color,
    transform: [{ rotate: `${rot.value}deg` }],
  }));
  return <Animated.View style={style} />;
}

function Face({ sad }: { sad: boolean }) {
  return (
    <Svg width={88} height={88} viewBox="0 0 88 88">
      <Circle cx="44" cy="44" r="40" fill={sad ? '#F5D0C8' : SC.mint} />
      <Circle cx="30" cy="36" r="5" fill={SC.ink} />
      <Circle cx="58" cy="36" r="5" fill={SC.ink} />
      {sad ? (
        <Path d="M28 62c6-8 26-8 32 0" stroke={SC.ink} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      ) : (
        <Path d="M28 54c6 12 26 12 32 0" stroke={SC.ink} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      )}
    </Svg>
  );
}

export function DayEndOverlay({ kind, count, onDone }: { kind: DayEndKind; count: number; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const victory = kind === 'victory';

  return (
    <Pressable onPress={onDone} style={{ minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
      {victory && <Confetti w={width} h={Math.min(height * 0.5, 420)} />}
      <Face sad={!victory} />
      <T style={{ fontSize: 28, fontWeight: '800', marginTop: 16, textAlign: 'center', letterSpacing: -0.5 }}>
        {victory ? 'All five — mashaAllah!' : `${count} of 5 today`}
      </T>
      <T style={{ fontSize: 15, opacity: 0.65, marginTop: 8, textAlign: 'center', paddingHorizontal: 12, lineHeight: 22 }}>
        {victory
          ? 'You completed every prayer today. May Allah accept it.'
          : 'A solid effort. Aim for all five tomorrow — your streak is waiting.'}
      </T>
      <Btn kind="ink" style={{ marginTop: 22, height: 52, borderRadius: 26, paddingHorizontal: 28 }} onPress={onDone}>
        Continue
      </Btn>
    </Pressable>
  );
}

DayEndOverlay.decide = decide;
