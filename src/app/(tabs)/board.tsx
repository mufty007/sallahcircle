import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Av, Btn, Chip, glass, hairline, Tap } from '@/components/ui/primitives';
import { PageTitle, Screen } from '@/components/ui/screen';
import { InkContext, T } from '@/components/ui/text';
import { isoDate, loadBoard, loadStreaks, useMyCircles, useNow, useQuery, weekStart } from '@/lib/data';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const ordinal = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
const MAX_WEEK = 35;

export default function BoardScreen() {
  const { session, profile } = useSession();
  const me = session?.user.id;
  const now = useNow(60_000);
  const circles = useMyCircles(me);
  const [selected, setSelected] = useState<string | null>(null);
  const circle = circles.data?.find((c) => c.id === selected) ?? circles.data?.[0];

  const today = isoDate(now, profile?.timezone);
  const since = weekStart(today);
  const daysLeft = 7 - Math.round((Date.parse(today) - Date.parse(since)) / 86_400_000);
  const boardOn = circle?.leaderboardEnabled !== false;
  const board = useQuery(circle && boardOn ? `board:${circle.id}:${since}` : null, () => loadBoard(circle!.id, since));
  const ids = circle?.members.map((m) => m.id) ?? [];
  const streaks = useQuery(ids.length ? `streaks:${ids.join(',')}:${today}` : null, () => loadStreaks(ids));

  const rows = (board.data ?? []).map((r) => ({ ...r, m: circle!.members.find((x) => x.id === r.userId)! })).filter((r) => r.m);
  const myIndex = rows.findIndex((r) => r.m.you);
  const mine = rows[myIndex];
  const ahead = myIndex > 0 ? rows[myIndex - 1] : null;

  if (!circles.loading && !circle) {
    return (
      <Screen bg="inner" withTabBar>
        <PageTitle t="This week" style={{ marginTop: 8 }} />
        <View style={[glass, { marginHorizontal: 16, marginTop: 24, padding: 20 }]}>
          <T style={{ fontSize: 16, fontWeight: '600' }}>No leaderboard yet</T>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 4, marginBottom: 14 }}>Join or start a circle to compare the week with friends.</T>
          <Btn kind="mint" style={{ height: 48 }} textStyle={{ fontSize: 15 }} onPress={() => router.push('/find-circle')}>
            Find a circle
          </Btn>
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg="inner" withTabBar>
      <PageTitle k={circle ? `${circle.name.toUpperCase()} · WEEK OF ${since.slice(5).replace('-', '/')}` : ' '} t="This week" sub={`Resets Sunday · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`} style={{ marginTop: 8 }} />

      {(circles.data?.length ?? 0) > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={{ marginTop: 18, flexGrow: 0 }}>
          {circles.data!.map((c) => (
            <Chip key={c.id} bg={c.id === circle?.id ? '#fff' : 'rgba(255,255,255,0.08)'} c={c.id === circle?.id ? SC.ink : '#fff'} style={{ height: 36 }} textStyle={{ fontSize: 14 }} onPress={() => setSelected(c.id)}>
              {c.name}
            </Chip>
          ))}
        </ScrollView>
      )}

      {!boardOn && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 18, padding: 20 }]}>
          <T style={{ fontSize: 16, fontWeight: '600' }}>Leaderboard is off for this circle</T>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>The circle owner can turn it on in circle settings.</T>
        </View>
      )}

      {mine && (
        <View style={{ marginHorizontal: 16, marginTop: 18, borderRadius: 30, backgroundColor: SC.mint, paddingVertical: 20, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center' }}>
          <InkContext value={SC.ink}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <T style={{ fontSize: 84, fontWeight: '700', letterSpacing: -4, lineHeight: 80 }}>{myIndex + 1}</T>
              <T style={{ fontSize: 32, fontWeight: '700', marginTop: 34 }}>{ordinal(myIndex + 1)}</T>
            </View>
            <View style={{ flex: 1, marginLeft: 18 }}>
              <T style={{ fontSize: 20, fontWeight: '700' }}>{mine.points} pts</T>
              <T style={{ fontSize: 13, opacity: 0.7, lineHeight: 18 }}>
                {ahead
                  ? `${ahead.points - mine.points} behind ${ahead.m.name}. Pray on time to close the gap.`
                  : rows.length > 1
                    ? 'You’re leading the circle this week. Keep it up!'
                    : 'Invite people to make it a race.'}
              </T>
            </View>
          </InkContext>
        </View>
      )}

      {board.loading && <ActivityIndicator style={{ marginTop: 30 }} color="#fff" />}
      {rows.length > 0 && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 16, paddingVertical: 4, paddingHorizontal: 16 }]}>
          {rows.map((r, i) => {
            const prayed = r.onTime + r.late;
            const streak = streaks.data?.get(r.m.id) ?? 0;
            const you = r.m.you;
            return (
              <Tap
                key={r.m.id}
                disabled={you}
                onPress={() => router.push({ pathname: '/member/[id]', params: { id: r.m.id, circle: circle!.id } })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  height: 62,
                  borderTopWidth: i && !you ? 1 : 0,
                  borderTopColor: hairline(),
                  marginHorizontal: you ? -10 : 0,
                  paddingHorizontal: you ? 10 : 0,
                  backgroundColor: you ? 'rgba(255,255,255,0.06)' : 'transparent',
                  borderRadius: you ? 16 : 0,
                }}>
                <T style={{ width: 22, fontSize: 20, fontWeight: '700', opacity: i < 3 ? 1 : 0.45 }}>{i + 1}</T>
                <Av m={r.m} s={38} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T style={{ fontSize: 16, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
                      {you ? 'You' : r.m.name}
                    </T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: 0.55 }}>
                      <Icon n="flame" s={13} />
                      <T style={{ fontSize: 12, fontWeight: '500' }}>{streak}</T>
                    </View>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 7, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, (prayed / MAX_WEEK) * 100)}%`, height: '100%', backgroundColor: i === 0 ? SC.mint : 'rgba(255,255,255,0.55)', borderRadius: 3 }} />
                  </View>
                </View>
                <View style={{ width: 52, alignItems: 'flex-end' }}>
                  <T style={{ fontSize: 20, fontWeight: '700' }}>{r.points}</T>
                  <T style={{ fontSize: 11, opacity: 0.5 }}>
                    {prayed}/{MAX_WEEK}
                  </T>
                </View>
              </Tap>
            );
          })}
        </View>
      )}
      <T style={{ marginTop: 16, fontSize: 12, opacity: 0.5, textAlign: 'center' }}>On time 3 · Late 1 · Prayed in jamāʿah +1</T>
    </Screen>
  );
}
