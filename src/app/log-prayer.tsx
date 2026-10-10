import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Sheet, useCloseSheet } from '@/components/sheet';
import { Icon, type IconName } from '@/components/ui/icon';
import { Btn, Chip, Tap, Toggle } from '@/components/ui/primitives';
import { InkContext, T } from '@/components/ui/text';
import { isoDate, loadMyLog, logPrayer, setSunnah, SUNNAH_FOR, unlogPrayer, useQuery, type MyLog, type SunnahKind } from '@/lib/data';
import { formatTime, PRAYER_KEYS, PRAYER_LABEL, type PrayerKey } from '@/lib/prayer-times';
import { useMyDay } from '@/lib/today';
import { SC } from '@/theme/colors';

export default function LogPrayerSheet() {
  return (
    <Sheet>
      <LogPrayerContent />
    </Sheet>
  );
}

function LogPrayerContent() {
  const params = useLocalSearchParams<{ prayer?: string; date?: string }>();
  const { day, next, profile, now } = useMyDay(60_000);
  const tz = profile?.timezone;

  const prayer: PrayerKey = PRAYER_KEYS.includes(params.prayer as PrayerKey) ? (params.prayer as PrayerKey) : (next?.key ?? 'fajr');
  const date = params.date ?? isoDate(now, tz);
  const existing = useQuery(profile ? `mylog:${profile.id}:${prayer}:${date}` : null, () => loadMyLog(profile?.id ?? '', prayer, date));

  if (!profile || existing.loading) {
    return (
      <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={SC.ink} />
      </View>
    );
  }
  // Keyed so the form starts from what's saved for this prayer and day.
  return (
    <LogForm
      key={`${prayer}:${date}:${existing.data?.id ?? 'new'}`}
      prayer={prayer}
      date={date}
      at={day ? formatTime(day.times[prayer], tz, true) : ''}
      existing={existing.data}
      userId={profile.id}
      trackSunnah={profile.track_sunnah}
    />
  );
}

function LogForm({ prayer, date, at, existing, userId, trackSunnah }: { prayer: PrayerKey; date: string; at: string; existing: MyLog | null; userId: string; trackSunnah: boolean }) {
  const close = useCloseSheet();
  const name = PRAYER_LABEL[prayer];

  const [late, setLate] = useState(existing?.status === 'late');
  const [jamaah, setJamaah] = useState(existing?.inJamaah ?? false);
  const [masjid, setMasjid] = useState(existing?.atMasjid ?? false);
  const [saving, setSaving] = useState<'save' | 'tasbih' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extras: [IconName, string, string, boolean, (v: boolean) => void][] = [
    ['together', 'In jamāʿah', '+1 bonus point', jamaah, setJamaah],
    ['pin', 'At the masjid', 'Prayed at a masjid', masjid, setMasjid],
  ];

  const sunnahOptions = trackSunnah || existing?.sunnah.length ? SUNNAH_FOR[prayer] : [];
  const [sunnah, setSunnahState] = useState<Set<SunnahKind>>(() => new Set(existing?.sunnah ?? []));
  const flipSunnah = (k: SunnahKind) =>
    setSunnahState((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const save = async (then?: 'tasbih') => {
    setSaving(then ?? 'save');
    setError(null);
    try {
      await logPrayer({ prayer, prayedOn: date, status: late ? 'late' : 'on_time', inJamaah: jamaah, atMasjid: masjid });
      // Only write sunnah ticks that changed.
      const before = new Set(existing?.sunnah ?? []);
      await Promise.all(sunnahOptions.filter(({ kind }) => before.has(kind) !== sunnah.has(kind)).map(({ kind }) => setSunnah(userId, date, kind, sunnah.has(kind))));
      if (then === 'tasbih') router.replace('/tasbih');
      else close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setSaving(null);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setSaving('remove');
    setError(null);
    try {
      await unlogPrayer(existing.id);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove.');
      setSaving(null);
    }
  };

  return (
    <>
      <T style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, opacity: 0.5 }}>
        {name.toUpperCase()}
        {at ? ` · ${at}` : ''}
      </T>
      <T style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1, marginTop: 4 }}>{existing ? `Edit your ${name} log` : `Did you pray ${name}?`}</T>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Option title="On time" sub="Within its window" on={!late} onPress={() => setLate(false)} dot={SC.mint} />
        <Option title="Late" sub="Made it up (qaḍāʾ)" on={late} onPress={() => setLate(true)} dot={SC.amber} />
      </View>

      <View style={{ marginTop: 12, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(11,18,32,0.07)', paddingHorizontal: 16 }}>
        {extras.map(([ic, t, s, on, set], i) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 60, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(11,18,32,0.06)' }}>
            <Icon n={ic} s={20} style={{ opacity: 0.7 }} />
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 15, fontWeight: '600' }}>{t}</T>
              <T style={{ fontSize: 12, opacity: 0.55 }}>{s}</T>
            </View>
            <Toggle on={on} onChange={set} light />
          </View>
        ))}
      </View>

      {sunnahOptions.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <T style={{ fontSize: 13, fontWeight: '600', opacity: 0.6, marginRight: 4 }}>Sunnah</T>
          {sunnahOptions.map(({ kind, label }) => {
            const on = sunnah.has(kind);
            return (
              <Chip
                key={kind}
                bg={on ? SC.green : '#fff'}
                c={on ? '#fff' : SC.ink}
                style={{ height: 36, borderWidth: 1, borderColor: 'rgba(11,18,32,0.08)' }}
                textStyle={{ fontSize: 14 }}
                onPress={() => flipSunnah(kind)}>
                {on && <Icon n="check" s={14} c="#fff" w={2.4} />}
                {label}
              </Chip>
            );
          })}
        </View>
      )}

      {error && <T style={{ color: SC.coral, fontSize: 14, marginTop: 12, textAlign: 'center' }}>{error}</T>}
      <Btn
        kind="ink"
        disabled={!!saving}
        icon={saving === 'save' ? <ActivityIndicator color="#fff" /> : undefined}
        style={{ marginTop: 16, height: 58, borderRadius: 29 }}
        onPress={() => save()}>
        {existing ? 'Save changes' : `Log ${name}`}
      </Btn>
      {existing ? (
        <T onPress={saving ? undefined : remove} style={{ fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 14, color: SC.coral }}>
          {saving === 'remove' ? 'Removing…' : `Remove this ${name} log`}
        </T>
      ) : (
        <T onPress={saving ? undefined : () => save('tasbih')} style={{ fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 14, color: SC.green }}>
          Log and do tasbīḥ after prayer
        </T>
      )}
      <T style={{ fontSize: 12, opacity: 0.5, textAlign: 'center', marginTop: 12 }}>Your circle sees ✓ only, never the details.</T>
    </>
  );
}

function Option({ title, sub, on, onPress, dot }: { title: string; sub: string; on: boolean; onPress: () => void; dot: string }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      style={{
        flex: 1,
        height: 96,
        borderRadius: 24,
        backgroundColor: on ? SC.green : '#fff',
        borderWidth: 1,
        borderColor: 'rgba(11,18,32,0.07)',
        padding: 14,
        justifyContent: 'space-between',
      }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: on ? SC.mint : dot, alignItems: 'center', justifyContent: 'center' }}>
        <Icon n="check" s={16} c={SC.ink} w={2.6} />
      </View>
      <InkContext value={on ? '#fff' : SC.ink}>
        <View>
          <T style={{ fontSize: 16, fontWeight: '700' }}>{title}</T>
          <T style={{ fontSize: 12, opacity: 0.65 }}>{sub}</T>
        </View>
      </InkContext>
    </Tap>
  );
}
