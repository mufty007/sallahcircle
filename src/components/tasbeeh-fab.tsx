import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, usePathname, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { T } from '@/components/ui/text';
import { usePeriodTheme } from '@/state/period-theme';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const KEY = 'tasbih:v1';
const todayKey = () => new Date().toDateString();

type Saved = { mode: string; phase: number; count: number; total: number; day: string };

/** Always-visible circular tasbīḥ FAB that expands into a mini counter. */
export function TasbeehFab() {
  const { onboarded, session } = useSession();
  const period = usePeriodTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const scale = useSharedValue(1);

  const onAuth = segments[0] === '(onboarding)' || pathname?.includes('welcome') || pathname?.includes('auth');
  const onTasbih = pathname?.includes('tasbih');
  const hide = !session || !onboarded || onAuth || onTasbih;

  useEffect(() => {
    if (hide) return;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const s = raw ? (JSON.parse(raw) as Saved) : null;
        if (s && s.day === todayKey()) {
          setCount(s.count);
          setTotal(s.total);
        } else {
          setCount(0);
          setTotal(0);
        }
      })
      .catch(() => {});
  }, [hide, open]);

  const persist = (nextCount: number, nextTotal: number) => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const prev = raw ? (JSON.parse(raw) as Saved) : null;
        const s: Saved = {
          mode: prev?.mode === 'after' ? 'after' : 'free',
          phase: prev?.mode === 'after' && prev.day === todayKey() ? prev.phase : 0,
          count: nextCount,
          total: nextTotal,
          day: todayKey(),
        };
        return AsyncStorage.setItem(KEY, JSON.stringify(s));
      })
      .catch(() => {});
  };

  const tick = () => {
    const n = count + 1;
    const t = total + 1;
    setCount(n);
    setTotal(t);
    persist(n, t);
    scale.value = withSpring(1.12, { damping: 12 }, () => {
      scale.value = withSpring(1);
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const bubble = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const accent = period.active ? SC.pink : SC.mint;

  if (hide) return null;

  const bottom = Math.max(insets.bottom, 18) + 72;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 18, bottom, zIndex: 40, alignItems: 'flex-end' }}>
      {open && (
        <Animated.View
          style={[
            {
              width: 148,
              height: 148,
              borderRadius: 74,
              backgroundColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.35)',
            },
            bubble,
          ]}>
          <Pressable onPress={tick} style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Count tasbīḥ">
            <T style={{ fontSize: 40, fontWeight: '800', color: SC.ink, fontVariant: ['tabular-nums'] }}>{count}</T>
            <T style={{ fontSize: 11, fontWeight: '600', color: SC.ink, opacity: 0.7 }}>tap · today {total}</T>
          </Pressable>
          <Pressable
            onPress={() => {
              setOpen(false);
              router.push('/tasbih');
            }}
            style={{ position: 'absolute', bottom: 10 }}
            accessibilityLabel="Open full tasbīḥ">
            <T style={{ fontSize: 11, fontWeight: '700', color: SC.ink, opacity: 0.75 }}>Full →</T>
          </Pressable>
        </Animated.View>
      )}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        onLongPress={() => router.push('/tasbih')}
        accessibilityLabel={open ? 'Close tasbīḥ' : 'Open tasbīḥ'}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: open ? SC.navy2 : accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        }}>
        <Icon n={open ? 'down' : 'beads'} s={22} c={open ? '#fff' : SC.ink} w={2} />
      </Pressable>
    </View>
  );
}
