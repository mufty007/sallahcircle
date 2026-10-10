import { createContext, use } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { FONT } from '@/theme/colors';

/** Foreground colour for the current surface; text and icons inherit it like CSS `color`. */
export const InkContext = createContext<string>('#fff');
export const useInk = () => use(InkContext);

/**
 * Outfit text. Write `fontWeight` as usual; it is mapped to the matching
 * Outfit family because custom fonts don't synthesize weights on native.
 */
export function T({ style, ...rest }: TextProps) {
  const ink = useInk();
  const flat: TextStyle = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...without } = flat;
  const w = (fontWeight ? Number(fontWeight) : 400) as keyof typeof FONT;
  // Respect the system text size, but cap display text so big numbers don't break layouts.
  const cap = (without.fontSize ?? 15) >= 28 ? 1.15 : 1.5;
  return <Text maxFontSizeMultiplier={cap} {...rest} style={[{ color: ink }, without, { fontFamily: FONT[w] ?? FONT[400] }]} />;
}
