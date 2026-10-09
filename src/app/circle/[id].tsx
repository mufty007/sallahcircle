import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Av, Cell, Chip, glass, hairline, Kicker, Legend, Ring, RoundBtn, Tap } from '@/components/ui/primitives';
import { BackBar, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { MEMBERS, MY_CIRCLE } from '@/data/mock';
import { mintA, SC } from '@/theme/colors';

const [, AB, ZA, YU] = MEMBERS;
const TIMELINE: [typeof AB, string, string][] = [
  [AB, '7m', 'Maghrib 9:07 PM'],
  [ZA, '14m', 'Fajr 3:13 AM'],
  [YU, '31m', 'Isha 10:30 PM'],
];

export default function CircleScreen() {
  const [copied, setCopied] = useState(false);
  const c = MY_CIRCLE;

  return (
    <Screen
      bg="inner"
      header={
        <BackBar
          right={
            <>
              <Chip
                style={{ height: 40 }}
                textStyle={{ fontSize: 13, letterSpacing: 1, fontWeight: '600' }}
                onPress={async () => {
                  await Clipboard.setStringAsync(c.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}>
                {copied ? 'COPIED' : c.code}
                <Icon n={copied ? 'check' : 'copy'} s={15} />
              </Chip>
              <RoundBtn n="more" onPress={() => router.push('/invite')} />
            </>
          }
        />
      }>
      <View style={{ marginTop: 16, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <T style={{ fontSize: 44, fontWeight: '700', letterSpacing: -1.5, lineHeight: 46 }}>{c.name}</T>
          <T style={{ fontSize: 14, opacity: 0.6, marginTop: 8 }}>
            {c.members} members · {c.zones} time zones · {c.privacy}
          </T>
        </View>
        <Ring pct={c.onTime} size={64} label={`${Math.round(c.onTime * 100)}%`} />
      </View>

      <Kicker style={{ marginTop: 26, marginHorizontal: 24 }}>UP NEXT</Kicker>
      <View style={{ marginHorizontal: 16, marginTop: 6 }}>
        <LinearGradient colors={[SC.mint, 'rgba(255,255,255,0.08)']} style={{ position: 'absolute', left: 44, top: 30, bottom: 30, width: 2 }} />
        {TIMELINE.map(([m, t, s], i) => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', height: 78 }}>
            <T style={{ width: 34, fontSize: i ? 15 : 18, fontWeight: '700', textAlign: 'right', opacity: i ? 0.7 : 1 }}>{t}</T>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                marginLeft: 4,
                marginRight: 14,
                backgroundColor: i ? '#141a3e' : SC.mint,
                borderWidth: 2,
                borderColor: i ? 'rgba(255,255,255,0.35)' : SC.mint,
              }}
            />
            <Tap
              onPress={() => router.push(`/member/${m.id}`)}
              style={{
                flex: 1,
                height: 66,
                borderRadius: 22,
                backgroundColor: i ? 'rgba(255,255,255,0.05)' : mintA(0.14),
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.07)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingLeft: 12,
                paddingRight: 10,
              }}>
              <Av m={m} s={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={{ fontSize: 15, fontWeight: '600' }}>{m.name}</T>
                <T style={{ fontSize: 12, opacity: 0.6 }} numberOfLines={1}>
                  {s} · {m.city}
                </T>
              </View>
              <RoundBtn n="together" s={36} onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id, mode: 'together' } })} />
              <Tap
                onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id } })}
                accessibilityLabel={`Nudge ${m.name}`}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SC.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="wave" s={17} c={SC.ink} w={2} />
              </Tap>
            </Tap>
          </View>
        ))}
      </View>

      <View style={[glass, { marginHorizontal: 16, marginTop: 18, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 2 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 24 }}>
          <T style={{ flex: 1, fontSize: 15, fontWeight: '600' }}>Today</T>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['F', 'D', 'A', 'M', 'I'].map((x) => (
              <T key={x} style={{ width: 20, fontSize: 11, opacity: 0.55, textAlign: 'center', fontWeight: '600' }}>
                {x}
              </T>
            ))}
          </View>
        </View>
        {MEMBERS.map((m) => (
          <Tap
            key={m.id}
            disabled={m.you}
            onPress={() => router.push(`/member/${m.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', height: 52, borderTopWidth: 1, borderTopColor: hairline() }}>
            <Av m={m} s={30} />
            <T style={{ flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
              {m.you ? 'You' : m.name}
              <T style={{ fontSize: 12, opacity: 0.5 }}>{'  '}{m.local}</T>
            </T>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {m.st.map((k, i) => (
                <Cell key={i} k={k} s={20} />
              ))}
            </View>
          </Tap>
        ))}
      </View>
      <View style={{ marginTop: 18 }}>
        <Legend />
      </View>
    </Screen>
  );
}
