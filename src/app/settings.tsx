import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { glass, hairline, Kicker, Tap, Toggle } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { invalidate, useQuery } from '@/lib/data';
import { deleteAccount } from '@/lib/auth';
import { AVATAR_CREDIT } from '@/lib/avatar';
import { exportMyData } from '@/lib/export';
import { notificationsSupported, unregisterDevice } from '@/lib/notifications';
import { clearReminders, syncReminders } from '@/lib/reminders';
import { METHODS, PRAYER_KEYS, PRAYER_LABEL } from '@/lib/prayer-times';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

type Row = { label: string; value?: string; href?: Href; onPress?: () => void; toggle?: { on: boolean; onChange: (v: boolean) => void } };

const hijriLabel = (n: number) => (n === 0 ? 'As calculated' : `${n > 0 ? '+' : '−'}${Math.abs(n)} day`);

const time12 = (t?: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};

export default function SettingsScreen() {
  const { session, profile, signOut, updateProfile } = useSession();
  const me = session?.user.id;
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const prefs = useQuery(me ? `prefs:${me}` : null, async () => {
    const [r, s] = await Promise.all([
      supabase.from('prayer_reminders').select('prayer, enabled, sound').eq('user_id', me!),
      supabase.from('reminder_settings').select('heads_up_minutes, allow_nudges, quiet_start, quiet_end, fasting_reminders, jumuah_reminder').eq('user_id', me!).maybeSingle(),
    ]);
    if (r.error) throw r.error;
    if (s.error) throw s.error;
    const scheduled = profile ? await syncReminders(me!, profile).catch(() => null) : null;
    return { reminders: r.data ?? [], settings: s.data, scheduled };
  });

  const adhan = PRAYER_KEYS.filter((p) => prefs.data?.reminders.some((r) => r.prayer === p && r.enabled && r.sound === 'adhan')).map((p) => PRAYER_LABEL[p]);
  const settings = prefs.data?.settings;

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const flag = (key: string, saved: boolean | undefined, fallback: boolean) => overrides[key] ?? saved ?? fallback;

  /** Optimistic toggle: show the new value, save, roll back on failure. */
  const toggle = (key: string, save: (v: boolean) => PromiseLike<{ error: { message: string } | null }>) => async (v: boolean) => {
    setOverrides((o) => ({ ...o, [key]: v }));
    const { error } = await save(v);
    if (error) {
      setOverrides((o) => ({ ...o, [key]: !v }));
      Alert.alert('Couldn’t save', error.message);
      return;
    }
    invalidate();
    if (key === 'fasting' || key === 'jumuah') syncReminders(me!, profile!, true).catch(() => {});
  };
  const setAllowNudges = toggle('nudges', (v) => supabase.from('reminder_settings').upsert({ user_id: me!, allow_nudges: v }));
  const setFasting = toggle('fasting', (v) => supabase.from('reminder_settings').upsert({ user_id: me!, fasting_reminders: v }));
  const setJumuah = toggle('jumuah', (v) => supabase.from('reminder_settings').upsert({ user_id: me!, jumuah_reminder: v }));
  const setProfileFlag = (key: 'track_excused' | 'track_sunnah') => async (v: boolean) => {
    setOverrides((o) => ({ ...o, [key]: v }));
    try {
      await updateProfile({ [key]: v });
    } catch (e) {
      setOverrides((o) => ({ ...o, [key]: !v }));
      Alert.alert('Couldn’t save', e instanceof Error ? e.message : '');
    }
  };
  const trackExcused = flag('track_excused', profile?.track_excused, false);

  const method = METHODS.find((m) => m.id === profile?.calc_method)?.name ?? '—';
  const groups: [string, Row[]][] = [
    [
      'PROFILE',
      [
        { label: 'Name & avatar', value: profile?.display_name ?? '', href: '/setup-name' },
        { label: 'Email', value: session?.user.email ?? '' },
      ],
    ],
    [
      'PRAYER TIMES',
      [
        { label: 'Location', value: [profile?.city, profile?.region].filter(Boolean).join(', ') || 'Not set', href: '/setup-location' },
        { label: 'Calculation', value: method, href: '/setup-method' },
        { label: 'Asr', value: profile?.asr_method === 'hanafi' ? 'Ḥanafī' : 'Standard', href: '/setup-method' },
        { label: 'Source', value: 'AlAdhan' },
        {
          label: 'Hijri date',
          value: hijriLabel(profile?.hijri_offset ?? 0),
          onPress: () =>
            Alert.alert('Hijri date', 'Match your local moon sighting by moving the Hijri date a day either way.', [
              ...[-1, 0, 1].map((n) => ({ text: hijriLabel(n), onPress: () => updateProfile({ hijri_offset: n }).catch(() => {}) })),
              { text: 'Cancel', style: 'cancel' as const },
            ]),
        },
      ],
    ],
    [
      'REMINDERS',
      [
        { label: 'Adhān & sounds', value: prefs.data ? adhan.join(', ') || 'Chimes only' : '…', href: '/setup-reminders' },
        { label: 'Heads-up', value: settings ? (settings.heads_up_minutes ? `${settings.heads_up_minutes} min before` : 'Off') : '…', href: '/setup-reminders' },
        {
          label: 'On this phone',
          href: '/setup-reminders',
          value: !notificationsSupported
            ? 'Needs the full app build'
            : !prefs.data
              ? '…'
              : prefs.data.scheduled == null
                ? 'Notifications off'
                : prefs.data.scheduled.mode === 'server'
                  ? `Push on · ${prefs.data.scheduled.count} queued`
                  : `${prefs.data.scheduled.count} on this phone`,
        },
        { label: 'Nudges from circles', toggle: { on: flag('nudges', settings?.allow_nudges, true), onChange: setAllowNudges } },
        { label: 'Jumuʿah reminder', toggle: { on: flag('jumuah', settings?.jumuah_reminder, true), onChange: setJumuah } },
        { label: 'Fasting reminders', toggle: { on: flag('fasting', settings?.fasting_reminders, false), onChange: setFasting } },
        { label: 'Quiet hours', value: settings?.quiet_start ? `${time12(settings.quiet_start)} – ${time12(settings.quiet_end)}` : 'Off', href: '/setup-reminders' },
      ],
    ],
    [
      'WORSHIP',
      [
        { label: 'Track sunnah prayers', toggle: { on: flag('track_sunnah', profile?.track_sunnah, false), onChange: setProfileFlag('track_sunnah') } },
        { label: 'Track excused days', toggle: { on: trackExcused, onChange: setProfileFlag('track_excused') } },
        ...(trackExcused ? [{ label: 'Excused days', value: profile?.paused_since ? 'In progress' : 'Private to you', href: '/excused' as Href }] : []),
      ],
    ],
    [
      'PRIVACY',
      [
        { label: 'Who sees my log', value: 'My circles' },
        { label: 'Jamāʿah & masjid details', value: 'Only me' },
        { label: 'Blocked people', href: '/blocked' },
        {
          label: 'Download my data',
          value: exporting ? 'Preparing…' : 'JSON file',
          onPress: async () => {
            if (exporting) return;
            setExporting(true);
            try {
              await exportMyData(me!);
            } catch (e) {
              Alert.alert('Couldn’t export', e instanceof Error ? e.message : '');
            } finally {
              setExporting(false);
            }
          },
        },
      ],
    ],
  ];

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle t="Settings" style={{ marginTop: 16 }} />
      <View style={{ marginHorizontal: 16, marginTop: 20, gap: 16 }}>
        {groups.map(([title, rows]) => (
          <View key={title}>
            <Kicker style={{ opacity: 0.5, marginHorizontal: 8, marginBottom: 8 }}>{title}</Kicker>
            <View style={[glass, { paddingHorizontal: 16 }]}>
              {rows.map((r, i) => (
                <Tap
                  key={r.label}
                  disabled={!!r.toggle || (!r.href && !r.onPress)}
                  onPress={() => (r.onPress ? r.onPress() : r.href && router.push(r.href))}
                  style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
                  <T style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>
                    {r.label}
                  </T>
                  {r.toggle ? (
                    <Toggle on={r.toggle.on} onChange={r.toggle.onChange} />
                  ) : (
                    <>
                      <T style={{ opacity: 0.55, fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
                        {r.value}
                      </T>
                      {(r.href || r.onPress) && <Icon n="chev" s={16} c="rgba(255,255,255,0.35)" />}
                    </>
                  )}
                </Tap>
              ))}
            </View>
          </View>
        ))}
        <Tap
          disabled={signingOut}
          onPress={async () => {
            setSigningOut(true);
            await signOut();
            router.dismissAll();
            router.replace('/welcome');
          }}
          style={[glass, { height: 50, alignItems: 'center', justifyContent: 'center' }]}>
          {signingOut ? <ActivityIndicator color={SC.coral} /> : <T style={{ fontSize: 15, fontWeight: '600', color: SC.coral }}>Sign out</T>}
        </Tap>
        <Tap
          disabled={deleting}
          onPress={() =>
            Alert.alert('Delete your account?', 'This permanently removes your profile, prayer log, nudges and voice notes. Circles you own pass to the next member. This can’t be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete forever',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await Promise.all([clearReminders().catch(() => {}), unregisterDevice().catch(() => {})]);
                    await deleteAccount();
                    router.dismissAll();
                    router.replace('/welcome');
                  } catch (e) {
                    setDeleting(false);
                    Alert.alert('Couldn’t delete', e instanceof Error ? e.message : '');
                  }
                },
              },
            ])
          }
          style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
          {deleting ? <ActivityIndicator color={SC.coral} /> : <T style={{ fontSize: 14, opacity: 0.6 }}>Delete account</T>}
        </Tap>
        <T style={{ fontSize: 11, opacity: 0.35, textAlign: 'center', marginTop: 4 }}>{AVATAR_CREDIT}</T>
      </View>
    </Screen>
  );
}
