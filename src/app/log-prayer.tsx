import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Sheet, useCloseSheet } from '@/components/sheet';
import { Icon, type IconName } from '@/components/ui/icon';
import { Btn, Tap, Toggle } from '@/components/ui/primitives';
import { InkContext, T } from '@/components/ui/text';
import { isoDate, logPrayer } from '@/lib/data';
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
  const close = useCloseSheet();
  const params = useLocalSearchParams<{ prayer?: string; date?: string }>();
  const { day, next, profile, now } = useMyDay(60_000);
  const tz = profile?.timezone;

  const prayer: PrayerKey = PRAYER_KEYS.includes(params.prayer as PrayerKey) ? (params.prayer as PrayerKey) : (next?.key ?? 'fajr');
  const date = params.date ?? isoDate(now, tz);
  const name = PRAYER_LABEL[prayer];
  const at = day ? formatTime(day.times[prayer], tz, true) : '';

  const [late, setLate] = useState(false);
  const [jamaah, setJamaah] = useState(false);
  const [masjid, setMasjid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extras: [IconName, string, string, boolean, (v: boolean) => void][] = [
    ['together', 'In jamāʿah', '+1 bonus point', jamaah, setJamaah],
    ['pin', 'At the masjid', 'Prayed at a masjid', masjid, setMasjid],
  ];

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await logPrayer({ prayer, prayedOn: date, status: late ? 'late' : 'on_time', inJamaah: jamaah, atMasjid: masjid });
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setSaving(false);
    }
  };

  return (
    <>
      <T style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, opacity: 0.5 }}>
        {name.toUpperCase()}
        {at ? ` · ${at}` : ''}
      </T>
      <T style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1, marginTop: 4 }}>Did you pray {name}?</T>

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

      {error && <T style={{ color: SC.coral, fontSize: 14, marginTop: 12, textAlign: 'center' }}>{error}</T>}
      <Btn
        kind="ink"
        disabled={saving}
        icon={saving ? <ActivityIndicator color="#fff" /> : undefined}
        style={{ marginTop: 16, height: 58, borderRadius: 29 }}
        onPress={save}>
        Log {name}
      </Btn>
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
