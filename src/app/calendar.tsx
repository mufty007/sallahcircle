import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { glass, hairline, RoundBtn } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { isoDate, loadLogs, useNow, useQuery } from '@/lib/data';
import { fetchHijriMonthAdjusted, fetchMonth, formatTime } from '@/lib/prayer-times';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = (n: number) => String(n).padStart(2, '0');

export default function CalendarScreen() {
  const { session, profile } = useSession();
  const me = session?.user.id;
  const now = useNow(60_000);
  const tz = profile?.timezone;
  const today = isoDate(now, tz);
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const shift = (d: number) => setYm(({ y, m }) => (m + d < 1 ? { y: y - 1, m: 12 } : m + d > 12 ? { y: y + 1, m: 1 } : { y, m: m + d }));

  const monthKey = `${ym.y}-${pad(ym.m)}`;
  const offset = profile?.hijri_offset ?? 0;
  const hijri = useQuery(`hijri:${monthKey}:${offset}`, () => fetchHijriMonthAdjusted(ym.y, ym.m, offset));
  const place = profile?.latitude != null && profile.longitude != null ? { latitude: profile.latitude, longitude: profile.longitude, timezone: tz } : null;
  const times = useQuery(place ? `month:${monthKey}:${place.latitude},${place.longitude},${profile?.calc_method},${profile?.asr_method}` : null, () =>
    fetchMonth(place!, profile?.calc_method ?? 2, profile?.asr_method ?? 'standard', ym.y, ym.m),
  );
  const logs = useQuery(me ? `cal-logs:${me}:${monthKey}` : null, () => loadLogs([me!], `${monthKey}-01`));

  const days = hijri.data ?? [];
  const lead = days.length ? new Date(Date.UTC(ym.y, ym.m - 1, 1)).getUTCDay() : 0;
  const cells: (number | null)[] = [...Array(lead).fill(null), ...days.map((_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  const countFor = (d: number) => (logs.data ?? []).filter((l) => l.prayed_on === `${monthKey}-${pad(d)}` && l.status !== 'missed').length;

  // Header: the Hijri month(s) this Gregorian month spans.
  const hijriMonths = [...new Map(days.map((d) => [d.hijri.month.number, `${d.hijri.month.en} ${d.hijri.year}`])).values()];

  // Month stats (only days up to today).
  const elapsed = days.filter((_, i) => `${monthKey}-${pad(i + 1)}` <= today).length;
  const prayed = days.reduce((n, _, i) => n + countFor(i + 1), 0);
  const perfect = days.filter((_, i) => countFor(i + 1) >= 5).length;

  // Events: holidays, white days (13–15), and Fridays in this month.
  const events: { title: string; sub: string; day: number }[] = [];
  days.forEach((d, i) => {
    const day = i + 1;
    const g = `${monthKey}-${pad(day)}`;
    const label = new Date(Date.UTC(ym.y, ym.m - 1, day)).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    for (const h of d.hijri.holidays ?? []) events.push({ title: h, sub: `${label} · ${d.hijri.day} ${d.hijri.month.en}`, day });
    if (d.hijri.day === '13') events.push({ title: 'Ayyām al-Bīḍ fasts', sub: `${label} – 15 ${d.hijri.month.en}`, day });
    const isFriday = new Date(Date.UTC(ym.y, ym.m - 1, day)).getUTCDay() === 5;
    if (isFriday && g >= today && !events.some((e) => e.title === 'Jumuʿah')) {
      const dhuhr = times.data?.[i]?.times.dhuhr;
      events.push({ title: 'Jumuʿah', sub: `${label}${dhuhr ? ` · Dhuhr ${formatTime(dhuhr, tz, true)}` : ''}`, day });
    }
  });
  events.sort((a, b) => a.day - b.day);

  const title = new Date(Date.UTC(ym.y, ym.m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle
        k={hijriMonths.join(' – ').toUpperCase() || ' '}
        t={title}
        style={{ marginTop: 16 }}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <RoundBtn n="back" bg="rgba(255,255,255,0.08)" onPress={() => shift(-1)} />
            <RoundBtn n="chev" bg="rgba(255,255,255,0.08)" onPress={() => shift(1)} />
          </View>
        }
      />

      <View style={[glass, { marginHorizontal: 16, marginTop: 20, paddingTop: 14, paddingHorizontal: 10, paddingBottom: 10, minHeight: 200 }]}>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {WEEKDAYS.map((d, i) => (
            <T key={i} style={{ flex: 1, fontSize: 12, textAlign: 'center', fontWeight: '600', color: i === 5 ? SC.mint : '#fff', opacity: i === 5 ? 1 : 0.5 }}>
              {d}
            </T>
          ))}
        </View>
        {hijri.loading && <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />}
        {hijri.error && <T style={{ textAlign: 'center', opacity: 0.6, marginTop: 30 }}>Couldn’t load the calendar.</T>}
        {weeks.map((week, w) => (
          <View key={w} style={{ flexDirection: 'row', marginBottom: 4 }}>
            {week.map((d, i) => {
              if (!d) return <View key={i} style={{ flex: 1 }} />;
              const g = `${monthKey}-${pad(d)}`;
              const isToday = g === today;
              const past = g < today;
              const c = past || isToday ? countFor(d) : 0;
              const h = days[d - 1]?.hijri;
              const holiday = (h?.holidays?.length ?? 0) > 0;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    backgroundColor: isToday ? SC.mint : holiday ? 'rgba(255,255,255,0.08)' : 'transparent',
                  }}>
                  <T style={{ fontSize: 16, fontWeight: '600', color: isToday ? SC.ink : '#fff', opacity: past || isToday ? 1 : 0.55 }}>{d}</T>
                  <T style={{ fontSize: 10, opacity: 0.55, color: isToday ? SC.ink : '#fff' }}>{h?.day}</T>
                  <View style={{ flexDirection: 'row', gap: 1.5, height: 3 }}>
                    {(past || isToday) &&
                      [0, 1, 2, 3, 4].map((k) => (
                        <View
                          key={k}
                          style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: k < c ? (isToday ? SC.ink : c === 5 ? SC.mint : SC.amber) : isToday ? 'rgba(11,18,32,0.2)' : 'rgba(255,255,255,0.18)' }}
                        />
                      ))}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {elapsed > 0 && (
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10 }}>
          {[
            [String(prayed), `of ${elapsed * 5} prayers`],
            [String(perfect), `perfect day${perfect === 1 ? '' : 's'}`],
          ].map(([a, b]) => (
            <View key={b} style={[glass, { flex: 1, paddingVertical: 14, paddingHorizontal: 16 }]}>
              <T style={{ fontSize: 28, fontWeight: '700' }}>{a}</T>
              <T style={{ fontSize: 13, opacity: 0.6 }}>{b}</T>
            </View>
          ))}
        </View>
      )}

      {events.length > 0 && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 10, paddingVertical: 2, paddingHorizontal: 16 }]}>
          {events.map((e, i) => (
            <View key={`${e.title}-${e.day}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
              <Icon n="moon" s={18} c={SC.mint} />
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14, fontWeight: '600' }}>{e.title}</T>
                <T style={{ fontSize: 11, opacity: 0.55 }}>{e.sub}</T>
              </View>
            </View>
          ))}
        </View>
      )}
      <T style={{ marginTop: 14, textAlign: 'center', fontSize: 11, opacity: 0.4 }}>Hijri dates from AlAdhan · may differ by a day from local moon sighting</T>
    </Screen>
  );
}
