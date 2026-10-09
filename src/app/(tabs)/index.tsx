import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { OrbitDial } from '@/components/orbit-dial';
import { PrayerRow } from '@/components/prayer-row';
import { Icon } from '@/components/ui/icon';
import { Av, Chip, RoundBtn, Stars, Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { MEMBERS, PERIODS, PRAYERS } from '@/data/mock';
import { useAppState } from '@/state/app-state';
import { SC } from '@/theme/colors';

export default function TodayScreen() {
  const { period, cyclePeriod, logged } = useAppState();
  const { width } = useWindowDimensions();
  const p = PERIODS[period];
  const dark = p.dark;
  const size = Math.min(360, width - 30);
  const btn = dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)';
  const card = dark
    ? { backgroundColor: 'rgba(8,12,30,0.5)', borderColor: 'rgba(255,255,255,0.1)' }
    : { backgroundColor: 'rgba(255,255,255,0.82)', borderColor: 'rgba(255,255,255,0.9)' };
  const st = p.st.map((s, i) => logged[i] ?? s);
  const nextIndex = st.indexOf('n');

  return (
    <Screen
      bg={period}
      dark={dark}
      withTabBar
      decor={
        <>
          {p.stars && <Stars n={46} h={480} />}
          {period === 'fajr' && <Stars n={22} h={260} />}
        </>
      }>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 }}>
        <Chip bg={btn} style={{ height: 40, paddingHorizontal: 14 }} textStyle={{ fontSize: 15, fontWeight: '600' }} onPress={() => router.push('/circle/fam')}>
          <View style={{ flexDirection: 'row' }}>
            {MEMBERS.slice(1, 4).map((m, i) => (
              <View
                key={m.id}
                style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: m.color, marginLeft: i ? -6 : 0, borderWidth: 2, borderColor: dark ? '#262c61' : '#9cc8ee' }}
              />
            ))}
          </View>
          Fam
          <Icon n="down" s={16} />
        </Chip>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip bg={btn} style={{ height: 40 }} textStyle={{ fontSize: 15, fontWeight: '600' }} onPress={() => router.push('/me')}>
            <Icon n="flame" s={17} />
            12
          </Chip>
          <RoundBtn n="bell" bg={btn} dot onPress={() => router.push('/activity')} />
        </View>
      </View>

      {/* Tap the dial to log the current prayer; long-press to preview other times of day. */}
      <Tap
        onPress={() => router.push('/log-prayer')}
        onLongPress={cyclePeriod}
        accessibilityLabel={`${p.name} in ${p.cd}. Tap to log a prayer.`}
        style={{ alignSelf: 'center', marginTop: 8 }}>
        <OrbitDial now={p.now} dark={dark} queue={p.queue} size={size} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: size * 0.36, alignItems: 'center' }}>
          <T style={{ fontSize: 15, fontWeight: '600', opacity: 0.75 }}>{p.name} in</T>
          <T style={{ fontSize: 54, fontWeight: '600', letterSpacing: -2.5, lineHeight: 58, fontVariant: ['tabular-nums'] }}>{p.cd}</T>
          <T style={{ fontSize: 13, opacity: 0.65, marginTop: 2 }}>Adhān {p.at}</T>
        </View>
      </Tap>

      <View style={{ marginTop: 10 }}>
        <PrayerRow st={st} dark={dark} onPress={(i) => i === nextIndex && router.push({ pathname: '/log-prayer', params: { prayer: PRAYERS[i][0] } })} />
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 28, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 2, borderWidth: 1, ...card }}>
        <Tap onPress={() => router.push('/circle/fam')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <T style={{ fontSize: 16, fontWeight: '600' }}>Up next in Fam</T>
          <T style={{ fontSize: 13, opacity: 0.6, flexShrink: 1 }} numberOfLines={1}>
            {p.cardSub}
          </T>
        </Tap>
        {p.queue.slice(0, 2).map(([m, lab], i) => (
          <View
            key={m.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              height: 58,
              marginTop: i ? 0 : 4,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(11,18,32,0.06)',
            }}>
            <Tap onPress={() => router.push(`/member/${m.id}`)}>
              <Av m={m} s={36} />
            </Tap>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T style={{ fontSize: 15, fontWeight: '600' }}>{m.name}</T>
              <T style={{ fontSize: 13, opacity: 0.62 }} numberOfLines={1}>
                {lab} · {m.city}
              </T>
            </View>
            <RoundBtn n="together" s={36} bg={dark ? 'rgba(255,255,255,0.1)' : 'rgba(11,18,32,0.06)'} onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id, mode: 'together' } })} />
            <Tap
              onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: dark ? SC.mint : SC.green }}>
              <Icon n="wave" s={16} w={2} c={dark ? SC.ink : '#fff'} />
              <T style={{ fontSize: 14, fontWeight: '600', color: dark ? SC.ink : '#fff' }}>Nudge</T>
            </Tap>
          </View>
        ))}
      </View>
    </Screen>
  );
}
