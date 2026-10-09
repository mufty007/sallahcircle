import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { OBHead, OBTop, useSetupNext } from '@/components/onboarding';
import { Icon } from '@/components/ui/icon';
import { Btn, Chip, glass, hairline, Label, Toggle } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { formatTime, PRAYER_KEYS, PRAYER_LABEL, useDayTimes, type PrayerKey } from '@/lib/prayer-times';
import { registerForNotifications } from '@/lib/notifications';
import { supabase, type Enums } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

type Sound = Enums<'reminder_sound'>;
type Reminder = { enabled: boolean; sound: Sound };

const HEADS_UP = [0, 5, 10, 15, 30] as const;
const SOUNDS: Sound[] = ['adhan', 'chime', 'silent'];
const SOUND_LABEL: Record<Sound, string> = { adhan: 'Adhān', chime: 'Chime', silent: 'Silent' };
const DEFAULTS: Record<PrayerKey, Reminder> = {
  fajr: { enabled: true, sound: 'adhan' },
  dhuhr: { enabled: true, sound: 'chime' },
  asr: { enabled: true, sound: 'chime' },
  maghrib: { enabled: true, sound: 'adhan' },
  isha: { enabled: true, sound: 'chime' },
};

export default function SetupRemindersScreen() {
  const next = useSetupNext();
  const { profile, session } = useSession();
  const userId = session?.user.id;
  const [reminders, setReminders] = useState(DEFAULTS);
  const [headsUp, setHeadsUp] = useState<number>(10);
  const [allowNudges, setAllowNudges] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase.from('prayer_reminders').select('prayer, enabled, sound').eq('user_id', userId),
      supabase.from('reminder_settings').select('heads_up_minutes, allow_nudges').eq('user_id', userId).maybeSingle(),
    ]).then(([r, s]) => {
      if (r.data?.length) {
        setReminders((prev) => {
          const out = { ...prev };
          for (const row of r.data) out[row.prayer] = { enabled: row.enabled, sound: row.sound };
          return out;
        });
      }
      if (s.data) {
        setHeadsUp(s.data.heads_up_minutes);
        setAllowNudges(s.data.allow_nudges);
      }
      setLoading(false);
    });
  }, [userId]);

  const place =
    profile?.latitude != null && profile.longitude != null
      ? { latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone }
      : null;
  const times = useDayTimes(place, profile?.calc_method ?? 2, profile?.asr_method ?? 'standard').data?.times;

  const set = (p: PrayerKey, patch: Partial<Reminder>) => setReminders((r) => ({ ...r, [p]: { ...r[p], ...patch } }));
  const cycleSound = (p: PrayerKey) => set(p, { sound: SOUNDS[(SOUNDS.indexOf(reminders[p].sound) + 1) % SOUNDS.length] });

  const save = async (askPermission: boolean) => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const [r, s] = await Promise.all([
        supabase.from('prayer_reminders').upsert(PRAYER_KEYS.map((p) => ({ user_id: userId, prayer: p, ...reminders[p] }))),
        supabase.from('reminder_settings').upsert({ user_id: userId, heads_up_minutes: headsUp, allow_nudges: allowNudges }),
      ]);
      if (r.error || s.error) throw r.error ?? s.error;
      if (askPermission) await registerForNotifications(userId);
      next('/find-circle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save reminders.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      bg="onboard"
      header={<OBTop step={4} skipTo="/find-circle" />}
      footer={
        <>
          {error && <T style={{ color: SC.coral, fontSize: 14, textAlign: 'center' }}>{error}</T>}
          <Btn
            kind="mint"
            disabled={saving || loading}
            icon={saving ? <ActivityIndicator color={SC.ink} /> : <Icon n="bell" s={20} c={SC.ink} />}
            onPress={() => save(true)}>
            Allow notifications
          </Btn>
        </>
      }>
      <OBHead k="STEP 4 OF 5" t="When should we remind you?" />
      <View style={[glass, { marginHorizontal: 16, marginTop: 24, paddingVertical: 2, paddingHorizontal: 16 }]}>
        {PRAYER_KEYS.map((p, i) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', height: 54, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
            <T style={{ flex: 1, fontSize: 16, fontWeight: '600' }}>
              {PRAYER_LABEL[p]}
              {times && (
                <T style={{ fontSize: 13, opacity: 0.5, fontWeight: '400' }}>
                  {'  '}
                  {formatTime(times[p], profile?.timezone, true)}
                </T>
              )}
            </T>
            <Chip style={{ height: 30, marginRight: 10, opacity: reminders[p].enabled ? 1 : 0.4 }} onPress={() => cycleSound(p)}>
              {SOUND_LABEL[reminders[p].sound]}
              <Icon n="down" s={14} />
            </Chip>
            <Toggle on={reminders[p].enabled} onChange={(v) => set(p, { enabled: v })} />
          </View>
        ))}
      </View>

      <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
        <Label>Heads-up before each prayer</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {HEADS_UP.map((m) => (
            <Chip
              key={m}
              bg={m === headsUp ? SC.mint : 'rgba(255,255,255,0.07)'}
              c={m === headsUp ? SC.ink : '#fff'}
              style={{ height: 40, flex: 1, justifyContent: 'center', paddingHorizontal: 0 }}
              textStyle={{ fontSize: 14 }}
              onPress={() => setHeadsUp(m)}>
              {m === 0 ? 'Off' : `${m} min`}
            </Chip>
          ))}
        </View>
      </View>

      <View style={[glass, { marginHorizontal: 16, marginTop: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, height: 70 }]}>
        <Icon n="wave" s={22} c={SC.mint} />
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 16, fontWeight: '600' }}>Let my circle nudge me</T>
          <T style={{ fontSize: 12, opacity: 0.55 }}>Max 2 per prayer · muted during quiet hours</T>
        </View>
        <Toggle on={allowNudges} onChange={setAllowNudges} />
      </View>
      <T onPress={() => save(false)} style={{ textAlign: 'center', marginTop: 18, fontSize: 14, opacity: 0.6 }}>
        Save without notifications
      </T>
    </Screen>
  );
}
