import { router } from 'expo-router';
import { createContext, use, useCallback, useEffect, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { InkContext } from '@/components/ui/text';
import { SC } from '@/theme/colors';

const OPEN = { duration: 420, easing: Easing.bezier(0.32, 0.72, 0, 1) };
const CLOSE = { duration: 260, easing: Easing.bezier(0.4, 0, 1, 1) };

const SheetCtx = createContext<() => void>(() => router.back());
/** Animate the sheet closed, then pop the route. Use instead of `router.back()` inside a sheet. */
export const useCloseSheet = () => use(SheetCtx);

/**
 * Bottom sheet presented over the previous screen (route uses `transparentModal`
 * with `animation: 'none'`; all motion happens here so it is identical on iOS and Android).
 */
export function Sheet({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  // 0 = open, 1 = fully off-screen. Starts off-screen so the first frame never flashes.
  const progress = useSharedValue(1);
  const drag = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const closing = useSharedValue(false);

  useEffect(() => {
    progress.set(withTiming(0, reduceMotion ? { duration: 0 } : OPEN));
  }, [progress, reduceMotion]);

  const close = useCallback(() => {
    if (closing.get()) return;
    closing.set(true);
    progress.set(
      withTiming(1, reduceMotion ? { duration: 0 } : CLOSE, (done) => {
        if (done) scheduleOnRN(router.back);
      }),
    );
  }, [closing, progress, reduceMotion]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const native = Gesture.Native();
  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(native)
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      // Only pull the sheet down when its content is scrolled to the top.
      if (scrollY.get() <= 0) drag.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (drag.get() > 120 || (drag.get() > 0 && e.velocityY > 900)) {
        // Fold the drag offset into progress so the close continues from where the finger left.
        progress.set(drag.get() / height);
        drag.set(0);
        scheduleOnRN(close);
      } else {
        drag.set(withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }));
      }
    });

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * height + drag.get() }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get() * height + drag.get(), [0, height * 0.6], [1, 0], 'clamp'),
  }));

  return (
    <SheetCtx value={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2,4,12,0.55)' }, backdropStyle]}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ maxHeight: '88%', borderTopLeftRadius: 36, borderTopRightRadius: 36, backgroundColor: SC.sheet }, sheetStyle]}>
            <InkContext value={SC.ink}>
              <View style={{ paddingTop: 12, paddingBottom: 18 }}>
                <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(11,18,32,0.15)', alignSelf: 'center' }} />
              </View>
              <GestureDetector gesture={native}>
                <Animated.ScrollView
                  bounces={false}
                  overScrollMode="never"
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
                  {children}
                </Animated.ScrollView>
              </GestureDetector>
            </InkContext>
          </Animated.View>
        </GestureDetector>
      </View>
    </SheetCtx>
  );
}
