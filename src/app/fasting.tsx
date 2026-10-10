import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Chip, glass, hairline, Kicker } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { countdown, loadFasts, setFast, useQuery, type FastKind } from '@/lib/data';
import { formatTime } from '@/lib/prayer-times';
import { useHijriToday, useMyDay } from '@/lib/today';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const DAY = 86_400_000;
const KIND_LABEL: Record<FastKind, string> = { ramadan: 'Ramaḍān', qada: 'Qaḍāʾ', sunnah: 'Sunnah', nafl: 'Voluntary' };
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const nice = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function FastingScreen() {
  const { session } = useSession();
  const me = session?.user.id;
  const { day, now, todayIso, profile } = useMyDay(1000);
  const tz = profile?.timezone;
  const since = addDays(todayIso, -40);
  const fasts = useQuery(me ? `fasts:${me}:${since}` : null, () => loadFasts(me!, since));
  const [busy, setBusy] = useState<FastKind | 'none' | null>(null);

  const hijri = useHijriToday(todayIso, profile?.hijri_offset ?? 0, day?.hijri);
  const ramadan = hijri?.month.number === 9;
  const todayFast = fasts.data?.find((f) => f.fastedOn === todayIso);

  const choose = async (kind: FastKind | null) => {
    setBusy(kind ?? 'none');
    try {
      await setFast(me!, todayIso, kind);
    } finally {
      setBusy(null);
    }
  };

  // Countdown to whichever comes next: end of suḥūr, then ifṭār.
  let headline = '';
  let sub = '';
  if (day) {
    if (now < day.imsak) {
      headline = `Suḥūr ends in ${countdown(day.imsak.getTime() - now.getTime())}`;
      sub = `Imsāk ${formatTime(day.imsak, tz, true)} · Fajr ${formatTime(day.times.fajr, tz, true)}`;
    } else if (now < day.times.maghrib) {
      headline = `Ifṭār in ${countdown(day.times.maghrib.getTime() - now.getTime())}`;
      sub = `Maghrib ${formatTime(day.times.maghrib, tz, true)}`;
    } else {
      headline = `Ifṭār was at ${formatTime(day.times.maghrib, tz, true)}`;
      sub = 'Taqabbal Allāhu minnā wa minkum';
    }
  }

  // Upcoming sunnah fasts (outside Ramaḍān).
  const upcoming: { title: string; date: string }[] = [];
  if (hijri && !ramadan) {
    const dow = new Date(`${todayIso}T12:00:00Z`).getUTCDay();
    const toMon = (8 - dow) % 7 || 7;
    const toThu = (11 - dow) % 7 || 7;
    upcoming.push({ title: 'Monday fast', date: addDays(todayIso, toMon) }, { title: 'Thursday fast', date: addDays(todayIso, toThu) });
    const hd = Number(hijri.day);
    const toWhite = hd < 13 ? 13 - hd : hijri.month.days - hd + 13;
    if (hd >= 13 && hd <= 15) upcoming.push({ title: `White day (${hd} ${hijri.month.en})`, date: todayIso });
    else upcoming.push({ title: 'White days begin (13–15)', date: addDays(todayIso, toWhite) });
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Ramaḍān grid: Hijri day N ↔ today − (todayHijriDay − N).
  const hDay = Number(hijri?.day ?? 0);
  const ramadanCells = ramadan
    ? Array.from({ length: hijri!.month.days || 30 }, (_, i) => {
        const date = addDays(todayIso, i + 1 - hDay);
        return { n: i + 1, date, fasted: !!fasts.data?.some((f) => f.fastedOn === date), future: date > todayIso };
      })
    : [];
  const recent = (fasts.data ?? []).filter((f) => f.fastedOn >= addDays(todayIso, -30));

  const kinds: FastKind[] = ramadan ? ['ramadan', 'qada'] : ['sunnah', 'qada', 'nafl'];

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle k={hijri ? `${hijri.day} ${hijri.month.en.toUpperCase()} ${hijri.year}` : ' '} t="Fasting" style={{ marginTop: 16 }} />

      <View style={{ marginHorizontal: 16, marginTop: 20, borderRadius: 28, backgroundColor: SC.mint, padding: 20 }}>
        {day ? (
          <>
            <T style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.6, color: SC.ink, fontVariant: ['tabular-nums'] }}>{headline}</T>
            <T style={{ fontSize: 14, color: SC.ink, opacity: 0.7, marginTop: 4 }}>{sub}</T>
          </>
        ) : (
          <ActivityIndicator color={SC.ink} />
        )}
      </View>

      <Kicker style={{ marginTop: 24, marginHorizontal: 24, marginBottom: 8 }}>TODAY</Kicker>
      <View style={[glass, { marginHorizontal: 16, padding: 16 }]}>
        <T style={{ fontSize: 16, fontWeight: '600' }}>{todayFast ? `Fasting · ${KIND_LABEL[todayFast.kind]}` : 'Are you fasting today?'}</T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {kinds.map((k) => {
            const on = todayFast?.kind === k;
            return (
              <Chip key={k} bg={on ? SC.mint : 'rgba(255,255,255,0.08)'} c={on ? SC.ink : '#fff'} style={{ height: 38 }} textStyle={{ fontSize: 14 }} onPress={() => choose(on ? null : k)}>
                {busy === k ? <ActivityIndicator size="small" color={on ? SC.ink : '#fff'} /> : KIND_LABEL[k]}
              </Chip>
            );
          })}
          {todayFast && (
            <Chip style={{ height: 38 }} textStyle={{ fontSize: 14 }} onPress={() => choose(null)}>
              {busy === 'none' ? <ActivityIndicator size="small" color="#fff" /> : 'Not fasting'}
            </Chip>
          )}
        </View>
        {todayFast?.kind === 'qada' && <T style={{ fontSize: 12, opacity: 0.55, marginTop: 10 }}>Counted as made up in your Qaḍāʾ tracker.</T>}
      </View>

      {ramadan && (
        <>
          <Kicker style={{ marginTop: 24, marginHorizontal: 24, marginBottom: 8 }}>{`RAMAḌĀN · ${ramadanCells.filter((c) => c.fasted).length} FASTED`}</Kicker>
          <View style={[glass, { marginHorizontal: 16, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }]}>
            {ramadanCells.map((c) => (
              <View
                key={c.n}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.fasted ? SC.mint : c.future ? 'transparent' : 'rgba(255,255,255,0.08)',
                  borderWidth: c.date === todayIso ? 1.5 : 0,
                  borderColor: '#fff',
                }}>
                <T style={{ fontSize: 13, fontWeight: '600', color: c.fasted ? SC.ink : '#fff', opacity: c.future ? 0.4 : 1 }}>{c.n}</T>
              </View>
            ))}
          </View>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <Kicker style={{ marginTop: 24, marginHorizontal: 24, marginBottom: 8 }}>COMING UP</Kicker>
          <View style={[glass, { marginHorizontal: 16, paddingHorizontal: 16 }]}>
            {upcoming.map((u, i) => (
              <View key={u.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
                <Icon n="moon" s={18} c={SC.mint} />
                <T style={{ flex: 1, fontSize: 15, fontWeight: '600' }}>{u.title}</T>
                <T style={{ fontSize: 13, opacity: 0.6 }}>{u.date === todayIso ? 'Today' : nice(u.date)}</T>
              </View>
            ))}
          </View>
        </>
      )}

      <T style={{ marginHorizontal: 32, marginTop: 18, fontSize: 12, opacity: 0.45, textAlign: 'center', lineHeight: 18 }}>
        {`${recent.length} fast${recent.length === 1 ? '' : 's'} in the last 30 days. Turn on fasting reminders in Settings for suḥūr, ifṭār and sunnah-fast nudges.`}
      </T>
    </Screen>
  );
}
