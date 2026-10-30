import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Chip, glass, hairline, Tap } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { excusedDates, loadMyDayLogs, useExcused, useQuery } from '@/lib/data';
import { PRAYER_KEYS, PRAYER_LABEL } from '@/lib/prayer-times';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

export default function DayHistoryScreen() {
  const { date: raw } = useLocalSearchParams<{ date?: string }>();
  const date = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  const { session, profile } = useSession();
  const me = session?.user.id;
  const logs = useQuery(me && date ? `day-detail:${me}:${date}` : null, () => loadMyDayLogs(me!, date!));
  const excused = useExcused(me, !!profile?.track_excused);
  const isExcused = date ? excusedDates(excused.data, date).has(date) : false;

  const label = date
    ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : 'Day';

  const prayed = logs.data ? PRAYER_KEYS.filter((p) => logs.data![p] && logs.data![p]!.status !== 'missed').length : 0;

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle k={date ?? ' '} t={label} style={{ marginTop: 16 }} />

      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <Chip bg="rgba(255,255,255,0.1)" style={{ height: 32 }}>
          {isExcused ? 'Excused day' : `${prayed} of 5 prayed`}
        </Chip>
        {profile?.traveling && (
          <Chip bg="rgba(135,232,191,0.18)" c={SC.mint} style={{ height: 32 }}>
            Traveling
          </Chip>
        )}
      </View>

      {!date && <T style={{ margin: 16, opacity: 0.6 }}>Pick a day from the calendar.</T>}
      {date && logs.loading && <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />}
      {date && logs.error && <T style={{ margin: 16, color: SC.coral }}>{logs.error}</T>}

      {date && !logs.loading && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 14, paddingHorizontal: 16 }]}>
          {PRAYER_KEYS.map((p, i) => {
            const log = logs.data?.[p];
            const status = log?.status;
            const color = !status || status === 'missed' ? 'rgba(255,255,255,0.35)' : status === 'on_time' ? SC.mint : SC.amber;
            return (
              <Tap
                key={p}
                onPress={() => router.push({ pathname: '/log-prayer', params: { prayer: p, date } })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 64,
                  paddingVertical: 10,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: hairline(),
                }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 16, fontWeight: '600' }}>{PRAYER_LABEL[p]}</T>
                  <T style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>
                    {!log ? (isExcused ? 'Excused' : 'Not logged') : status === 'on_time' ? 'On time' : status === 'late' ? 'Late' : 'Missed'}
                    {log?.inJamaah ? ' · jamāʿah' : ''}
                    {log?.atMasjid ? ' · masjid' : ''}
                    {log?.combined ? ' · jamʿ' : ''}
                  </T>
                  {!!log?.sunnah.length && (
                    <T style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>Sunnah: {log.sunnah.join(', ')}</T>
                  )}
                </View>
                <Icon n="chev" s={16} c="rgba(255,255,255,0.35)" />
              </Tap>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
