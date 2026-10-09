import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { Av } from '@/components/ui/primitives';
import { PRAYER_HOURS, SUNRISE } from '@/data/mock';
import { FONT, SC } from '@/theme/colors';

type DialProps = {
  now: number;
  dark: boolean;
  queue?: [{ id: string; init: string; color: string }, string][];
  /** Prayer names + decimal hours on the 24h ring (defaults to the design's sample day). */
  prayers?: [string, number][];
  sunrise?: number;
  sunset?: number;
  size?: number;
  showLabels?: boolean;
};


/**
 * 24-hour dial: the sun/moon sits at the current time, each prayer is a node on
 * the ring, and circle members orbit on the inner track in the order they pray next.
 */
export function OrbitDial({ now, dark, queue = [], size = 360, showLabels = true, prayers = PRAYER_HOURS, sunrise = SUNRISE, sunset = PRAYER_HOURS[3][1] }: DialProps) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 40;
  const inner = R - 26;
  const ink = dark ? '#fff' : SC.ink;
  const faint = dark ? 'rgba(255,255,255,0.16)' : 'rgba(11,18,32,0.14)';

  const pt = (h: number, r: number): [number, number] => {
    const a = ((h - 12) / 24) * 2 * Math.PI;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  };
  const arc = (h1: number, h2: number, r: number) => {
    let d = h2 - h1;
    if (d < 0) d += 24;
    const [x1, y1] = pt(h1, r);
    const [x2, y2] = pt(h2, r);
    return `M${x1} ${y1} A${r} ${r} 0 ${d > 12 ? 1 : 0} 1 ${x2} ${y2}`;
  };

  const ni = prayers.findIndex(([, h]) => h > now);
  const nextI = ni < 0 ? 0 : ni;
  const [sx, sy] = pt(now, R);
  const day = now > sunrise && now < sunset;
  const lastH = [...prayers].reverse().find(([, h]) => h <= now)?.[1] ?? prayers[4][1];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke={faint} />
        <Path d={arc(sunrise, sunset, R)} fill="none" stroke={dark ? 'rgba(255,231,176,0.28)' : 'rgba(255,255,255,0.7)'} strokeWidth={8} strokeLinecap="round" />
        <Path d={arc(lastH, now, R)} fill="none" stroke={dark ? SC.mint : SC.green} strokeWidth={2.5} strokeLinecap="round" />
        {Array.from({ length: 24 }).map((_, h) => {
          const [a, b] = pt(h, R - 12);
          const [c, d] = pt(h, R - (h % 6 ? 16 : 22));
          return <Line key={h} x1={a} y1={b} x2={c} y2={d} stroke={faint} strokeWidth={1.2} />;
        })}
        {prayers.map(([n, h], i) => {
          const [x, y] = pt(h, R);
          const [lx, ly] = pt(h, R + 22);
          const past = h < now;
          const next = i === nextI;
          return (
            <G key={n}>
              {next && <Circle cx={x} cy={y} r={13} fill="none" stroke={ink} strokeOpacity={0.35} />}
              <Circle
                cx={x}
                cy={y}
                r={next ? 7 : 5}
                fill={past ? (dark ? SC.mint : SC.green) : next ? ink : dark ? SC.navy : '#fff'}
                stroke={past ? 'none' : ink}
                strokeWidth={1.8}
              />
              {showLabels && (
                <SvgText x={lx} y={ly + 4} fill={ink} opacity={next ? 1 : 0.6} fontSize={11.5} fontFamily={next ? FONT[700] : FONT[600]} textAnchor="middle">
                  {n}
                </SvgText>
              )}
            </G>
          );
        })}
        {day ? (
          <G>
            <Circle cx={sx} cy={sy} r={30} fill="#FFE7B0" opacity={0.16} />
            <Circle cx={sx} cy={sy} r={17} fill="#FFE7B0" opacity={0.32} />
            <Circle cx={sx} cy={sy} r={9} fill="#FFF3D6" />
          </G>
        ) : (
          <G>
            <Circle cx={sx} cy={sy} r={20} fill="#F5F0DC" opacity={0.14} />
            <Circle cx={sx} cy={sy} r={9} fill="#F5F0DC" />
            <Circle cx={sx + 4} cy={sy - 3} r={7.5} fill={now < 5 ? '#1D2456' : '#0A1430'} />
          </G>
        )}
        {queue.length > 0 && <Circle cx={cx} cy={cy} r={inner} fill="none" stroke={faint} strokeDasharray="2 5" />}
      </Svg>
      {queue.map(([m], i) => {
        const [x, y] = pt(now + 1.6 + i * 2.4, inner);
        return (
          <View key={m.id} pointerEvents="none" style={{ position: 'absolute', left: x - 19, top: y - 19 }}>
            <Av m={m} s={38} style={{ boxShadow: `0 0 0 3px ${dark ? 'rgba(10,18,40,0.85)' : 'rgba(255,255,255,0.9)'}` }} />
            {i === 0 && (
              <View
                style={{
                  position: 'absolute',
                  right: -4,
                  top: -4,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: SC.mint,
                  borderWidth: 2,
                  borderColor: dark ? '#141a3e' : '#fff',
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
