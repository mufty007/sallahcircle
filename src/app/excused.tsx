import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { DayPicker } from '@/components/day-picker';
import { Icon } from '@/components/ui/icon';
import { Btn, glass, hairline, Kicker, Label, Ring, RoundBtn, Segmented, Tap } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { addDays, cycleInfo, daysBetween, isPastLimit, niceDate, rangesOverlap, suggestDays } from '@/lib/cycle';
import { continueExcused, deleteExcused, endExcused, excusedDates, isoDate, logExcused, setExpectedDays, startExcused, useExcused, useNow, type ExcusedPeriod } from '@/lib/data';
import { syncReminders } from '@/lib/reminders';
import type { Enums } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const KIND_LABEL: Record<Enums<'excuse_kind'>, string> = { hayd: 'Ḥayḍ', nifas: 'Nifās' };
const LILAC = '#C7AFF5';
const days = daysBetween;
const nice = niceDate;

function DayCount({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const set = (n: number) => onChange(Math.min(60, Math.max(1, n)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <RoundBtn n="minus" s={40} bg="rgba(255,255,255,0.08)" onPress={() => set(value - 1)} accessibilityLabel="One day less" />
      <T style={{ minWidth: 40, textAlign: 'center', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{String(value)}</T>
      <RoundBtn n="plus" s={40} bg="rgba(255,255,255,0.08)" onPress={() => set(value + 1)} accessibilityLabel="One day more" />
      <T style={{ fontSize: 15, opacity: 0.6 }}>days</T>
    </View>
  );
}

export default function ExcusedScreen() {
  const { session, profile, refreshProfile } = useSession();
  const me = session?.user.id;
  const now = useNow(60_000);
  const today = isoDate(now, profile?.timezone);
  const periods = useExcused(me, true);
  const open = periods.data?.find((p) => !p.endedOn);
  const [kind, setKind] = useState<Enums<'excuse_kind'>>('hayd');
  const [startOn, setStartOn] = useState(today);
  const [expected, setExpected] = useState<number | null>(null);
  const [finishOn, setFinishOn] = useState(today);
  const [draftLimit, setDraftLimit] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [logKind, setLogKind] = useState<Enums<'excuse_kind'>>('hayd');
  const [logStart, setLogStart] = useState(addDays(today, -6));
  const [logEnd, setLogEnd] = useState(today);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      const saved = await refreshProfile();
      if (me && saved) syncReminders(me, saved, true).catch((e) => console.warn('Reminder sync failed', e));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const list = periods.data ?? [];
  const past = list.filter((p) => p.endedOn);
  const c = cycleInfo(list, today);
  const stats = c.avgLength && c.avgCycle ? { length: c.avgLength, cycle: c.avgCycle, next: c.nextStart } : null;
  const excusedSet = excusedDates(list, today);
  const strip = Array.from({ length: 42 }, (_, i) => addDays(today, i - 41));
  const remindAfter = expected ?? suggestDays(kind, c.avgLength);
  const started = startOn > today ? today : startOn;
  const limit = open ? (draftLimit ?? open.expectedDays ?? suggestDays(open.kind, c.avgLength)) : remindAfter;
  const over = open ? isPastLimit(open, today) : false;
  const finish = open ? (finishOn < open.startedOn ? open.startedOn : finishOn > today ? today : finishOn) : today;

  const saveLimit = (n: number) => {
    if (!open) return;
    const prev = open.expectedDays;
    setDraftLimit(n);
    void run('limit', () => setExpectedDays(open.id, n)).then((ok) => {
      if (!ok) setDraftLimit(prev);
    });
  };

  const begin = () => {
    if (rangesOverlap(list, started, null)) {
      setError('Those dates overlap another entry.');
      return;
    }
    void run('start', () => startExcused(kind, started, remindAfter));
  };

  const saveLog = () => {
    const end = logEnd < logStart ? logStart : logEnd > today ? today : logEnd;
    const start = logStart > end ? end : logStart;
    if (rangesOverlap(list, start, end)) {
      setError('Those dates overlap another entry.');
      return;
    }
    void run('log', () => logExcused(logKind, start, end));
  };

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
              pct={open ? Math.min(1, (c.day ?? 0) / (open.expectedDays ?? c.avgLength ?? 7)) : c.day && c.avgCycle ? Math.min(1, c.day / c.avgCycle) : 0}
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
                  ? `Started ${nice(open.startedOn)}${open.expectedDays ? ` · remind after ${open.expectedDays} days` : ''}`
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
        <View style={[glass, { marginHorizontal: 16, marginTop: 20, padding: 18 }, over && { borderColor: 'rgba(255,138,122,0.7)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon n="moon" s={22} c={over ? SC.coral : LILAC} />
            <T style={{ fontSize: 18, fontWeight: '700' }}>{`${KIND_LABEL[open.kind]} · day ${days(open.startedOn, today)}`}</T>
          </View>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>Since {nice(open.startedOn)}</T>

          {over ? (
            <View style={{ marginTop: 14 }}>
              <T style={{ fontSize: 15, fontWeight: '600', lineHeight: 21 }}>This is longer than the {open.expectedDays} days you set.</T>
              <T style={{ fontSize: 13, opacity: 0.65, marginTop: 4, lineHeight: 18 }}>
                You can end them, or continue and stay excused. If they ended on an earlier day, pick that date so the extra days aren’t marked excused.
              </T>
              <Btn
                kind="mint"
                disabled={!!busy}
                style={{ marginTop: 14, height: 48 }}
                textStyle={{ fontSize: 15 }}
                icon={busy === 'continue' ? <ActivityIndicator color={SC.ink} /> : undefined}
                onPress={() => run('continue', () => continueExcused(open.id))}>
                Continue
              </Btn>
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Label>Remind me after</Label>
              <DayCount value={limit} onChange={saveLimit} />
              <T style={{ fontSize: 12, opacity: 0.5, marginTop: 8, lineHeight: 17 }}>
                {open.continued
                  ? `Continuing past ${open.expectedDays ?? limit} days. We’ll stay quiet about the length.`
                  : 'You’ll be notified the morning this passes. Schools differ on the maximum, so this is only your reminder.'}
              </T>
            </View>
          )}

          <Label style={{ marginTop: 18 }}>When did it end?</Label>
          <DayPicker value={finish} onChange={setFinishOn} min={open.startedOn} max={today} />
          <Btn
            kind={over ? 'ghost' : 'mint'}
            disabled={!!busy}
            style={{ marginTop: 12, height: 50 }}
            textStyle={{ fontSize: 15 }}
            icon={busy === 'end' ? <ActivityIndicator color={over ? '#fff' : SC.ink} /> : undefined}
            onPress={() => run('end', () => endExcused(open.id, finish))}>
            End excused days
          </Btn>
          {!over && <T style={{ fontSize: 12, opacity: 0.5, marginTop: 12, lineHeight: 17 }}>Remember ghusl before your next prayer.</T>}
        </View>
      ) : (
        <View style={[glass, { marginHorizontal: 16, marginTop: 20, padding: 18 }]}>
          <Label>Type</Label>
          <Segmented
            value={kind}
            onChange={(k) => {
              setKind(k);
              setExpected(null);
            }}
            options={[
              { value: 'hayd', label: 'Ḥayḍ (period)' },
              { value: 'nifas', label: 'Nifās (after birth)' },
            ]}
          />
          <Label style={{ marginTop: 16 }}>Started</Label>
          <DayPicker value={started} onChange={setStartOn} max={today} />
          <Label style={{ marginTop: 16 }}>Remind me after</Label>
          <DayCount value={remindAfter} onChange={setExpected} />
          <T style={{ fontSize: 12, opacity: 0.5, marginTop: 8, lineHeight: 17 }}>
            Often 10 or 15 days for ḥayḍ, and 40 for nifās. You’ll be asked when this passes, and you can continue if you need to.
          </T>
          <Btn
            kind="mint"
            disabled={!!busy}
            style={{ marginTop: 18, height: 50 }}
            icon={busy === 'start' ? <ActivityIndicator color={SC.ink} /> : undefined}
            onPress={begin}>
            Start excused days
          </Btn>
        </View>
      )}

      <Tap onPress={() => setLogging((v) => !v)} style={{ marginTop: 16, marginHorizontal: 24, alignSelf: 'flex-start' }}>
        <T style={{ fontSize: 14, fontWeight: '600', color: SC.mint }}>{logging ? 'Hide past entry' : 'Log a past period'}</T>
      </Tap>
      {logging && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 10, padding: 18 }]}>
          <Label>Type</Label>
          <Segmented
            value={logKind}
            onChange={setLogKind}
            height={44}
            options={[
              { value: 'hayd', label: 'Ḥayḍ' },
              { value: 'nifas', label: 'Nifās' },
            ]}
          />
          <Label style={{ marginTop: 16 }}>Started</Label>
          <DayPicker value={logStart > today ? today : logStart} onChange={setLogStart} max={today} />
          <Label style={{ marginTop: 16 }}>Ended</Label>
          <DayPicker value={logEnd < logStart ? logStart : logEnd > today ? today : logEnd} onChange={setLogEnd} min={logStart > today ? today : logStart} max={today} />
          <Btn
            kind="mint"
            disabled={!!busy}
            style={{ marginTop: 16, height: 50 }}
            icon={busy === 'log' ? <ActivityIndicator color={SC.ink} /> : undefined}
            onPress={saveLog}>
            Save to history
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
              <HistoryRow key={p.id} p={p} first={i === 0} busy={busy === `del:${p.id}`} onDelete={() => run(`del:${p.id}`, () => deleteExcused(p.id))} />
            ))}
          </View>
        </>
      )}

      <T style={{ marginHorizontal: 32, marginTop: 18, fontSize: 12, opacity: 0.45, textAlign: 'center', lineHeight: 18 }}>
        Estimates and reminders are only a guide. Rulings on what counts differ between schools, so ask a scholar you trust about your situation.
      </T>
    </Screen>
  );
}

function HistoryRow({ p, first, busy, onDelete }: { p: ExcusedPeriod; first: boolean; busy: boolean; onDelete: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderTopWidth: first ? 0 : 1, borderTopColor: hairline() }}>
      <View style={{ flex: 1 }}>
        <T style={{ fontSize: 15, fontWeight: '600' }}>{`${nice(p.startedOn)} – ${nice(p.endedOn!)}`}</T>
        <T style={{ fontSize: 12, opacity: 0.55 }}>{`${KIND_LABEL[p.kind]} · ${days(p.startedOn, p.endedOn!)} days`}</T>
      </View>
      <Tap
        accessibilityLabel="Delete entry"
        onPress={() =>
          Alert.alert('Delete this entry?', 'It will be removed from your history.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ])
        }
        style={{ padding: 8 }}>
        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Icon n="minus" s={18} c="rgba(255,255,255,0.5)" />}
      </Tap>
    </View>
  );
}
