import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Av, Cell, Chip, glass, RoundBtn, Tap } from '@/components/ui/primitives';
import { BackBar, Screen } from '@/components/ui/screen';
import { InkContext, T } from '@/components/ui/text';
import { memberById, type PrayerStatus } from '@/data/mock';
import { SC } from '@/theme/colors';

// Week grid: 5 prayers × 7 days, column-major like the design.
const WEEK = [...Array(30).fill('d'), 'n'] as PrayerStatus[];
WEEK[6] = 'l';

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const m = memberById(id);

  return (
    <Screen bg="member" header={<BackBar right={<RoundBtn n="more" />} />}>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <Av m={m} s={88} />
        <T style={{ fontSize: 30, fontWeight: '700', letterSpacing: -0.8, marginTop: 12 }}>{m.name}</T>
        <T style={{ fontSize: 14, opacity: 0.65, marginTop: 2 }}>
          {m.city} · it’s {m.local} there
        </T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 16 }}>
          <Chip>
            <Icon n="flame" s={15} c={SC.amber} />
            {`${m.streak} days`}
          </Chip>
          <Chip>98% on time</Chip>
          <Chip>Fam · Sisters</Chip>
        </View>
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 24, borderRadius: 28, backgroundColor: SC.mint, padding: 18 }}>
        <InkContext value={SC.ink}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <T style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, opacity: 0.6 }}>NEXT PRAYER</T>
              <T style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1, marginTop: 2 }}>
                {m.next} in {m.nin}
              </T>
              <T style={{ fontSize: 14, opacity: 0.65 }}>
                {m.at} {m.city} · 9:13 PM yours
              </T>
            </View>
            <Icon n="moon" s={28} w={1.6} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <Tap
              onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id } })}
              style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: SC.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon n="wave" s={18} c="#fff" />
              <T style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Nudge</T>
            </Tap>
            <Tap
              onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id, mode: 'dua' } })}
              style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: 'rgba(11,18,32,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon n="heart" s={18} />
              <T style={{ fontWeight: '600', fontSize: 15 }}>Send duʿāʾ</T>
            </Tap>
          </View>
        </InkContext>
      </View>

      <View style={[glass, { marginHorizontal: 16, marginTop: 16, padding: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <T style={{ fontSize: 14, fontWeight: '600' }}>This week</T>
          <T style={{ fontSize: 14, opacity: 0.55 }}>30 of 31 so far</T>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <View style={{ width: 26 }} />
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <T key={i} style={{ flex: 1, fontSize: 11, opacity: 0.5, textAlign: 'center', fontWeight: '600' }}>
              {d}
            </T>
          ))}
        </View>
        {['F', 'D', 'A', 'M', 'I'].map((p, r) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <T style={{ width: 26, fontSize: 11, opacity: 0.5, fontWeight: '600' }}>{p}</T>
            {Array.from({ length: 7 }).map((_, c) => (
              <View key={c} style={{ flex: 1, alignItems: 'center' }}>
                <Cell k={c > 2 ? 'u' : (WEEK[c * 5 + r] ?? 'u')} s={20} />
              </View>
            ))}
          </View>
        ))}
      </View>
      <T style={{ marginTop: 16, textAlign: 'center', fontSize: 12, opacity: 0.45 }}>Nudges set to “gentle”: max 1 per prayer</T>
    </Screen>
  );
}
