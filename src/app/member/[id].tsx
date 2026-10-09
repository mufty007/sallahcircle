import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Av, Cell, Chip, glass, Tap } from '@/components/ui/primitives';
import { BackBar, Screen } from '@/components/ui/screen';
import { InkContext, T } from '@/components/ui/text';
import { isoDate, loadLogs, loadMemberSchedules, loadStreaks, removeMember, shortIn, statusRow, useMyCircles, useNow, useQuery } from '@/lib/data';
import { formatTime, PRAYER_LABEL } from '@/lib/prayer-times';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const DAY = 86_400_000;

export default function MemberScreen() {
  const { id, circle: circleId } = useLocalSearchParams<{ id: string; circle?: string }>();
  const { session, profile } = useSession();
  const now = useNow(30_000);
  const [removing, setRemoving] = useState(false);
  const circles = useMyCircles(session?.user.id);
  const shared = (circles.data ?? []).filter((c) => c.members.some((m) => m.id === id));
  const m = shared.flatMap((c) => c.members).find((x) => x.id === id);
  const circle = shared.find((c) => c.id === circleId) ?? shared[0];

  const sched = useQuery(m ? `sched:${m.id}:${Math.floor(now.getTime() / 60_000)}` : null, () => loadMemberSchedules([m!]));
  const s = sched.data?.[0];
  const since = isoDate(new Date(now.getTime() - 60 * DAY), m?.timezone);
  const logs = useQuery(m ? `member-logs:${m.id}:${since}` : null, () => loadLogs([m!.id], since));
  const streaks = useQuery(m ? `streaks:${m.id}:${since}` : null, () => loadStreaks([m!.id]));

  if (!m) {
    return (
      <Screen bg="member" header={<BackBar />}>
        <View style={{ marginTop: 80, alignItems: 'center' }}>
          {circles.loading ? <ActivityIndicator color="#fff" /> : <T style={{ opacity: 0.7 }}>You don’t share a circle with this person.</T>}
        </View>
      </Screen>
    );
  }

  const today = isoDate(now, m.timezone);
  const all = logs.data ?? [];
  const streak = streaks.data?.get(m.id) ?? 0;
  const onTime = all.length ? Math.round((all.filter((l) => l.status === 'on_time').length / all.length) * 100) : null;

  // Last 7 days (oldest → today) in the member's own calendar.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * DAY);
    return { date: isoDate(d, m.timezone), label: d.toLocaleDateString('en-US', { weekday: 'narrow', timeZone: m.timezone ?? undefined }) };
  });
  const grid = days.map(({ date }) => statusRow(all, m.id, date, date === today && s?.prayerDate === today ? s.next : undefined));
  const weekLogged = days.reduce((n, { date }) => n + all.filter((l) => l.prayed_on === date && l.status !== 'missed').length, 0);

  return (
    <Screen bg="member" header={<BackBar />}>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <Av m={m} s={88} />
        <T style={{ fontSize: 30, fontWeight: '700', letterSpacing: -0.8, marginTop: 12 }}>{m.name}</T>
        <T style={{ fontSize: 14, opacity: 0.65, marginTop: 2 }}>
          {m.city ? `${m.city} · ` : ''}
          {m.timezone ? `it’s ${formatTime(now, m.timezone, true)} there` : 'Location not set'}
        </T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 16 }}>
          <Chip>
            <Icon n="flame" s={15} c={SC.amber} />
            {`${streak} day${streak === 1 ? '' : 's'}`}
          </Chip>
          {onTime !== null && <Chip>{`${onTime}% on time`}</Chip>}
          {shared.length > 0 && <Chip>{shared.map((c) => c.name).join(' · ')}</Chip>}
        </View>
      </View>

      {!m.you && m.paused && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
          <Icon n="moon" s={26} c="rgba(255,255,255,0.7)" />
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 17, fontWeight: '600' }}>Paused for now</T>
            <T style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>{m.name} is taking a break. Nudges are off until they’re back.</T>
          </View>
        </View>
      )}
      {!m.you && !m.paused && (
        <View style={{ marginHorizontal: 16, marginTop: 24, borderRadius: 28, backgroundColor: SC.mint, padding: 18 }}>
          <InkContext value={SC.ink}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <T style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, opacity: 0.6 }}>NEXT PRAYER</T>
                <T style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1, marginTop: 2 }}>
                  {s ? `${PRAYER_LABEL[s.next]} in ${shortIn(s.at.getTime() - now.getTime())}` : m.place ? '…' : 'No location yet'}
                </T>
                {s && (
                  <T style={{ fontSize: 14, opacity: 0.65 }}>
                    {formatTime(s.at, m.timezone, true)}
                    {m.city ? ` ${m.city}` : ''} · {formatTime(s.at, profile?.timezone, true)} yours
                  </T>
                )}
              </View>
              <Icon n="moon" s={28} w={1.6} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Tap
                disabled={!circle}
                onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id, circle: circle?.id } })}
                style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: SC.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon n="wave" s={18} c="#fff" />
                <T style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Nudge</T>
              </Tap>
              <Tap
                disabled={!circle}
                onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id, circle: circle?.id, mode: 'dua' } })}
                style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: 'rgba(11,18,32,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon n="heart" s={18} />
                <T style={{ fontWeight: '600', fontSize: 15 }}>Send duʿāʾ</T>
              </Tap>
            </View>
          </InkContext>
        </View>
      )}

      <View style={[glass, { marginHorizontal: 16, marginTop: 16, padding: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <T style={{ fontSize: 14, fontWeight: '600' }}>Last 7 days</T>
          <T style={{ fontSize: 14, opacity: 0.55 }}>{weekLogged} of 35 prayed</T>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <View style={{ width: 26 }} />
          {days.map((d, i) => (
            <T key={i} style={{ flex: 1, fontSize: 11, opacity: 0.5, textAlign: 'center', fontWeight: '600' }}>
              {d.label}
            </T>
          ))}
        </View>
        {['F', 'D', 'A', 'M', 'I'].map((p, r) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <T style={{ width: 26, fontSize: 11, opacity: 0.5, fontWeight: '600' }}>{p}</T>
            {grid.map((row, c) => (
              <View key={c} style={{ flex: 1, alignItems: 'center' }}>
                <Cell k={row[r]} s={20} />
              </View>
            ))}
          </View>
        ))}
      </View>

      {circle && !m.you && circle.createdBy === session?.user.id && (
        <Tap
          disabled={removing}
          onPress={() =>
            Alert.alert(`Remove ${m.name}?`, `They’ll lose access to ${circle.name}. Reset the invite code if you don’t want them rejoining.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  setRemoving(true);
                  try {
                    await removeMember(circle.id, m.id);
                    router.back();
                  } catch (e) {
                    Alert.alert('Couldn’t remove', e instanceof Error ? e.message : '');
                    setRemoving(false);
                  }
                },
              },
            ])
          }
          style={[glass, { marginHorizontal: 16, marginTop: 16, height: 50, alignItems: 'center', justifyContent: 'center' }]}>
          {removing ? <ActivityIndicator color={SC.coral} /> : <T style={{ fontSize: 15, fontWeight: '600', color: SC.coral }}>{`Remove from ${circle.name}`}</T>}
        </Tap>
      )}
    </Screen>
  );
}
