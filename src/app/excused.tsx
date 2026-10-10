import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Btn, Chip, glass, hairline, Kicker, Label, Ring, Segmented, Tap } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { addDays, cycleInfo, daysBetween, niceDate } from '@/lib/cycle';
import { deleteExcused, endExcused, excusedDates, isoDate, startExcused, useExcused, useNow } from '@/lib/data';
import type { Enums } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const KIND_LABEL: Record<Enums<'excuse_kind'>, string> = { hayd: 'Ḥayḍ', nifas: 'Nifās' };
const LILAC = '#C7AFF5';
const days = daysBetween;
const nice = niceDate;

export default function ExcusedScreen() {
  const { session, profile, refreshProfile } = useSession();
  const me = session?.user.id;
  const now = useNow(60_000);
  const today = isoDate(now, profile?.timezone);
  const periods = useExcused(me, true);
  const open = periods.data?.find((p) => !p.endedOn);
  const [kind, setKind] = useState<Enums<'excuse_kind'>>('hayd');
  const [startOffset, setStartOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const past = (periods.data ?? []).filter((p) => p.endedOn);
  const c = cycleInfo(periods.data, today);
  const stats = c.avgLength && c.avgCycle ? { length: c.avgLength, cycle: c.avgCycle, next: c.nextStart } : null;
  const excusedSet = excusedDates(periods.data, today);
  // Last six weeks, oldest first, for the strip.
  const strip = Array.from({ length: 42 }, (_, i) => addDays(today, i - 41));

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle k="PRIVATE TO YOU" t="Excused days" style={{ marginTop: 16 }} />
      <T style={{ marginHorizontal: 24, marginTop: 8, fontSize: 14, opacity: 0.6, lineHeight: 20 }}>
        While excused, your streak is kept, prayer reminders pause and your circle just sees “Paused”. Nobody sees why.
      </T>
      {error && <T style={{ color: SC.coral, fontSize: 14, marginTop: 10, marginHorizontal: 24 }}>{error}</T>}

      {periods.data && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 18, padding: 18 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Ring
              pct={open ? Math.min(1, (c.day ?? 0) / (c.avgLength ?? 7)) : c.day && c.avgCycle ? Math.min(1, c.day / c.avgCycle) : 0}
              size={92}
              stroke={8}
              label={c.day != null ? String(c.day) : '–'}
              labelSize={28}
            />
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1, opacity: 0.55 }}>{open ? 'EXCUSED' : 'CYCLE DAY'}</T>
              <T style={{ fontSize: 20, fontWeight: '700', marginTop: 2 }}>
                {open ? `${KIND_LABEL[open.kind]} · day ${c.day}` : c.day != null ? `Day ${c.day}${c.avgCycle ? ` of ~${c.avgCycle}` : ''}` : 'Nothing logged yet'}
              </T>
              <T style={{ fontSize: 13, opacity: 0.6, marginTop: 4, lineHeight: 18 }}>
                {open
                  ? `Started ${nice(open.startedOn)}${c.avgLength ? ` · usually ${c.avgLength} days` : ''}`
                  : c.nextStart && c.daysUntilNext != null
                    ? c.daysUntilNext >= 0
                      ? `Next expected around ${nice(c.nextStart)}`
                      : `Expected ${nice(c.nextStart)} · ${-c.daysUntilNext} days ago`
                    : 'Log a couple of periods to see estimates.'}
              </T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 16 }} accessible accessibilityLabel={`Last six weeks: ${[...excusedSet].filter((d) => d >= strip[0]).length} excused days`}>
            {strip.map((d) => (
              <View
                key={d}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: excusedSet.has(d) ? LILAC : 'rgba(255,255,255,0.08)',
                  borderWidth: d === today ? 1.5 : 0,
                  borderColor: '#fff',
                }}
              />
            ))}
          </View>
          <T style={{ fontSize: 11, opacity: 0.45, marginTop: 8 }}>Last 6 weeks · lilac = excused</T>
        </View>
      )}

      {periods.loading && !periods.data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />
      ) : open ? (
        <View style={[glass, { marginHorizontal: 16, marginTop: 20, padding: 18 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon n="moon" s={22} c={LILAC} />
            <T style={{ fontSize: 18, fontWeight: '700' }}>{`${KIND_LABEL[open.kind]} · day ${days(open.startedOn, today)}`}</T>
          </View>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>Since {nice(open.startedOn)}</T>
          <Label style={{ marginTop: 18 }}>When did it end?</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 1].map((n) => {
              const d = addDays(today, -n);
              const allowed = d >= open.startedOn;
              return (
                <Btn
                  key={n}
                  kind={n ? 'ghost' : 'mint'}
                  disabled={!!busy || !allowed}
                  style={{ flex: 1, height: 48, opacity: allowed ? 1 : 0.4 }}
                  textStyle={{ fontSize: 15 }}
                  icon={busy === `end${n}` ? <ActivityIndicator color={n ? '#fff' : SC.ink} /> : undefined}
                  onPress={() => run(`end${n}`, () => endExcused(open.id, d))}>
                  {n ? 'Yesterday' : 'Today'}
                </Btn>
              );
            })}
          </View>
          <T style={{ fontSize: 12, opacity: 0.5, marginTop: 12, lineHeight: 17 }}>Remember ghusl before your next prayer.</T>
        </View>
      ) : (
        <View style={[glass, { marginHorizontal: 16, marginTop: 20, padding: 18 }]}>
          <Label>Type</Label>
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'hayd', label: 'Ḥayḍ (period)' },
              { value: 'nifas', label: 'Nifās (after birth)' },
            ]}
          />
          <Label style={{ marginTop: 16 }}>Started</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['Today', 'Yesterday', '2 days ago'].map((t, i) => (
              <Chip
                key={t}
                bg={i === startOffset ? SC.mint : 'rgba(255,255,255,0.07)'}
                c={i === startOffset ? SC.ink : '#fff'}
                style={{ height: 38, flex: 1, justifyContent: 'center', paddingHorizontal: 0 }}
                textStyle={{ fontSize: 14 }}
                onPress={() => setStartOffset(i)}>
                {t}
              </Chip>
            ))}
          </View>
          <Btn
            kind="mint"
            disabled={!!busy}
            style={{ marginTop: 18, height: 50 }}
            icon={busy === 'start' ? <ActivityIndicator color={SC.ink} /> : undefined}
            onPress={() => run('start', () => startExcused(kind, addDays(today, -startOffset)))}>
            Start excused days
          </Btn>
        </View>
      )}

      {stats && (
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 10 }}>
          {[
            [`${stats.length}`, 'avg days'],
            [`${stats.cycle}`, 'avg cycle'],
            [stats.next ? (nice(stats.next).split(', ')[1] ?? nice(stats.next)) : '—', 'next (est.)'],
          ].map(([a, b]) => (
            <View key={b} style={[glass, { flex: 1, paddingVertical: 14, paddingHorizontal: 14 }]}>
              <T style={{ fontSize: 22, fontWeight: '700' }} numberOfLines={1}>
                {a}
              </T>
              <T style={{ fontSize: 12, opacity: 0.6 }}>{b}</T>
            </View>
          ))}
        </View>
      )}

      {past.length > 0 && (
        <>
          <Kicker style={{ marginTop: 24, marginHorizontal: 24, marginBottom: 8 }}>HISTORY</Kicker>
          <View style={[glass, { marginHorizontal: 16, paddingHorizontal: 16 }]}>
            {past.map((p, i) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 15, fontWeight: '600' }}>{`${nice(p.startedOn)} – ${nice(p.endedOn!)}`}</T>
                  <T style={{ fontSize: 12, opacity: 0.55 }}>{`${KIND_LABEL[p.kind]} · ${days(p.startedOn, p.endedOn!)} days`}</T>
                </View>
                <Tap
                  accessibilityLabel="Delete entry"
                  onPress={() =>
                    Alert.alert('Delete this entry?', 'It will be removed from your history.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => run(`del:${p.id}`, () => deleteExcused(p.id)) },
                    ])
                  }
                  style={{ padding: 8 }}>
                  {busy === `del:${p.id}` ? <ActivityIndicator size="small" color="#fff" /> : <Icon n="minus" s={18} c="rgba(255,255,255,0.5)" />}
                </Tap>
              </View>
            ))}
          </View>
        </>
      )}

      <T style={{ marginHorizontal: 32, marginTop: 18, fontSize: 12, opacity: 0.45, textAlign: 'center', lineHeight: 18 }}>
        Estimates are only a guide. Rulings on what counts differ between schools, so ask a scholar you trust about your situation.
      </T>
    </Screen>
  );
}
