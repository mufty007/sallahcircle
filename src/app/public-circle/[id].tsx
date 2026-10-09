import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Sky } from '@/components/ui/background';
import { Av, Btn, Chip, glass, RoundBtn, Stars } from '@/components/ui/primitives';
import { BackBar, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { FEATURED_CIRCLE, MEMBERS, PUBLIC_CIRCLES } from '@/data/mock';
import { SKY } from '@/theme/colors';

export default function PublicCircleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [joined, setJoined] = useState(false);
  const other = PUBLIC_CIRCLES.find((c) => c.id === id);
  // Only Fajr Club has full details in the mock; other circles reuse its layout.
  const c = { ...FEATURED_CIRCLE, ...(other && { name: other.name, tagline: other.sub, onTime: `${other.pct}%` }) };

  return (
    <Screen
      bg="navy"
      decor={
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 330, overflow: 'hidden' }}>
          <Sky g={SKY.fajr} />
          <Stars n={30} h={200} />
          <View style={{ position: 'absolute', left: -20, right: -20, bottom: -150, height: 300, borderRadius: 999, backgroundColor: '#FFD2A6', opacity: 0.25, filter: 'blur(40px)' }} />
        </View>
      }
      header={<BackBar right={<RoundBtn n="share" />} />}
      footer={
        <Btn kind={joined ? 'ghost' : 'mint'} onPress={() => (joined ? router.push('/circles') : setJoined(true))}>
          {joined ? `You’re in ${c.name} ✓` : `Join ${c.name}`}
        </Btn>
      }>
      <View style={{ marginTop: 110, paddingHorizontal: 24 }}>
        <Chip bg="rgba(255,255,255,0.18)" style={{ height: 26 }} textStyle={{ fontSize: 12 }}>
          {`Public · ${c.focus}`}
        </Chip>
        <T style={{ fontSize: 48, fontWeight: '700', letterSpacing: -1.8, marginTop: 10, lineHeight: 50 }}>{c.name}</T>
        <T style={{ fontSize: 15, opacity: 0.85, marginTop: 6 }}>{c.tagline}</T>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 34 }}>
        {[
          [c.members, 'members'],
          [c.onTime, 'Fajr on time'],
          [c.avgStreak, 'avg. streak'],
        ].map(([a, b]) => (
          <View key={b} style={[glass, { flex: 1, borderRadius: 22, padding: 14 }]}>
            <T style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.6 }}>{a}</T>
            <T style={{ fontSize: 12, opacity: 0.6 }}>{b}</T>
          </View>
        ))}
      </View>

      <View style={[glass, { marginHorizontal: 16, marginTop: 12, padding: 16 }]}>
        <T style={{ fontSize: 16, fontWeight: '600', marginBottom: 6 }}>How it works</T>
        <T style={{ fontSize: 14, opacity: 0.7, lineHeight: 20 }}>{c.about}</T>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {c.tags.map((t) => (
            <Chip key={t} style={{ height: 28 }} textStyle={{ fontSize: 12 }}>
              {t}
            </Chip>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 24, marginTop: 20 }}>
        <View style={{ flexDirection: 'row' }}>
          {[MEMBERS[2], MEMBERS[3], MEMBERS[4], MEMBERS[1]].map((m, i) => (
            <Av key={m.id} m={m} s={30} style={{ marginLeft: i ? -8 : 0, borderWidth: 2, borderColor: '#0A1226' }} />
          ))}
        </View>
        <T style={{ fontSize: 13, opacity: 0.7 }}>
          <T style={{ fontWeight: '700' }}>Zainab</T> and 3 friends are members
        </T>
      </View>
    </Screen>
  );
}
