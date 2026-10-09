import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Av, Cell, Chip, glass, hairline, Kicker, RoundBtn } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { MEMBERS, type Member } from '@/data/mock';
import { SC } from '@/theme/colors';

type Kind = 'reply' | 'voice' | 'jam' | 'done' | 'heart' | 'flame';
type Item = { m: Member; text: ReactNode; time: string; kind: Kind; filter: Filter };
type Filter = 'All' | 'Nudges' | 'Prayed' | 'Jamāʿah';

const [, AB, ZA, YU, AY] = MEMBERS;
const B = ({ children }: { children: ReactNode }) => <T style={{ fontWeight: '700' }}>{children}</T>;

const GROUPS: [string, Item[]][] = [
  [
    'Now',
    [
      { m: AB, text: <><B>Abdullahi</B> nudged you: “Maghrib in 7m. Let’s go”</>, time: 'now', kind: 'reply', filter: 'Nudges' },
      { m: ZA, text: <><B>Zainab</B> sent a voice note</>, time: '2m', kind: 'voice', filter: 'Nudges' },
    ],
  ],
  [
    'Earlier today',
    [
      { m: YU, text: <><B>Yusuf</B> invited you to pray Isha together · 10:30 PM</>, time: '12m', kind: 'jam', filter: 'Jamāʿah' },
      { m: YU, text: <><B>Yusuf</B> prayed Maghrib on time</>, time: '34m', kind: 'done', filter: 'Prayed' },
      { m: AY, text: <><B>Ayuba</B> sent you a duʿāʾ: <T style={{ fontFamily: 'serif' }}>بارك الله فيك</T></>, time: '2h', kind: 'heart', filter: 'Nudges' },
      { m: ZA, text: <><B>Zainab</B> hit a 40-day Fajr streak</>, time: '6h', kind: 'flame', filter: 'Prayed' },
    ],
  ],
];

const FILTERS: Filter[] = ['All', 'Nudges', 'Prayed', 'Jamāʿah'];

export default function ActivityScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const [answered, setAnswered] = useState<Record<string, string>>({});

  const reply = (key: string, label: string) => setAnswered((a) => ({ ...a, [key]: label }));

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

      <View style={{ marginHorizontal: 16, marginTop: 18, gap: 16 }}>
        {GROUPS.map(([g, rows]) => {
          const visible = rows.filter((r) => filter === 'All' || r.filter === filter);
          if (!visible.length) return null;
          return (
            <View key={g}>
              <Kicker style={{ opacity: 0.5, marginHorizontal: 8, marginBottom: 8 }}>{g.toUpperCase()}</Kicker>
              <View style={[glass, { paddingVertical: 2, paddingHorizontal: 14 }]}>
                {visible.map((r, i) => {
                  const key = `${g}-${i}`;
                  return (
                    <View key={key} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: hairline(), alignItems: 'flex-start' }}>
                      <Av m={r.m} s={36} />
                      <View style={{ flex: 1 }}>
                        <T style={{ fontSize: 14, lineHeight: 19 }}>{r.text}</T>
                        <T style={{ fontSize: 12, opacity: 0.45, marginTop: 2 }}>{r.time}</T>
                        {(r.kind === 'reply' || r.kind === 'jam') &&
                          (answered[key] ? (
                            <T style={{ fontSize: 13, color: SC.mint, marginTop: 8, fontWeight: '600' }}>✓ {answered[key]}</T>
                          ) : (
                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                              {(r.kind === 'reply' ? ['On my way', 'JazākAllāh'] : ['Accept', 'Not this time']).map((label, j) => (
                                <Chip
                                  key={label}
                                  bg={j === 0 ? SC.mint : undefined}
                                  c={j === 0 ? SC.ink : undefined}
                                  style={{ height: 30 }}
                                  textStyle={j === 0 ? { fontWeight: '600' } : undefined}
                                  onPress={() => reply(key, label)}>
                                  {label}
                                </Chip>
                              ))}
                            </View>
                          ))}
                        {r.kind === 'voice' && <VoiceNote />}
                      </View>
                      {r.kind === 'done' && <Cell k="d" s={22} />}
                      {r.kind === 'heart' && <Icon n="heart" s={20} c={SC.coral} />}
                      {r.kind === 'flame' && <Icon n="flame" s={20} c={SC.amber} />}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function VoiceNote() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start' }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: SC.coral, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 0, height: 0, marginLeft: 2, borderLeftWidth: 7, borderLeftColor: '#fff', borderTopWidth: 5, borderTopColor: 'transparent', borderBottomWidth: 5, borderBottomColor: 'transparent' }} />
      </View>
      {[6, 10, 14, 9, 12, 16, 8, 5, 11, 13].map((h, j) => (
        <View key={j} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: '#fff', opacity: 0.6 }} />
      ))}
      <T style={{ fontSize: 12, opacity: 0.6 }}>0:08</T>
    </View>
  );
}
