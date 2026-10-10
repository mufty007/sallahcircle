import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Image } from 'expo-image';

import type { PrayerStatus } from '@/data/mock';
import { avatarUrl } from '@/lib/avatar';
import { FONT, SC } from '@/theme/colors';

import { revealFocusedInput } from './keyboard';
import { Icon, type IconName } from './icon';
import { InkContext, T, useInk } from './text';

export const hairline = (dark = true) => (dark ? 'rgba(255,255,255,0.06)' : 'rgba(11,18,32,0.06)');

export const glass: ViewStyle = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.07)',
  borderRadius: 26,
};

/** Pressable with a gentle press feedback. */
export function Tap({ style, children, ...rest }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const pressable = !!(rest.onPress || rest.onLongPress);
  return (
    <Pressable
      accessibilityRole={pressable ? 'button' : undefined}
      accessibilityState={rest.disabled ? { disabled: true } : undefined}
      {...rest}
      style={({ pressed }) => [style, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}>
      {children}
    </Pressable>
  );
}

/** `seed` shows a Fun Emoji face on the colour; without one, the initial. */
type AvatarLike = { init: string; color: string; seed?: string | null };

export function Av({ m, s = 36, ring, style }: { m: AvatarLike; s?: number; ring?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { width: s, height: s, borderRadius: s / 2, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        ring ? { borderWidth: 3, borderColor: ring } : null,
        style,
      ]}>
      {m.seed ? (
        <Image source={avatarUrl(m.seed, s)} style={{ width: s, height: s }} contentFit="cover" cachePolicy="memory-disk" transition={150} accessibilityIgnoresInvertColors />
      ) : (
        <T style={{ color: SC.ink, fontWeight: '700', fontSize: s * 0.42 }}>{m.init}</T>
      )}
    </View>
  );
}

const CELL_LABEL: Record<PrayerStatus, string> = { d: 'prayed on time', l: 'prayed late', m: 'missed', n: 'up next', u: 'not logged' };

export function Cell({ k, s = 22, dark = true }: { k: PrayerStatus; s?: number; dark?: boolean }) {
  const base: ViewStyle = { width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center' };
  if (k === 'd' || k === 'l')
    return (
      <View accessible accessibilityLabel={CELL_LABEL[k]} style={[base, { backgroundColor: k === 'd' ? SC.mint : SC.amber }]}>
        <Icon n="check" s={s * 0.62} c={SC.ink} w={2.6} />
      </View>
    );
  if (k === 'm')
    return (
      <View accessible accessibilityLabel={CELL_LABEL[k]} style={[base, { borderWidth: 1.5, borderColor: SC.coral }]}>
        <View style={{ width: s * 0.4, height: 2, backgroundColor: SC.coral, borderRadius: 2 }} />
      </View>
    );
  if (k === 'n') {
    const c = dark ? '#fff' : SC.ink;
    return (
      <View accessible accessibilityLabel={CELL_LABEL[k]} style={[base, { borderWidth: 2, borderColor: c, boxShadow: `0 0 0 4px ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(11,18,32,0.08)'}` }]}>
        <View style={{ width: s * 0.3, height: s * 0.3, borderRadius: s, backgroundColor: c }} />
      </View>
    );
  }
  return <View accessible accessibilityLabel={CELL_LABEL[k]} style={[base, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(11,18,32,0.08)' }]} />;
}

export function Chip({
  children,
  bg = 'rgba(255,255,255,0.1)',
  c,
  style,
  onPress,
  textStyle,
  selected,
  accessibilityLabel,
}: {
  children: ReactNode;
  bg?: string;
  c?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: object;
  onPress?: () => void;
  /** Screen-reader state for chips used as choices. */
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const ink = useInk();
  const color = c ?? ink;
  const body = (
    <InkContext value={color}>
      {Array.isArray(children)
        ? children.map((ch, i) => (typeof ch === 'string' || typeof ch === 'number' ? <T key={i} style={[styles.chipText, textStyle]}>{ch}</T> : ch))
        : typeof children === 'string'
          ? <T style={[styles.chipText, textStyle]}>{children}</T>
          : children}
    </InkContext>
  );
  return (
    <Tap disabled={!onPress} onPress={onPress} accessibilityState={selected != null ? { selected } : undefined} accessibilityLabel={accessibilityLabel} hitSlop={6} style={[styles.chip, { backgroundColor: bg }, style]}>
      {body}
    </Tap>
  );
}

export function Toggle({ on, onChange, light, label }: { on: boolean; onChange?: (v: boolean) => void; light?: boolean; label?: string }) {
  const bg = on ? (light ? SC.green : SC.mint) : light ? 'rgba(11,18,32,0.12)' : 'rgba(255,255,255,0.16)';
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => onChange?.(!on)}
      style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: bg, padding: 3, alignItems: on ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </Pressable>
  );
}

/** Toggle that owns its own state; for settings rows until they are wired to the backend. */
export function LocalToggle({ initial = true, light }: { initial?: boolean; light?: boolean }) {
  const [on, setOn] = useState(initial);
  return <Toggle on={on} onChange={setOn} light={light} />;
}

type BtnKind = 'light' | 'mint' | 'ghost' | 'text' | 'ink';
const BTN: Record<BtnKind, [string, string, string | undefined]> = {
  light: ['#fff', SC.ink, undefined],
  mint: [SC.mint, SC.ink, undefined],
  ghost: ['rgba(255,255,255,0.08)', '#fff', 'rgba(255,255,255,0.14)'],
  text: ['transparent', '#fff', undefined],
  ink: [SC.ink, '#fff', undefined],
};

export function Btn({
  children,
  kind = 'light',
  icon,
  style,
  textStyle,
  onPress,
  disabled,
}: {
  children: ReactNode;
  kind?: BtnKind;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: object;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const [bg, fg, border] = BTN[kind];
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        { height: 56, borderRadius: 28, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
        border ? { borderWidth: 1, borderColor: border } : null,
        style,
      ]}>
      <InkContext value={fg}>
        {icon}
        <T style={[{ fontWeight: '600', fontSize: 17 }, textStyle]}>{children}</T>
      </InkContext>
    </Tap>
  );
}

const ICON_LABEL: Partial<Record<IconName, string>> = {
  back: 'Back',
  gear: 'Settings',
  bell: 'Activity',
  plus: 'Add',
  share: 'Share',
  more: 'More options',
  together: 'Pray together',
  copy: 'Copy',
  chev: 'Next',
};

export function RoundBtn({
  n,
  onPress,
  bg = 'rgba(255,255,255,0.1)',
  dot,
  s = 40,
  accessibilityLabel,
}: {
  n: IconName;
  onPress?: () => void;
  bg?: string;
  dot?: boolean;
  s?: number;
  accessibilityLabel?: string;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityLabel={(accessibilityLabel ?? ICON_LABEL[n] ?? n) + (dot ? ', new' : '')}
      hitSlop={s < 44 ? (44 - s) / 2 : undefined}
      style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon n={n} s={20} />
      {dot && <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: SC.coral }} />}
    </Tap>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  height = 52,
}: {
  options: { value: V; label: string; sub?: string }[];
  value: V;
  onChange: (v: V) => void;
  height?: number;
}) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', padding: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, borderRadius: (height - 8) / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: on ? '#fff' : 'transparent' }}>
            <T style={{ color: on ? SC.ink : '#fff', fontSize: height < 48 ? 14 : 15, fontWeight: '600' }}>{o.label}</T>
            {o.sub && <T style={{ color: on ? SC.ink : '#fff', opacity: 0.6, fontSize: 13 }}>{o.sub}</T>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, hint, ok, ...input }: TextInputProps & { label: string; hint?: string; ok?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <View>
      <T style={styles.label}>{label}</T>
      <View
        style={{
          height: 56,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1.5,
          borderColor: focus ? SC.mint : 'rgba(255,255,255,0.1)',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          gap: 8,
        }}>
        <TextInput
          placeholderTextColor="rgba(255,255,255,0.35)"
          selectionColor={SC.mint}
          cursorColor={SC.mint}
          {...input}
          onFocus={(e) => {
            setFocus(true);
            revealFocusedInput();
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            input.onBlur?.(e);
          }}
          style={{ flex: 1, height: '100%', color: '#fff', fontSize: 17, fontFamily: FONT[400] }}
        />
        {ok && <Icon n="check" s={20} c={SC.mint} w={2.4} />}
      </View>
      {hint && <T style={{ fontSize: 13, marginTop: 8, color: ok ? SC.mint : 'rgba(255,255,255,0.55)' }}>{hint}</T>}
    </View>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: object }) {
  return <T style={[styles.label, style]}>{children}</T>;
}

