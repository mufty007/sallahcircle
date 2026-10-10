import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Sky } from '@/components/ui/background';
import { Btn, Chip, glass, RoundBtn, Stars } from '@/components/ui/primitives';
import { BackBar, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { joinCircle, usePublicCircles } from '@/lib/data';
import { useSession } from '@/state/session';
import { SC, SKY } from '@/theme/colors';

const ABOUT: Record<string, string> = {
  Fajr: 'A circle for waking up for Fajr together. Members nudge each other before dawn and keep each other’s streaks going.',
  'All five prayers': 'Keep all five prayers on time with people who’ll check in on you, wherever they are in the world.',
  'Jumuʿah': 'Never miss Jumuʿah. Friendly reminders before the khuṭbah every Friday.',
  'Qurʾān daily': 'Pray on time and keep a daily connection with the Qurʾān, together.',
};

export default function PublicCircleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const pub = usePublicCircles(!!session);
  const c = pub.data?.find((x) => x.id === id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      await joinCircle(c.code);
      router.replace({ pathname: '/circle/[id]', params: { id: c.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join.');
      setBusy(false);
    }
  };

  return (
    <Screen
      bg="navy"
      decor={
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 330, overflow: 'hidden' }}>
          <Sky g={SKY.fajr} />
          <Stars n={30} h={200} />
        </View>
      }
      header={
        <BackBar
          right={
            c && (
              <RoundBtn
                n="more"
                accessibilityLabel="Report this circle"
                onPress={() => router.push({ pathname: '/report', params: { circle: c.id, name: c.name } })}
              />
            )
          }
        />
      }
      footer={
        c && (
          <>
            {error && <T style={{ color: SC.coral, fontSize: 14, textAlign: 'center' }}>{error}</T>}
            <Btn
              kind={c.joined ? 'ghost' : 'mint'}
              disabled={busy}
              icon={busy ? <ActivityIndicator color={SC.ink} /> : undefined}
              onPress={() => (c.joined ? router.replace({ pathname: '/circle/[id]', params: { id: c.id } }) : join())}>
              {c.joined ? `Open ${c.name}` : `Join ${c.name}`}
            </Btn>
          </>
        )
      }>
      {!c ? (
        <View style={{ marginTop: 140, alignItems: 'center' }}>
          {pub.loading ? <ActivityIndicator color="#fff" /> : <T style={{ opacity: 0.7 }}>This circle isn’t public any more.</T>}
        </View>
      ) : (
        <>
          <View style={{ marginTop: 110, paddingHorizontal: 24 }}>
            <Chip bg="rgba(255,255,255,0.18)" style={{ height: 26 }} textStyle={{ fontSize: 12 }}>
              {`Public · ${c.focus}`}
            </Chip>
            <T style={{ fontSize: 48, fontWeight: '700', letterSpacing: -1.8, marginTop: 10, lineHeight: 50 }}>{c.name}</T>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 34 }}>
            {[
              [String(c.memberCount), `member${c.memberCount === 1 ? '' : 's'}`],
              [c.focus === 'All five prayers' ? '5' : '1', 'daily focus'],
              ['2', 'nudges / prayer'],
            ].map(([a, b]) => (
              <View key={b} style={[glass, { flex: 1, borderRadius: 22, padding: 14 }]}>
                <T style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.6 }}>{a}</T>
                <T style={{ fontSize: 12, opacity: 0.6 }}>{b}</T>
              </View>
            ))}
          </View>

          <View style={[glass, { marginHorizontal: 16, marginTop: 12, padding: 16 }]}>
            <T style={{ fontSize: 16, fontWeight: '600', marginBottom: 6 }}>About</T>
            <T style={{ fontSize: 14, opacity: 0.7, lineHeight: 20 }}>{c.description || ABOUT[c.focus] || ABOUT['All five prayers']}</T>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {['Open to everyone', 'Up to 2 nudges / prayer', 'Weekly leaderboard'].map((t) => (
                <Chip key={t} style={{ height: 28 }} textStyle={{ fontSize: 12 }}>
                  {t}
                </Chip>
              ))}
            </View>
          </View>
          <T style={{ marginTop: 16, marginHorizontal: 32, textAlign: 'center', fontSize: 12, opacity: 0.5, lineHeight: 18 }}>
            Members see your name, city and whether you prayed — never the details.
          </T>
        </>
      )}
    </Screen>
  );
}
