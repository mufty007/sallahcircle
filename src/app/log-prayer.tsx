import { useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { View } from 'react-native';

import { Sheet, useCloseSheet } from '@/components/sheet';
import { Icon, type IconName } from '@/components/ui/icon';
import { Btn, Tap, Toggle } from '@/components/ui/primitives';
import { InkContext, T } from '@/components/ui/text';
import { PERIODS, PRAYERS } from '@/data/mock';
import { useAppState } from '@/state/app-state';
import { SC } from '@/theme/colors';

export default function LogPrayerSheet() {
  return (
    <Sheet>
      <LogPrayerContent />
    </Sheet>
  );
}

function LogPrayerContent() {
  const close = useCloseSheet();
  const params = useLocalSearchParams<{ prayer?: string }>();
  const { period, logPrayer } = useAppState();
  const name = params.prayer ?? PERIODS[period].name;
  const index = Math.max(0, PRAYERS.findIndex(([n]) => n === name));
  const at = PERIODS[period].name === name ? PERIODS[period].at : `${PRAYERS[index][1]}`;

  const [late, setLate] = useState(false);
  const [jamaah, setJamaah] = useState(true);
  const [masjid, setMasjid] = useState(false);

  const extras: [IconName, string, string, boolean, (v: boolean) => void][] = [
    ['together', 'In jamāʿah', '+1 bonus point', jamaah, setJamaah],
    ['pin', 'At the masjid', 'Masjid Al-Faatir', masjid, setMasjid],
  ];

  return (
    <>
      <T style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, opacity: 0.5 }}>
        {name.toUpperCase()} · {at}
      </T>
      <T style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1, marginTop: 4 }}>Did you pray {name}?</T>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Option title="On time" sub="Within its window" on={!late} onPress={() => setLate(false)} dot={SC.mint} />
        <Option title="Late" sub="Made it up (qaḍāʾ)" on={late} onPress={() => setLate(true)} dot={SC.amber} />
      </View>

      <View style={{ marginTop: 12, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(11,18,32,0.07)', paddingHorizontal: 16 }}>
        {extras.map(([ic, t, s, on, set], i) => (
          <Fragment key={t}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 60, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(11,18,32,0.06)' }}>
              <Icon n={ic} s={20} style={{ opacity: 0.7 }} />
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 15, fontWeight: '600' }}>{t}</T>
                <T style={{ fontSize: 12, opacity: 0.55 }}>{s}</T>
              </View>
              <Toggle on={on} onChange={set} light />
            </View>
          </Fragment>
        ))}
      </View>

      <Btn
        kind="ink"
        style={{ marginTop: 16, height: 58, borderRadius: 29 }}
        onPress={() => {
          logPrayer(index, late ? 'l' : 'd');
          close();
        }}>
        Log {name}
      </Btn>
      <T style={{ fontSize: 12, opacity: 0.5, textAlign: 'center', marginTop: 12 }}>Your circle sees ✓ only, never the details.</T>
    </>
  );
}

function Option({ title, sub, on, onPress, dot }: { title: string; sub: string; on: boolean; onPress: () => void; dot: string }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      style={{
        flex: 1,
        height: 96,
        borderRadius: 24,
        backgroundColor: on ? SC.green : '#fff',
        borderWidth: 1,
        borderColor: 'rgba(11,18,32,0.07)',
        padding: 14,
        justifyContent: 'space-between',
      }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: on ? SC.mint : dot, alignItems: 'center', justifyContent: 'center' }}>
        <Icon n="check" s={16} c={SC.ink} w={2.6} />
      </View>
      <InkContext value={on ? '#fff' : SC.ink}>
        <View>
          <T style={{ fontSize: 16, fontWeight: '700' }}>{title}</T>
          <T style={{ fontSize: 12, opacity: 0.65 }}>{sub}</T>
        </View>
      </InkContext>
    </Tap>
  );
}
