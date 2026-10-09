import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SC } from '@/theme/colors';

import { Background, type BgKind } from './background';
import { setRevealHandler } from './keyboard';
import { RoundBtn } from './primitives';
import { InkContext, T } from './text';

export const TAB_BAR_SPACE = 110;

/** Breathing room between the focused field and the keyboard (or footer). */
const KEYBOARD_GAP = 24;

type ScreenProps = {
  bg: BgKind;
  children: ReactNode;
  /** Extra layers drawn above the background but below content (stars, glows). */
  decor?: ReactNode;
  /** Fixed header row (back button etc.), drawn above scroll content. */
  header?: ReactNode;
  /** Fixed footer (primary CTA). */
  footer?: ReactNode;
  scroll?: boolean;
  dark?: boolean;
  withTabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Screen shell: background, safe area, optional header/footer and scrolling body. */
export function Screen({ bg, children, decor, header, footer, scroll = true, dark = true, withTabBar, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = withTabBar ? TAB_BAR_SPACE + insets.bottom : footer ? 16 : insets.bottom + 24;
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const footerH = useRef(0);

  // Scroll the focused input above the keyboard (and the footer, which rides on top of it).
  const reveal = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const metrics = Keyboard.metrics();
    if (!input || !metrics || !scrollRef.current) return;
    input.measureInWindow((_x, y, _w, h) => {
      const visibleBottom = metrics.screenY - footerH.current - KEYBOARD_GAP;
      const overlap = y + h - visibleBottom;
      if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!scroll) return;
      setRevealHandler(reveal);
      return () => setRevealHandler(null, reveal);
    }, [scroll, reveal]),
  );

  useEffect(() => {
    if (!scroll) return;
    // Wait for the KeyboardAvoidingView to apply its padding before measuring.
    const sub = Keyboard.addListener('keyboardDidShow', () => setTimeout(reveal, 50));
    return () => sub.remove();
  }, [scroll, reveal]);

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingBottom: bottomPad }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingBottom: bottomPad }, contentStyle]}>{children}</View>
  );

  return (
    <InkContext value={dark ? '#fff' : SC.ink}>
      <View style={{ flex: 1 }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Background kind={bg} />
        {decor}
        {/* Edge-to-edge Android doesn't resize for the keyboard, so pad on both platforms. */}
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, paddingTop: insets.top + 8 }}>
          {header}
          {body}
          {footer && (
            <View
              onLayout={(e) => {
                footerH.current = e.nativeEvent.layout.height;
              }}
              style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, paddingTop: 8, gap: 10 }}>
              {footer}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </InkContext>
  );
}

/** Back button on the left, actions on the right. */
export function BackBar({ right, onBack }: { right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 40 }}>
      <RoundBtn n="back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View>
    </View>
  );
}

/** Large page title with optional kicker, subtitle and right-hand slot. */
export function PageTitle({ k, t, sub, right, style }: { k?: string; t: string; sub?: string; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: 24 }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flexShrink: 1 }}>
          {k && <T style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1.2, opacity: 0.55, marginBottom: 6 }}>{k}</T>}
          <T style={{ fontSize: 44, fontWeight: '700', letterSpacing: -1.5, lineHeight: 46 }}>{t}</T>
        </View>
        {right}
      </View>
      {sub && <T style={{ fontSize: 15, opacity: 0.65, marginTop: 10 }}>{sub}</T>}
    </View>
  );
}
