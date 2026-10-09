import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useInk } from './text';

const IC = {
  home: <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  compass: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  users: (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .6 3.5 2.6 3.5 6" />
    </>
  ),
  trophy: <Path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8" />,
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  bell: <Path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-4-4" />
    </>
  ),
  mic: (
    <>
      <Rect x="9" y="3" width="6" height="11" rx="3" />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  send: <Path d="M4 12l16-8-6 16-3-7z" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  chev: <Path d="M9 6l6 6-6 6" />,
  back: <Path d="M15 6l-6 6 6 6" />,
  down: <Path d="M6 9l6 6 6-6" />,
  flame: <Path d="M12 3c.8 3.5 6 5.5 6 11a6 6 0 0 1-12 0c0-2.8 1.6-4.2 2-6.5 1.6 1 2.6 2.6 2.8 4 1.4-2 1.7-5 1.2-8.5z" />,
  copy: (
    <>
      <Rect x="8" y="8" width="12" height="12" rx="2.5" />
      <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  share: <Path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />,
  more: (
    <>
      <Circle cx="5" cy="12" r="1.2" />
      <Circle cx="12" cy="12" r="1.2" />
      <Circle cx="19" cy="12" r="1.2" />
    </>
  ),
  moon: <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  pin: (
    <>
      <Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <Circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  heart: <Path d="M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z" />,
  together: (
    <>
      <Circle cx="7" cy="7" r="2.5" />
      <Circle cx="17" cy="7" r="2.5" />
      <Path d="M3 20v-3a4 4 0 0 1 8 0v3M13 20v-3a4 4 0 0 1 8 0v3" />
    </>
  ),
  gear: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
  cal: (
    <>
      <Rect x="3.5" y="5" width="17" height="15" rx="3" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  wave: (
    <Path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.8-2.4L4 15a1.5 1.5 0 0 1 2.3-2L7 14" />
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof IC;

type Props = { n: IconName; s?: number; c?: string; w?: number; style?: StyleProp<ViewStyle> };

export function Icon({ n, s = 22, c, w = 1.8, style }: Props) {
  const ink = useInk();
  const color = c ?? ink;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" style={style}>
      <G fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
        {IC[n]}
      </G>
    </Svg>
  );
}
