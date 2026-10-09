import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { StoredVoice } from '@/components/voice';
import { Av, Cell, Chip, glass, hairline, Kicker, RoundBtn } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import type { PrayerStatus } from '@/data/mock';
import { isoDate, loadLogs, respondToNudge, STATUS_CELL, useInbox, useMyCircles, useNow, useQuery, type InboxItem } from '@/lib/data';
import { PRAYER_LABEL } from '@/lib/prayer-times';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

type Filter = 'All' | 'Nudges' | 'Prayed' | 'Jamāʿah';
const FILTERS: Filter[] = ['All', 'Nudges', 'Prayed', 'Jamāʿah'];

type Row = {
  key: string;
  at: Date;
  who: { id: string; name: string; init: string; color: string };
  filter: Exclude<Filter, 'All'>;
  text: ReactNode;
  nudge?: InboxItem;
  cell?: PrayerStatus;
  icon?: 'heart';
};

const B = ({ children }: { children: ReactNode }) => <T style={{ fontWeight: '700' }}>{children}</T>;

function ago(ms: number) {
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}

const REPLIES: Record<string, string[]> = {
  nudge: ['On my way', 'JazākAllāh'],
  together: ['Accept', 'Not this time'],
  dua: ['Āmīn', 'JazākAllāhu khayran'],
  voice: ['On my way', 'JazākAllāh'],
};

