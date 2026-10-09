import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { glass, hairline, Kicker, Tap } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { excusedDates, isoDate, loadQada, QADA_ITEMS, setQada, useExcused, useNow, useQuery, type QadaCount, type QadaItem } from '@/lib/data';
import { fetchHijriMonth, PRAYER_LABEL } from '@/lib/prayer-times';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const LABEL: Record<QadaItem, string> = { ...PRAYER_LABEL, fast: 'Fasts' };

/** Excused days that fell in Ramadan, grouped by Hijri year (each is a fast to make up). */
async function ramadanExcused(dates: Set<string>) {
  const months = [...new Set([...dates].map((d) => d.slice(0, 7)))];
  const byYear = new Map<string, number>();
  for (const ym of months) {
    const cal = await fetchHijriMonth(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)));
    cal.forEach((c, i) => {
      const iso = `${ym}-${String(i + 1).padStart(2, '0')}`;
      if (dates.has(iso) && c.hijri.month.number === 9) byYear.set(c.hijri.year, (byYear.get(c.hijri.year) ?? 0) + 1);
    });
  }
  const applied = await Promise.all([...byYear.keys()].map(async (y) => [y, (await AsyncStorage.getItem(`qada:ramadan:${y}`).catch(() => null)) != null] as const));
  return [...byYear].filter(([y]) => !applied.find(([a, done]) => a === y && done)).map(([year, n]) => ({ year, n }));
}

export default function QadaScreen() {
  const { session, profile } = useSession();
  const me = session?.user.id;
  const now = useNow(60_000);
  const today = isoDate(now, profile?.timezone);
  const counts = useQuery(me ? `qada:${me}` : null, () => loadQada(me!));
  const excused = useExcused(me, !!profile?.track_excused);
  const exDates = excusedDates(excused.data, today);
  const suggestions = useQuery(me && exDates.size ? `qada-ramadan:${me}:${exDates.size}:${excused.data?.[0]?.startedOn}` : null, () => ramadanExcused(exDates));
  const [busy, setBusy] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const change = async (key: string, item: QadaItem, patch: { owed?: number; madeUp?: number }) => {
    setBusy(key);
    try {
      await setQada(me!, item, patch);
    } finally {
      setBusy(null);
    }
  };

  const list = QADA_ITEMS.map((i) => counts.data?.get(i) ?? { item: i, owed: 0, madeUp: 0 });
  const left = (c: QadaCount) => Math.max(0, c.owed - c.madeUp);
  const totalLeft = list.reduce((n, c) => n + left(c), 0);
  const totalDone = list.reduce((n, c) => n + c.madeUp, 0);

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle k="PRIVATE TO YOU" t="Qaḍāʾ" sub={counts.data ? `${totalLeft} left · ${totalDone} made up` : undefined} style={{ marginTop: 16 }} />
      <T style={{ marginHorizontal: 24, marginTop: 8, fontSize: 14, opacity: 0.6, lineHeight: 20 }}>
        Keep count of prayers and fasts you owe, and tick them off as you make them up. A qaḍāʾ fast logged in Fasting counts here automatically.
      </T>

      {(suggestions.data ?? [])
        .filter((s) => !dismissed.includes(s.year))
        .map((s) => (
          <View key={s.year} style={[glass, { marginHorizontal: 16, marginTop: 16, padding: 16 }]}>
            <T style={{ fontSize: 15, fontWeight: '600' }}>{`${s.n} excused day${s.n === 1 ? '' : 's'} fell in Ramaḍān ${s.year}`}</T>
            <T style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Those fasts are made up later. Add them to your count?</T>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Tap
                onPress={async () => {
                  await change('suggest', 'fast', { owed: (counts.data?.get('fast')?.owed ?? 0) + s.n });
                  await AsyncStorage.setItem(`qada:ramadan:${s.year}`, '1').catch(() => {});
                  setDismissed((d) => [...d, s.year]);
                }}
                style={{ height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: SC.mint, justifyContent: 'center' }}>
                <T style={{ color: SC.ink, fontWeight: '600', fontSize: 14 }}>{`Add ${s.n} fasts`}</T>
              </Tap>
              <Tap
                onPress={async () => {
                  await AsyncStorage.setItem(`qada:ramadan:${s.year}`, '0').catch(() => {});
                  setDismissed((d) => [...d, s.year]);
                }}
                style={{ height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' }}>
                <T style={{ fontWeight: '600', fontSize: 14 }}>Not now</T>
              </Tap>
            </View>
          </View>
        ))}

      {counts.loading && !counts.data && <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />}
      {counts.data && (
        <>
          <Kicker style={{ marginTop: 24, marginHorizontal: 24, marginBottom: 8 }}>TO MAKE UP</Kicker>
          <View style={[glass, { marginHorizontal: 16, paddingHorizontal: 16 }]}>
            {list.map((c, i) => (
              <View key={c.item} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 72, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 16, fontWeight: '600' }}>{LABEL[c.item]}</T>
                  <T style={{ fontSize: 12, opacity: 0.55 }}>{`${left(c)} left · ${c.madeUp} of ${c.owed} made up`}</T>
                </View>
                <Stepper
                  value={c.owed}
                  busy={busy === `owed:${c.item}`}
                  onChange={(v) => change(`owed:${c.item}`, c.item, { owed: v, madeUp: Math.min(c.madeUp, v) })}
                />
                <Tap
                  disabled={!left(c) || busy === `done:${c.item}`}
                  onPress={() => change(`done:${c.item}`, c.item, { madeUp: c.madeUp + 1 })}
                  accessibilityLabel={`Made up one ${LABEL[c.item]}`}
                  style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: left(c) ? SC.mint : 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {busy === `done:${c.item}` ? <ActivityIndicator size="small" color={SC.ink} /> : <Icon n="check" s={14} c={left(c) ? SC.ink : 'rgba(255,255,255,0.4)'} w={2.4} />}
                  <T style={{ fontSize: 13, fontWeight: '600', color: left(c) ? SC.ink : 'rgba(255,255,255,0.4)' }}>+1</T>
                </Tap>
              </View>
            ))}
          </View>
          <T style={{ marginHorizontal: 32, marginTop: 14, fontSize: 12, opacity: 0.45, textAlign: 'center', lineHeight: 18 }}>
            Use − and + to set how many you owe (hold + to add 10). Tap ✓ +1 each time you make one up.
          </T>
        </>
      )}
    </Screen>
  );
}

function Stepper({ value, busy, onChange }: { value: number; busy: boolean; onChange: (v: number) => void }) {
  const btn = { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Tap disabled={busy || value <= 0} onPress={() => onChange(value - 1)} accessibilityLabel="Owe one less" style={[btn, { opacity: value > 0 ? 1 : 0.4 }]}>
        <Icon n="minus" s={14} />
      </Tap>
      <View style={{ minWidth: 30, alignItems: 'center' }}>{busy ? <ActivityIndicator size="small" color="#fff" /> : <T style={{ fontSize: 16, fontWeight: '700' }}>{value}</T>}</View>
      <Tap disabled={busy} onPress={() => onChange(value + 1)} onLongPress={() => onChange(value + 10)} accessibilityLabel="Owe one more" style={btn}>
        <Icon n="plus" s={14} />
      </Tap>
    </View>
  );
}
