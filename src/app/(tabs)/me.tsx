import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Av, glass, hairline, RoundBtn, Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { MEMBERS } from '@/data/mock';
import { mintA, SC } from '@/theme/colors';

const HEAT = Array.from({ length: 84 }, (_, i) => {
  const v = (i * 37 + 11) % 9;
  return i > 60 ? (v > 1 ? 5 : 4) : v > 6 ? 2 : v > 3 ? 4 : 5;
});
const HEAT_COLOR: Record<number, string> = { 5: SC.mint, 4: mintA(0.6), 2: SC.amber };
const BADGES: [string, string, boolean][] = [
  ['7', 'Days', true],
  ['30', 'Days', false],
  ['40', 'Fajr', false],
  ['1', 'Jamāʿah', true],
];
const FRIEND_CODE = 'DCVPGB';

export default function MeScreen() {
  const [copied, setCopied] = useState(false);
  // 12 columns (weeks) × 7 rows (days), filled column-first like the design.
  const weeks = Array.from({ length: 12 }, (_, w) => HEAT.slice(w * 7, w * 7 + 7));

  return (
    <Screen bg="inner" withTabBar>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 16 }}>
        <RoundBtn n="gear" onPress={() => router.push('/settings')} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, marginTop: -16 }}>
        <Av m={MEMBERS[0]} s={64} />
        <View>
          <T style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.5 }}>mtomas</T>
          <T style={{ fontSize: 14, opacity: 0.6 }}>@abdullahimuhammad269</T>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 24, marginTop: 22 }}>
        <T style={{ fontSize: 110, fontWeight: '700', letterSpacing: -6, lineHeight: 100 }}>12</T>
        <View style={{ paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Icon n="flame" s={18} c={SC.amber} />
            <T style={{ fontSize: 18, fontWeight: '600' }}>day streak</T>
          </View>
          <T style={{ fontSize: 13, opacity: 0.6 }}>Best: 19 days · 7 to go</T>
        </View>
      </View>

      <Tap onPress={() => router.push('/calendar')} style={[glass, { marginHorizontal: 16, marginTop: 14, padding: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <T style={{ fontSize: 14, fontWeight: '600' }}>Last 12 weeks</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T style={{ fontSize: 14, opacity: 0.55 }}>89% on time</T>
            <Icon n="chev" s={14} c="rgba(255,255,255,0.4)" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, height: 150 }}>
          {weeks.map((days, w) => (
            <View key={w} style={{ flex: 1, gap: 4 }}>
              {days.map((v, d) => (
                <View key={d} style={{ flex: 1, borderRadius: 4, backgroundColor: HEAT_COLOR[v] ?? 'rgba(255,255,255,0.1)' }} />
              ))}
            </View>
          ))}
        </View>
      </Tap>

      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 10 }}>
        {BADGES.map(([a, b, on]) => (
          <View key={b + a} style={[glass, { flex: 1, borderRadius: 22, height: 90, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.1)' : 'transparent', opacity: on ? 1 : 0.45 }]}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: on ? SC.amber : 'transparent',
                borderWidth: on ? 0 : 1.5,
                borderStyle: 'dashed',
                borderColor: 'rgba(255,255,255,0.4)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <T style={{ color: on ? SC.ink : '#fff', fontWeight: '700', fontSize: 16 }}>{a}</T>
            </View>
            <T style={{ fontSize: 12, marginTop: 6 }}>{b}</T>
          </View>
        ))}
      </View>

      <View style={[glass, { marginHorizontal: 16, marginTop: 10, paddingVertical: 2, paddingHorizontal: 16 }]}>
        <Tap
          onPress={async () => {
            await Clipboard.setStringAsync(FRIEND_CODE);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', height: 44 }}>
          <T style={{ flex: 1, opacity: 0.65, fontSize: 14 }}>Friend code</T>
          <T style={{ fontWeight: '600', color: SC.mint, letterSpacing: 1, fontSize: 14 }}>{copied ? 'Copied' : FRIEND_CODE}</T>
          <Icon n={copied ? 'check' : 'copy'} s={16} c={SC.mint} style={{ marginLeft: 8 }} />
        </Tap>
        {[
          ['Location', 'Chicago, IL'],
          ['Calculation', 'ISNA · Ḥanafī Asr'],
        ].map(([a, b]) => (
          <Tap key={a} onPress={() => router.push('/settings')} style={{ flexDirection: 'row', alignItems: 'center', height: 44, borderTopWidth: 1, borderTopColor: hairline() }}>
            <T style={{ flex: 1, opacity: 0.65, fontSize: 14 }}>{a}</T>
            <T style={{ fontWeight: '600', fontSize: 14 }}>{b}</T>
            <Icon n="chev" s={16} c="rgba(255,255,255,0.4)" style={{ marginLeft: 6 }} />
          </Tap>
        ))}
      </View>
    </Screen>
  );
}