export default function ActivityScreen() {
  const { session } = useSession();
  const me = session?.user.id;
  const now = useNow(60_000);
  const [filter, setFilter] = useState<Filter>('All');
  const [sending, setSending] = useState<string | null>(null);

  const inbox = useInbox(me);
  const circles = useMyCircles(me);
  const mates = new Map((circles.data ?? []).flatMap((c) => c.members.filter((m) => !m.you)).map((m) => [m.id, m]));
  const since = isoDate(new Date(now.getTime() - 86_400_000));
  const logs = useQuery(mates.size ? `activity-logs:${[...mates.keys()].join(',')}:${since}` : null, () => loadLogs([...mates.keys()], since));

  const rows: Row[] = [
    ...(inbox.data ?? []).map((n): Row => {
      const p = PRAYER_LABEL[n.prayer];
      const text =
        n.kind === 'together' ? (
          <>
            <B>{n.sender.name}</B> invited you to pray {p} together
          </>
        ) : n.kind === 'voice' ? (
          <>
            <B>{n.sender.name}</B> sent you a voice note for {p}
          </>
        ) : n.kind === 'dua' ? (
          <>
            <B>{n.sender.name}</B> sent you a duʿāʾ{n.message ? `: ${n.message}` : ''}
          </>
        ) : (
          <>
            <B>{n.sender.name}</B> nudged you{n.message ? `: “${n.message}”` : ` for ${p}`}
          </>
        );
      return { key: `n-${n.id}`, at: n.createdAt, who: n.sender, filter: n.kind === 'together' ? 'Jamāʿah' : 'Nudges', text, nudge: n, icon: n.kind === 'dua' ? 'heart' : undefined };
    }),
    ...(logs.data ?? [])
      .filter((l) => mates.has(l.user_id))
      .map((l): Row => {
        const m = mates.get(l.user_id)!;
        return {
          key: `l-${l.user_id}-${l.prayed_on}-${l.prayer}`,
          at: new Date(l.logged_at),
          who: m,
          filter: 'Prayed',
          cell: STATUS_CELL[l.status],
          text: (
            <>
              <B>{m.name}</B> prayed {PRAYER_LABEL[l.prayer]}
              {l.status === 'on_time' ? ' on time' : l.status === 'late' ? ' (late)' : ''}
            </>
          ),
        };
      }),
  ]
    .filter((r) => filter === 'All' || r.filter === filter)
    .sort((a, b) => b.at.getTime() - a.at.getTime());

  const groups: [string, Row[]][] = [
    ['Last hour', rows.filter((r) => now.getTime() - r.at.getTime() < 3_600_000)],
    ['Today', rows.filter((r) => now.getTime() - r.at.getTime() >= 3_600_000 && isoDate(r.at) === isoDate(now))],
    ['Earlier', rows.filter((r) => isoDate(r.at) !== isoDate(now))],
  ];

  const reply = async (n: InboxItem, label: string) => {
    setSending(n.id);
    try {
      await respondToNudge(n.id, label);
    } finally {
      setSending(null);
    }
  };

  const loading = inbox.loading || circles.loading;

  return (
    <Screen bg="navy" header={<BackBar right={<RoundBtn n="gear" onPress={() => router.push('/settings')} />} />}>
      <PageTitle t="Activity" style={{ marginTop: 16 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={{ marginTop: 18, flexGrow: 0 }}>
        {FILTERS.map((t) => (
          <Chip key={t} bg={t === filter ? '#fff' : 'rgba(255,255,255,0.08)'} c={t === filter ? SC.ink : '#fff'} style={{ height: 36 }} textStyle={{ fontSize: 14 }} onPress={() => setFilter(t)}>
            {t}
          </Chip>
        ))}
      </ScrollView>

      {loading && <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />}
      {!loading && rows.length === 0 && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 24, padding: 20, alignItems: 'center' }]}>
          <Icon n="bell" s={28} c="rgba(255,255,255,0.5)" />
          <T style={{ fontSize: 16, fontWeight: '600', marginTop: 10 }}>Nothing here yet</T>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 4, textAlign: 'center' }}>Nudges, duʿāʾs and your circle’s prayers will show up here.</T>
        </View>
      )}

      <View style={{ marginHorizontal: 16, marginTop: 18, gap: 16 }}>
        {groups.map(([g, list]) =>
          list.length ? (
            <View key={g}>
              <Kicker style={{ opacity: 0.5, marginHorizontal: 8, marginBottom: 8 }}>{g.toUpperCase()}</Kicker>
              <View style={[glass, { paddingVertical: 2, paddingHorizontal: 14 }]}>
                {list.map((r, i) => {
                  const n = r.nudge;
                  const options = n ? REPLIES[n.kind] : undefined;
                  return (
                    <View key={r.key} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: hairline(), alignItems: 'flex-start' }}>
                      <Av m={r.who} s={36} />
                      <View style={{ flex: 1 }}>
                        <T style={{ fontSize: 14, lineHeight: 19 }}>{r.text}</T>
                        <T style={{ fontSize: 12, opacity: 0.45, marginTop: 2 }}>{ago(now.getTime() - r.at.getTime())}</T>
                        {n?.voicePath && (
                          <View style={{ marginTop: 8 }}>
                            <StoredVoice path={n.voicePath} />
                          </View>
                        )}
                        {n &&
                          options &&
                          (n.response ? (
                            <T style={{ fontSize: 13, color: SC.mint, marginTop: 8, fontWeight: '600' }}>✓ {n.response}</T>
                          ) : sending === n.id ? (
                            <ActivityIndicator style={{ alignSelf: 'flex-start', marginTop: 8 }} color={SC.mint} />
                          ) : (
                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                              {options.map((label, j) => (
                                <Chip
                                  key={label}
                                  bg={j === 0 ? SC.mint : undefined}
                                  c={j === 0 ? SC.ink : undefined}
                                  style={{ height: 30 }}
                                  textStyle={j === 0 ? { fontWeight: '600' } : undefined}
                                  onPress={() => reply(n, label)}>
                                  {label}
                                </Chip>
                              ))}
                            </View>
                          ))}
                      </View>
                      {r.cell && <Cell k={r.cell} s={22} />}
                      {r.icon === 'heart' && <Icon n="heart" s={20} c={SC.coral} />}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null,
        )}
      </View>
    </Screen>
  );
}
