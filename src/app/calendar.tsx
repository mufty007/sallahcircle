import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { glass, hairline, RoundBtn } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { SC } from '@/theme/colors';

const TODAY = 21;
const hijri = (d: number) => (d <= 13 ? d + 16 : d - 13);
const DONE = [5, 5, 4, 5, 5, 3, 5, 5, 5, 4, 5, 5, 5, 2, 5, 4, 5, 5, 5, 4];
const CELLS: (number | null)[] = [...Array(3).fill(null), ...Array.from({ length: 31 }, (_, i) => i + 1)];
while (CELLS.length % 7) CELLS.push(null);
const WEEKS = Array.from({ length: CELLS.length / 7 }, (_, w) => CELLS.slice(w * 7, w * 7 + 7));

const EVENTS: [string, string][] = [
  ['Jumuʿah', 'Fri 24 Jul · Khuṭbah 1:15 PM'],
  ['Ayyām al-Bīḍ fasts', '13–15 Ṣafar · Sun–Tue'],
  ['Rabīʿ al-Awwal begins', 'Moon sighting ≈ Thu 13 Aug'],
];

export default function CalendarScreen() {
  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle
        k="ṢAFAR 1448"
        t="July 2026"
        style={{ marginTop: 16 }}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <RoundBtn n="back" bg="rgba(255,255,255,0.08)" />
            <RoundBtn n="chev" bg="rgba(255,255,255,0.08)" />
          </View>
        }
      />

      <View style={[glass, { marginHorizontal: 16, marginTop: 20, paddingTop: 14, paddingHorizontal: 10, paddingBottom: 10 }]}>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <T key={i} style={{ flex: 1, fontSize: 12, textAlign: 'center', fontWeight: '600', color: i === 5 ? SC.mint : '#fff', opacity: i === 5 ? 1 : 0.5 }}>
              {d}
            </T>
          ))}
        </View>
        {WEEKS.map((week, w) => (
          <View key={w} style={{ flexDirection: 'row', marginBottom: 4 }}>
            {week.map((d, i) => {
              if (!d) return <View key={i} style={{ flex: 1 }} />;
              const today = d === TODAY;
              const past = d < TODAY;
              const c = past ? DONE[d - 1] : today ? 3 : 0;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    backgroundColor: today ? SC.mint : d === 14 ? 'rgba(255,255,255,0.08)' : 'transparent',
                  }}>
                  <T style={{ fontSize: 16, fontWeight: '600', color: today ? SC.ink : '#fff', opacity: past || today ? 1 : 0.55 }}>{d}</T>
                  <T style={{ fontSize: 10, opacity: 0.55, color: today ? SC.ink : '#fff' }}>{hijri(d)}</T>
                  <View style={{ flexDirection: 'row', gap: 1.5, height: 3 }}>
                    {(past || today) &&
                      [0, 1, 2, 3, 4].map((k) => (
                        <View
                          key={k}
                          style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: k < c ? (today ? SC.ink : c === 5 ? SC.mint : SC.amber) : 'rgba(255,255,255,0.18)' }}
                        />
                      ))}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10 }}>
        {[
          ['84', 'of 100 prayers'],
          ['12', 'perfect days'],
        ].map(([a, b]) => (
          <View key={b} style={[glass, { flex: 1, paddingVertical: 14, paddingHorizontal: 16 }]}>
            <T style={{ fontSize: 28, fontWeight: '700' }}>{a}</T>
            <T style={{ fontSize: 13, opacity: 0.6 }}>{b}</T>
          </View>
        ))}
      </View>

      <View style={[glass, { marginHorizontal: 16, marginTop: 10, paddingVertical: 2, paddingHorizontal: 16 }]}>
        {EVENTS.map(([t, s], i) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
            <Icon n="moon" s={18} c={SC.mint} />
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 14, fontWeight: '600' }}>{t}</T>
              <T style={{ fontSize: 11, opacity: 0.55 }}>{s}</T>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
