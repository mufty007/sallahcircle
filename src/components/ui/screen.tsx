import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SC } from '@/theme/colors';

import { Background, type BgKind } from './background';
import { RoundBtn } from './primitives';
import { InkContext, T } from './text';

export const TAB_BAR_SPACE = 110;

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
  const body = scroll ? (
    <ScrollView
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
        <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
          {header}
          {body}
          {footer && <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, paddingTop: 8, gap: 10 }}>{footer}</View>}
        </View>
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
