import { View } from 'react-native';

import { Cell, Tap } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { PRAYERS, type PrayerStatus } from '@/data/mock';

/** Today's five prayers with their status; the next one is highlighted. */
export function PrayerRow({
  st,
  dark,
  onPress,
  times,
}: {
  st: PrayerStatus[];
  dark: boolean;
  onPress?: (index: number) => void;
  /** Displayed times for the five prayers (defaults to the design's sample day). */
  times?: string[];
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16 }}>
      {PRAYERS.map(([n, sample], i) => {
        const t = times?.[i] ?? sample;
        const isN = st[i] === 'n';
        return (
          <Tap
            key={n}
            onPress={onPress ? () => onPress(i) : undefined}
            disabled={!onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 18,
              backgroundColor: isN ? (dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)') : 'transparent',
            }}>
            <T style={{ fontSize: 12, opacity: 0.75, fontWeight: '500' }}>{n}</T>
            <T style={{ fontSize: 15, fontWeight: '600' }}>{t}</T>
            <Cell k={st[i]} s={18} dark={dark} />
          </Tap>
        );
      })}
    </View>
  );
}
