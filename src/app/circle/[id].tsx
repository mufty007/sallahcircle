import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Av, Cell, Chip, glass, hairline, Kicker, Legend, Ring, RoundBtn, Tap } from '@/components/ui/primitives';
import { BackBar, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { isoDate, loadLogs, loadMemberSchedules, shortIn, statusRow, useMyCircles, useNow, useQuery } from '@/lib/data';
import { formatTime, PRAYER_KEYS, PRAYER_LABEL } from '@/lib/prayer-times';
import { useSession } from '@/state/session';
import { mintA, SC } from '@/theme/colors';

export default function CircleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const now = useNow(30_000);
  const [copied, setCopied] = useState(false);

  const circles = useMyCircles(session?.user.id);
  const c = circles.data?.find((x) => x.id === id);
  const members = c?.members ?? [];
  const minuteKey = Math.floor(now.getTime() / 60_000);
  const schedules = useQuery(c ? `circle-sched:${c.id}:${members.map((m) => m.id).join(',')}:${minuteKey}` : null, () => loadMemberSchedules(members));
  const since = isoDate(new Date(now.getTime() - 2 * 86_400_000));
  const logs = useQuery(c ? `circle-logs:${members.map((m) => m.id).join(',')}:${since}` : null, () =>
    loadLogs(
      members.map((m) => m.id),
      since,
    ),
  );

  if (!c) {
    return (
      <Screen bg="inner" header={<BackBar />}>
        <View style={{ marginTop: 80, alignItems: 'center' }}>
          {circles.loading ? <ActivityIndicator color="#fff" /> : <T style={{ opacity: 0.7 }}>This circle isn’t available.</T>}
        </View>
      </Screen>
    );
  }

  const sched = schedules.data ?? [];
  const timeline = sched.filter((s) => !s.member.you).slice(0, 3);
  const zones = new Set(members.map((m) => m.timezone).filter(Boolean)).size;

  // Today's progress: completed prayers ÷ prayers already due, across members.
  let due = 0;
  let done = 0;
  const rows = members.map((m) => {
    const s = sched.find((x) => x.member.id === m.id);
    const date = s?.today ?? isoDate(now, m.timezone);
    const row = statusRow(logs.data ?? [], m.id, date, s && s.prayerDate === s.today ? s.next : undefined);
    if (s) {
      PRAYER_KEYS.forEach((p, i) => {
        if (s.day.times[p] <= now) {
          due++;
          if (row[i] === 'd' || row[i] === 'l') done++;
        }
      });
    }
    return { m, row };
  });
  const pct = due ? done / due : 0;

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
              <RoundBtn n="plus" onPress={() => router.push({ pathname: '/invite', params: { circle: c.id } })} />
            </>
          }
        />
      }>
      <View style={{ marginTop: 16, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flexShrink: 1 }}>
          <T style={{ fontSize: 44, fontWeight: '700', letterSpacing: -1.5, lineHeight: 46 }} numberOfLines={1}>
            {c.name}
          </T>
          <T style={{ fontSize: 14, opacity: 0.6, marginTop: 8 }}>
            {members.length} member{members.length === 1 ? '' : 's'}
            {zones > 1 ? ` · ${zones} time zones` : ''} · {c.visibility === 'public' ? 'Public' : 'Private'}
          </T>
        </View>
        <Ring pct={pct} size={64} label={due ? `${Math.round(pct * 100)}%` : '–'} />
      </View>

      <Kicker style={{ marginTop: 26, marginHorizontal: 24 }}>UP NEXT</Kicker>
      <View style={{ marginHorizontal: 16, marginTop: 6 }}>
        {timeline.length > 1 && <LinearGradient colors={[SC.mint, 'rgba(255,255,255,0.08)']} style={{ position: 'absolute', left: 44, top: 30, bottom: 30, width: 2 }} />}
        {!schedules.data && members.length > 1 && <ActivityIndicator style={{ marginVertical: 24 }} color="#fff" />}
        {members.length <= 1 && (
          <Tap onPress={() => router.push({ pathname: '/invite', params: { circle: c.id } })} style={[glass, { padding: 16, marginTop: 6 }]}>
            <T style={{ fontSize: 15, fontWeight: '600' }}>Invite your people</T>
            <T style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Share code {c.code} so they can join.</T>
          </Tap>
        )}
        {timeline.map((s, i) => {
          const m = s.member;
          return (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', height: 78 }}>
              <T style={{ width: 40, fontSize: i ? 14 : 16, fontWeight: '700', textAlign: 'right', opacity: i ? 0.7 : 1 }} numberOfLines={1}>
                {shortIn(s.at.getTime() - now.getTime())}
              </T>
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
                onPress={() => router.push({ pathname: '/member/[id]', params: { id: m.id, circle: c.id } })}
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
                  <T style={{ fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                    {m.name}
                  </T>
                  <T style={{ fontSize: 12, opacity: 0.6 }} numberOfLines={1}>
                    {PRAYER_LABEL[s.next]} {formatTime(s.at, m.timezone, true)}
                    {m.city ? ` · ${m.city}` : ''}
                  </T>
                </View>
                <RoundBtn n="together" s={36} onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id, circle: c.id, mode: 'together' } })} />
                <Tap
                  onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id, circle: c.id } })}
                  accessibilityLabel={`Nudge ${m.name}`}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SC.mint, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon n="wave" s={17} c={SC.ink} w={2} />
                </Tap>
              </Tap>
            </View>
          );
        })}
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
        {rows.map(({ m, row }) => (
          <Tap
            key={m.id}
            disabled={m.you}
            onPress={() => router.push({ pathname: '/member/[id]', params: { id: m.id, circle: c.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', height: 52, borderTopWidth: 1, borderTopColor: hairline() }}>
            <Av m={m} s={30} />
            <T style={{ flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
              {m.you ? 'You' : m.name}
              {m.timezone && <T style={{ fontSize: 12, opacity: 0.5 }}>{'  '}{formatTime(now, m.timezone, true)}</T>}
            </T>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {row.map((k, i) => (
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
