import { router } from 'expo-router';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';

import { LocationPrompt } from '@/components/location-prompt';
import { ExcusedCard } from '@/components/excused-card';
import { OrbitDial } from '@/components/orbit-dial';
import { PrayerRow } from '@/components/prayer-row';
import { Icon } from '@/components/ui/icon';
import { Av, Btn, Chip, RoundBtn, Stars, Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { countdown, excusedDates, isoDate, loadLogs, loadMemberSchedules, shortIn, statusRow, streakFrom, useExcused, useInbox, useMyCircles, useQuery } from '@/lib/data';
import { formatTime, PRAYER_KEYS, PRAYER_LABEL } from '@/lib/prayer-times';
import { useMyDay } from '@/lib/today';
import { useAppState } from '@/state/app-state';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const NUDGE_WINDOW_MS = 30 * 60_000;

export default function TodayScreen() {
  const { session } = useSession();
  const { cycleSky } = useAppState();
  const { width } = useWindowDimensions();
  const me = session?.user.id;
  const { profile, now, todayIso, day, next, sky, dark, dial, error, place } = useMyDay();
  const tz = profile?.timezone;

  const circles = useMyCircles(me);
  const inbox = useInbox(me);
  const unread = (inbox.data ?? []).some((n) => !n.response && now.getTime() - n.createdAt.getTime() < 12 * 3_600_000);
  const circle = circles.data?.[0] ?? null;
  const others = circle?.members.filter((m) => !m.you) ?? [];

  // Members' next prayers (refreshed each minute) and the last 60 days of logs.
  const minuteKey = Math.floor(now.getTime() / 60_000);
  const schedules = useQuery(circle ? `schedules:${circle.id}:${others.map((m) => m.id).join(',')}:${minuteKey}` : null, () => loadMemberSchedules(others));
  const since = isoDate(new Date(now.getTime() - 60 * 86_400_000), tz);
  const memberIds = [me, ...others.map((m) => m.id)].filter(Boolean) as string[];
  const logs = useQuery(me ? `logs:${memberIds.join(',')}:${since}` : null, () => loadLogs(memberIds, since));

  const size = Math.min(360, width - 30);
  const btn = dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)';
  const card = dark ? { backgroundColor: 'rgba(8,12,30,0.5)', borderColor: 'rgba(255,255,255,0.1)' } : { backgroundColor: 'rgba(255,255,255,0.82)', borderColor: 'rgba(255,255,255,0.9)' };

  const myRow = me ? statusRow(logs.data ?? [], me, todayIso, next?.date === todayIso ? next.key : undefined) : [];
  const excused = useExcused(me, !!profile?.track_excused);
  const paused = !!profile?.paused_since;
  const streak = me ? streakFrom(logs.data ?? [], me, todayIso, excusedDates(excused.data, todayIso)) : 0;

  // The prayer whose time has most recently started is the one to log from the dial.
  const current = day ? [...PRAYER_KEYS].reverse().find((p) => day.times[p] <= now) : undefined;

  const active = (schedules.data ?? []).filter((s) => !s.member.paused);
  const queue = active.map((s) => [s.member, `${PRAYER_LABEL[s.next]} · ${shortIn(s.at.getTime() - now.getTime())}`] as const);
  const dueSoon = active.filter((s) => s.at.getTime() - now.getTime() < NUDGE_WINDOW_MS).length;
  const cardSub = dueSoon ? `${dueSoon} could use a nudge` : schedules.data?.length ? 'All quiet for now' : '';

  const openLog = (prayer: (typeof PRAYER_KEYS)[number]) => router.push({ pathname: '/log-prayer', params: { prayer, date: todayIso } });

  return (
    <Screen
      bg={sky}
      dark={dark}
      withTabBar
      decor={
        <>
          {sky === 'isha' && <Stars n={46} h={480} />}
          {sky === 'fajr' && <Stars n={22} h={260} />}
        </>
      }>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 }}>
        <Chip
          bg={btn}
          style={{ height: 40, paddingHorizontal: 14 }}
          textStyle={{ fontSize: 15, fontWeight: '600' }}
          onPress={() => (circle ? router.push(`/circle/${circle.id}`) : router.push('/circles'))}>
          {circle && others.length > 0 && (
            <View style={{ flexDirection: 'row' }}>
              {others.slice(0, 3).map((m, i) => (
                <View key={m.id} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: m.color, marginLeft: i ? -6 : 0, borderWidth: 2, borderColor: dark ? '#262c61' : '#9cc8ee' }} />
              ))}
            </View>
          )}
          {circle?.name ?? 'No circle yet'}
          <Icon n="chev" s={16} />
        </Chip>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip bg={btn} style={{ height: 40 }} textStyle={{ fontSize: 15, fontWeight: '600' }} onPress={() => router.push('/me')}>
            <Icon n="flame" s={17} />
            {String(streak)}
          </Chip>
          <RoundBtn n="bell" bg={btn} dot={unread} onPress={() => router.push('/activity')} />
        </View>
      </View>

      <LocationPrompt dark={dark} />

      {/* Tap the dial to log the current prayer; long-press to preview other skies. */}
      <Tap
        onPress={() => current && !paused && openLog(current)}
        onLongPress={cycleSky}
        accessibilityLabel={next ? `${PRAYER_LABEL[next.key]} in ${countdown(next.at.getTime() - now.getTime())}. Tap to log a prayer.` : 'Prayer times'}
        style={{ alignSelf: 'center', marginTop: 8 }}>
        {dial ? (
          <OrbitDial now={dial.now} dark={dark} queue={queue.map(([m, l]) => [m, l])} size={size} prayers={dial.prayers} sunrise={dial.sunrise} sunset={dial.sunset} />
        ) : (
          <View style={{ width: size, height: size }} />
        )}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: size * 0.36, alignItems: 'center' }}>
          {next ? (
            <>
              <T style={{ fontSize: 15, fontWeight: '600', opacity: 0.75 }}>{PRAYER_LABEL[next.key]} in</T>
              <T style={{ fontSize: 54, fontWeight: '600', letterSpacing: -2.5, lineHeight: 58, fontVariant: ['tabular-nums'] }}>{countdown(next.at.getTime() - now.getTime())}</T>
              <T style={{ fontSize: 13, opacity: 0.65, marginTop: 2 }}>Adhān {formatTime(next.at, tz, true)}</T>
            </>
          ) : !place ? (
            <T style={{ fontSize: 15, opacity: 0.75, textAlign: 'center', marginHorizontal: 60 }}>Set your location to see prayer times</T>
          ) : error ? (
            <T style={{ fontSize: 14, opacity: 0.75, textAlign: 'center', marginHorizontal: 60 }}>Couldn’t load prayer times. Check your connection.</T>
          ) : (
            <ActivityIndicator color={dark ? '#fff' : SC.ink} />
          )}
        </View>
      </Tap>

      {paused ? (
        <ExcusedCard today={todayIso} dark={dark} card={card} />
      ) : (
        <View style={{ marginTop: 10 }}>
          <PrayerRow
            st={myRow.length ? myRow : ['u', 'u', 'u', 'u', 'u']}
            dark={dark}
            times={day ? PRAYER_KEYS.map((p) => formatTime(day.times[p], tz)) : undefined}
            onPress={(i) => day && day.times[PRAYER_KEYS[i]] <= now && openLog(PRAYER_KEYS[i])}
          />
        </View>
      )}
      {!paused && <ExcusedCard today={todayIso} dark={dark} card={card} />}

      <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 28, paddingTop: 14, paddingHorizontal: 16, paddingBottom: circle && queue.length ? 2 : 16, borderWidth: 1, ...card }}>
        {!circle ? (
          <>
            <T style={{ fontSize: 16, fontWeight: '600' }}>{circles.loading ? 'Loading your circle…' : 'Pray together'}</T>
            {!circles.loading && (
              <>
                <T style={{ fontSize: 13, opacity: 0.65, marginTop: 4, marginBottom: 14 }}>Join friends with a code or start your own circle to see who’s up next.</T>
                <Btn kind={dark ? 'mint' : 'ink'} style={{ height: 48 }} textStyle={{ fontSize: 15 }} onPress={() => router.push('/find-circle')}>
                  Find a circle
                </Btn>
              </>
            )}
          </>
        ) : (
          <>
            <Tap onPress={() => router.push(`/circle/${circle.id}`)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <T style={{ fontSize: 16, fontWeight: '600' }}>Up next in {circle.name}</T>
              <T style={{ fontSize: 13, opacity: 0.6, flexShrink: 1 }} numberOfLines={1}>
                {cardSub}
              </T>
            </Tap>
            {others.length === 0 && (
              <Tap onPress={() => router.push({ pathname: '/invite', params: { circle: circle.id } })} style={{ paddingVertical: 14 }}>
                <T style={{ fontSize: 14, opacity: 0.7 }}>
                  It’s just you so far. <T style={{ fontWeight: '700', color: dark ? SC.mint : SC.green }}>Invite people →</T>
                </T>
              </Tap>
            )}
            {others.length > 0 && !schedules.data && <ActivityIndicator style={{ marginVertical: 16 }} color={dark ? '#fff' : SC.ink} />}
            {queue.slice(0, 2).map(([m, lab], i) => (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  height: 58,
                  marginTop: i ? 0 : 4,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(11,18,32,0.06)',
                }}>
                <Tap onPress={() => router.push({ pathname: '/member/[id]', params: { id: m.id, circle: circle.id } })}>
                  <Av m={m} s={36} />
                </Tap>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={{ fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                    {m.name}
                  </T>
                  <T style={{ fontSize: 13, opacity: 0.62 }} numberOfLines={1}>
                    {lab}
                    {m.city ? ` · ${m.city}` : ''}
                  </T>
                </View>
                <RoundBtn
                  n="together"
                  s={36}
                  bg={dark ? 'rgba(255,255,255,0.1)' : 'rgba(11,18,32,0.06)'}
                  onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id, circle: circle.id, mode: 'together' } })}
                />
                <Tap
                  onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: m.id, circle: circle.id } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: dark ? SC.mint : SC.green }}>
                  <Icon n="wave" s={16} w={2} c={dark ? SC.ink : '#fff'} />
                  <T style={{ fontSize: 14, fontWeight: '600', color: dark ? SC.ink : '#fff' }}>Nudge</T>
                </Tap>
              </View>
            ))}
          </>
        )}
      </View>
    </Screen>
  );
}