export function Kicker({ children, style }: { children: ReactNode; style?: object }) {
  return <T style={[{ fontSize: 13, fontWeight: '600', letterSpacing: 1.2, opacity: 0.55 }, style]}>{children}</T>;
}

export function Stars({ n = 40, h = 420 }: { n?: number; h?: number }) {
  const { width } = useWindowDimensions();
  return (
    <Svg width={width} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: n }).map((_, i) => (
        <Circle key={i} cx={((i * 97 + 13) % 390) * (width / 390)} cy={(i * 53 + 7) % h} r={(i % 3) * 0.5 + 0.6} fill="#fff" opacity={0.25 + (i % 4) * 0.15} />
      ))}
    </Svg>
  );
}

export function Dots({ i, n = 3 }: { i: number; n?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
      {Array.from({ length: n }).map((_, k) => (
        <View key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: k === i ? '#fff' : 'rgba(255,255,255,0.3)' }} />
      ))}
    </View>
  );
}

/** Circular progress ring with a centered label. */
export function Ring({ pct, size, stroke = 5, label, labelSize = 15 }: { pct: number; size: number; stroke?: number; label: string; labelSize?: number }) {
  const r = size / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={SC.mint}
          strokeWidth={stroke}
          strokeDasharray={`${pct * c} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <T style={{ fontSize: labelSize, fontWeight: '700' }}>{label}</T>
      </View>
    </View>
  );
}

export function Legend() {
  return (
    <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center', opacity: 0.6 }}>
      {(
        [
          ['d', 'On time'],
          ['l', 'Late'],
          ['m', 'Missed'],
          ['n', 'Next'],
        ] as const
      ).map(([k, l]) => (
        <View key={k} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Cell k={k} s={12} />
          <T style={{ fontSize: 12 }}>{l}</T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, alignSelf: 'flex-start' },
  chipText: { fontSize: 13, fontWeight: '500' },
  label: { fontSize: 13, opacity: 0.6, marginBottom: 8, fontWeight: '500' },
});

/** Neutral marker for a member on a break. Never says why. */
export function PausedChip() {
  return (
    <Chip bg="rgba(255,255,255,0.08)" style={{ height: 28 }} textStyle={{ fontSize: 12, opacity: 0.7 }}>
      Paused
    </Chip>
  );
}
