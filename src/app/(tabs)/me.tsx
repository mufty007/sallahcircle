import * as Clipboard from 'expo-clipboard';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Av, glass, hairline, RoundBtn, Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { MEMBERS } from '@/data/mock';
import { excusedDates, isoDate, loadLogs, streakFrom, useExcused, useNow, useQuery } from '@/lib/data';
import { METHODS } from '@/lib/prayer-times';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { mintA, SC } from '@/theme/colors';

const DAY = 86_400_000;
const WEEKS = 12;
/** Heat colour by prayers logged that day (0–5). */
const EXCUSED = 'rgba(199,175,245,0.35)';
const heatColor = (n: number) => (n >= 5 ? SC.mint : n >= 3 ? mintA(0.6) : n >= 1 ? SC.amber : 'rgba(255,255,255,0.1)');

export default function MeScreen() {
  const [copied, setCopied] = useState(false);
  const { profile, session } = useSession();
  const FRIEND_CODE = profile?.friend_code ?? '';
  const me = { init: (profile?.display_name?.[0] ?? '?').toUpperCase(), color: profile?.avatar_color ?? MEMBERS[0].color, seed: profile?.avatar_seed ?? profile?.id };
  const method = METHODS.find((m) => m.id === profile?.calc_method)?.name ?? 'ISNA';
  const userId = session?.user.id;
  const now = useNow(60_000);
  const today = isoDate(now, profile?.timezone);
  // Grid ends on this week's Saturday so columns are Sun→Sat weeks.
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY);
  const since = start.toISOString().slice(0, 10);

  const logs = useQuery(userId ? `me-logs:${userId}:${since}` : null, () => loadLogs([userId!], since));
  const jamaah = useQuery(userId ? `me-jamaah:${userId}` : null, async () => {
    const { count, error } = await supabase.from('prayer_log_details').select('log_id', { count: 'exact', head: true }).eq('in_jamaah', true);
    if (error) throw error;
    return count ?? 0;
  });

  const excused = useExcused(userId, !!profile?.track_excused);
  const skip = excusedDates(excused.data, today);
  const all = (logs.data ?? []).filter((l) => l.status !== 'missed');
  const perDay = new Map<string, number>();
  for (const l of all) perDay.set(l.prayed_on, (perDay.get(l.prayed_on) ?? 0) + 1);
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY).toISOString().slice(0, 10);
      return { date, n: perDay.get(date) ?? 0, future: date > today, excused: skip.has(date) };
    }),
  );
  const streak = userId ? streakFrom(logs.data ?? [], userId, today, skip) : 0;
  // Best run of complete days inside the window.
  let best = 0;
  let run = 0;
  for (const day of weeks.flat()) {
    if (day.future) break;
    if (day.excused && day.n < 5) continue; // excused days don't break a run
    run = day.n >= 5 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  best = Math.max(best, streak);
  const onTimePct = logs.data?.length ? Math.round((logs.data.filter((l) => l.status === 'on_time').length / logs.data.length) * 100) : null;
  const fajrCount = all.filter((l) => l.prayer === 'fajr').length;
  const badges: [string, string, boolean][] = [
    ['7', 'Days', best >= 7],
    ['30', 'Days', best >= 30],
    ['40', 'Fajr', fajrCount >= 40],
    ['1', 'Jamāʿah', (jamaah.data ?? 0) >= 1],
  ];

  const tools: [IconName, string, string, Href][] = [
    ['beads', 'Tasbīḥ', 'Dhikr counter', '/tasbih'],
    ['list', 'Qaḍāʾ', 'Prayers and fasts to make up', '/qada'],
    ['plate', 'Fasting', 'Suḥūr, ifṭār and your fasts', '/fasting'],
    ...(profile?.track_excused ? [['moon', 'Excused days', 'Private to you', '/excused'] as [IconName, string, string, Href]] : []),
  ];

  return (
    <Screen bg="inner" withTabBar>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 16 }}>
        <RoundBtn n="gear" onPress={() => router.push('/settings')} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, marginTop: -16 }}>
        <Av m={me} s={64} />
        <View>
          <T style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.5 }}>{profile?.display_name ?? 'You'}</T>
          <T style={{ fontSize: 14, opacity: 0.6 }}>@{profile?.username}</T>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 24, marginTop: 22 }}>
        <T style={{ fontSize: 110, fontWeight: '700', letterSpacing: -6, lineHeight: 100 }}>{streak}</T>
        <View style={{ paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Icon n="flame" s={18} c={SC.amber} />
            <T style={{ fontSize: 18, fontWeight: '600' }}>day streak</T>
          </View>
          <T style={{ fontSize: 13, opacity: 0.6 }}>
            {best > streak ? `Best: ${best} days · ${best - streak} to go` : streak ? 'Your best yet' : 'Pray all five today to start one'}
          </T>
        </View>
      </View>

      <Tap onPress={() => router.push('/calendar')} style={[glass, { marginHorizontal: 16, marginTop: 14, padding: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <T style={{ fontSize: 14, fontWeight: '600' }}>Last 12 weeks</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T style={{ fontSize: 14, opacity: 0.55 }}>{onTimePct === null ? 'No logs yet' : `${onTimePct}% on time`}</T>
            <Icon n="chev" s={14} c="rgba(255,255,255,0.4)" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, height: 150 }}>
          {weeks.map((days, w) => (
            <View key={w} style={{ flex: 1, gap: 4 }}>
              {days.map((day) => (
                <View key={day.date} style={{ flex: 1, borderRadius: 4, backgroundColor: day.future ? 'transparent' : day.excused && day.n < 5 ? EXCUSED : heatColor(day.n) }} />
              ))}
            </View>
          ))}
        </View>
      </Tap>

      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 10 }}>
        {badges.map(([a, b, on]) => (
          <View key={b + a} style={[glass, { flex: 1, borderRadius: 22, height: 90, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.1)' : 'transparent', opacity: on ? 1 : 0.45 }]}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: on ? SC.amber : 'transparent',
                borderWidth: on ? 0 : 1.5,
                borderStyle: 'dashed',
                borderColor: 'rgba(255,255,255,0.4)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <T style={{ color: on ? SC.ink : '#fff', fontWeight: '700', fontSize: 16 }}>{a}</T>
            </View>
            <T style={{ fontSize: 12, marginTop: 6 }}>{b}</T>
          </View>
        ))}
      </View>

      <View style={[glass, { marginHorizontal: 16, marginTop: 10, paddingVertical: 2, paddingHorizontal: 16 }]}>
        {tools.map(([icon, label, sub, href], i) => (
          <Tap key={label} onPress={() => router.push(href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon n={icon} s={18} c={SC.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 15, fontWeight: '600' }}>{label}</T>
              <T style={{ fontSize: 12, opacity: 0.55 }}>{sub}</T>
            </View>
            <Icon n="chev" s={16} c="rgba(255,255,255,0.4)" />
          </Tap>
        ))}
      </View>

      <View style={[glass, { marginHorizontal: 16, marginTop: 10, paddingVertical: 2, paddingHorizontal: 16 }]}>
        <Tap
          onPress={async () => {
            await Clipboard.setStringAsync(FRIEND_CODE);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', height: 44 }}>
          <T style={{ flex: 1, opacity: 0.65, fontSize: 14 }}>Friend code</T>
          <T style={{ fontWeight: '600', color: SC.mint, letterSpacing: 1, fontSize: 14 }}>{copied ? 'Copied' : FRIEND_CODE}</T>
          <Icon n={copied ? 'check' : 'copy'} s={16} c={SC.mint} style={{ marginLeft: 8 }} />
        </Tap>
        {[
          ['Location', [profile?.city, profile?.region].filter(Boolean).join(', ') || 'Not set'],
          ['Calculation', `${method} · ${profile?.asr_method === 'hanafi' ? 'Ḥanafī' : 'Standard'} Asr`],
        ].map(([a, b]) => (
          <Tap key={a} onPress={() => router.push('/settings')} style={{ flexDirection: 'row', alignItems: 'center', height: 44, borderTopWidth: 1, borderTopColor: hairline() }}>
            <T style={{ flex: 1, opacity: 0.65, fontSize: 14 }}>{a}</T>
            <T style={{ fontWeight: '600', fontSize: 14 }}>{b}</T>
            <Icon n="chev" s={16} c="rgba(255,255,255,0.4)" style={{ marginLeft: 6 }} />
          </Tap>
        ))}
      </View>
    </Screen>
  );
}
