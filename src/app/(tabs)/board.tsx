import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Av, glass, hairline, Segmented, Tap } from '@/components/ui/primitives';
import { PageTitle, Screen } from '@/components/ui/screen';
import { InkContext, T } from '@/components/ui/text';
import { MEMBERS } from '@/data/mock';
import { SC } from '@/theme/colors';

type Scope = 'fam' | 'friends' | 'public';
const [YOU, AB, ZA, YU, AY] = MEMBERS;
const ROWS: [typeof YOU, number, number][] = [
  [ZA, 98, 34],
  [YOU, 87, 30],
  [YU, 81, 28],
  [AB, 54, 21],
  [AY, 49, 19],
];

export default function BoardScreen() {
  const [scope, setScope] = useState<Scope>('fam');

  return (
    <Screen bg="inner" withTabBar>
      <PageTitle k="FAM · WEEK 29" t="This week" sub="Resets Sunday at Maghrib · 6 days left" style={{ marginTop: 8 }} />
      <View style={{ marginHorizontal: 16, marginTop: 20 }}>
        <Segmented
          height={44}
          value={scope}
          onChange={setScope}
          options={[
            { value: 'fam', label: 'Fam' },
            { value: 'friends', label: 'Friends' },
            { value: 'public', label: 'Public' },
          ]}
        />
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 18, borderRadius: 30, backgroundColor: SC.mint, paddingVertical: 20, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center' }}>
        <InkContext value={SC.ink}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <T style={{ fontSize: 84, fontWeight: '700', letterSpacing: -4, lineHeight: 80 }}>2</T>
            <T style={{ fontSize: 32, fontWeight: '700', marginTop: 34 }}>nd</T>
          </View>
          <View style={{ flex: 1, marginLeft: 18 }}>
            <T style={{ fontSize: 20, fontWeight: '700' }}>87 pts</T>
            <T style={{ fontSize: 13, opacity: 0.7, lineHeight: 18 }}>11 behind Zainab. Pray Maghrib on time to close the gap.</T>
          </View>
        </InkContext>
      </View>

      <View style={[glass, { marginHorizontal: 16, marginTop: 16, paddingVertical: 4, paddingHorizontal: 16 }]}>
        {ROWS.map(([m, pts, n], i) => (
          <Tap
            key={m.id}
            disabled={m.you}
            onPress={() => router.push(`/member/${m.id}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              height: 62,
              borderTopWidth: i && !m.you ? 1 : 0,
              borderTopColor: hairline(),
              marginHorizontal: m.you ? -10 : 0,
              paddingHorizontal: m.you ? 10 : 0,
              backgroundColor: m.you ? 'rgba(255,255,255,0.06)' : 'transparent',
              borderRadius: m.you ? 16 : 0,
            }}>
            <T style={{ width: 22, fontSize: 20, fontWeight: '700', opacity: i < 3 ? 1 : 0.45 }}>{i + 1}</T>
            <Av m={m} s={38} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T style={{ fontSize: 16, fontWeight: '600' }}>{m.name}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: 0.55 }}>
                  <Icon n="flame" s={13} />
                  <T style={{ fontSize: 12, fontWeight: '500' }}>{m.streak}</T>
                </View>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 7, overflow: 'hidden' }}>
                <View style={{ width: `${(n / 35) * 100}%`, height: '100%', backgroundColor: i === 0 ? SC.mint : 'rgba(255,255,255,0.55)', borderRadius: 3 }} />
              </View>
            </View>
            <View style={{ width: 52, alignItems: 'flex-end' }}>
              <T style={{ fontSize: 20, fontWeight: '700' }}>{pts}</T>
              <T style={{ fontSize: 11, opacity: 0.5 }}>{n}/35</T>
            </View>
          </Tap>
        ))}
      </View>
      <T style={{ marginTop: 16, fontSize: 12, opacity: 0.5, textAlign: 'center' }}>On time 3 · Late 1 · Prayed together +1</T>
    </Screen>
  );
}
