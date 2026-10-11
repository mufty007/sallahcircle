import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Ring, Tap } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { endExcused, startExcused, useExcused } from '@/lib/data';
import { cycleInfo, isPastLimit, niceDate, suggestDays } from '@/lib/cycle';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const LILAC = '#C7AFF5';

/**
 * Today-screen card for people who track excused days (opt-in, private).
 * One tap to start or end, and a glance at where they are in their cycle.
 */
export function ExcusedCard({ today, dark, card }: { today: string; dark: boolean; card: ViewStyle }) {
  const { session, profile, refreshProfile } = useSession();
  const periods = useExcused(session?.user.id, !!profile?.track_excused);
  const [busy, setBusy] = useState(false);
  if (!profile?.track_excused) return null;

  const c = cycleInfo(periods.data, today);
  const open = c.open;
  const over = open ? isPastLimit(open, today) : false;
  const ink = dark ? '#fff' : SC.ink;

  const act = async () => {
    if (over) {
      router.push('/excused');
      return;
    }
    setBusy(true);
    try {
      if (open) await endExcused(open.id, today);
      else await startExcused('hayd', today, suggestDays('hayd', c.avgLength));
      await refreshProfile();
    } finally {
      setBusy(false);
    }
  };

  const title = over ? `Past ${open?.expectedDays} days` : open ? `Excused · day ${c.day}` : c.day != null && c.avgCycle ? `Cycle day ${c.day}` : 'Excused days';
  const sub = over
    ? 'This is longer than you set. End excused days, or continue.'
    : open
      ? 'Your streak is safe and reminders are paused.'
      : c.daysUntilNext != null && c.nextStart
        ? c.daysUntilNext > 1
          ? `Next expected around ${niceDate(c.nextStart)} · in ${c.daysUntilNext} days`
          : c.daysUntilNext >= 0
            ? 'Your next period may start soon.'
            : `Expected ${-c.daysUntilNext} day${c.daysUntilNext === -1 ? '' : 's'} ago`
        : 'Private to you. Tap “Started” on the first day.';
  const pct = open ? Math.min(1, (c.day ?? 0) / (open.expectedDays ?? c.avgLength ?? 7)) : c.day && c.avgCycle ? Math.min(1, c.day / c.avgCycle) : 0;

  return (
    <Tap
      onPress={() => router.push('/excused')}
      accessibilityLabel={`${title}. ${sub} Opens excused days.`}
      style={{ marginHorizontal: 16, marginTop: 10, borderRadius: 28, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, ...card, ...(over ? { borderColor: SC.coral } : null) }}>
      <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
        {c.day != null ? <Ring pct={pct} size={52} stroke={5} label={String(open ? c.day : c.day)} labelSize={16} /> : <Icon n="moon" s={24} c={LILAC} />}
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontSize: 16, fontWeight: '600' }}>{title}</T>
        <T style={{ fontSize: 13, opacity: 0.65, marginTop: 2 }} numberOfLines={2}>
          {sub}
        </T>
      </View>
      <Tap
        onPress={act}
        disabled={busy}
        accessibilityLabel={over ? 'Review excused days' : open ? 'My excused days ended today' : 'My excused days started today'}
        style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: over ? SC.coral : open ? SC.mint : LILAC, alignItems: 'center', justifyContent: 'center' }}>
        {busy ? <ActivityIndicator size="small" color={SC.ink} /> : <T style={{ fontSize: 13, fontWeight: '700', color: over ? '#fff' : SC.ink }}>{over ? 'Review' : open ? 'Ended' : 'Started'}</T>}
      </Tap>
      <Icon n="chev" s={16} c={ink} style={{ opacity: 0.5 }} />
    </Tap>
  );
}
