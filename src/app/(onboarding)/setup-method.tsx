import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { OBHead, OBTop, useSetupNext } from '@/components/onboarding';
import { Btn, Label, Segmented, Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { fetchDay, formatTime, METHODS, suggestMethod, useAsync, type AsrMethod, type CalcMethod } from '@/lib/prayer-times';
import { useSession } from '@/state/session';
import { mintA, SC } from '@/theme/colors';

const SHOWN = 4;

export default function SetupMethodScreen() {
  const next = useSetupNext();
  const { profile, updateProfile } = useSession();
  const suggested = suggestMethod(profile?.country_code);
  const [method, setMethod] = useState<CalcMethod>(profile?.calc_method ?? suggested);
  const [asr, setAsr] = useState<AsrMethod>(profile?.asr_method ?? 'standard');
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const place =
    profile?.latitude != null && profile.longitude != null
      ? { latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone }
      : null;
  const tz = profile?.timezone;

  // Suggested + selected first, then the rest in AlAdhan's usual order.
  const first = [suggested, ...(method !== suggested ? [method] : [])];
  const ordered = [...first.map((id) => METHODS.find((m) => m.id === id)!).filter(Boolean), ...METHODS.filter((m) => !first.includes(m.id))];
  const visible = showAll ? ordered : ordered.slice(0, SHOWN);

  // Live Fajr/Isha per visible method, plus both Asr variants for the selected one.
  const placeKey = place ? `${place.latitude},${place.longitude},${place.timezone}` : null;
  const ids = visible.map((m) => m.id);
  const previews = useAsync(placeKey && `${placeKey}|${ids.join(',')}|${asr}`, async () => {
    const days = await Promise.all(ids.map((id) => fetchDay(place!, id, asr)));
    return Object.fromEntries(days.map((d, i) => [ids[i], { fajr: formatTime(d.times.fajr, tz), isha: formatTime(d.times.isha, tz) }]));
  });
  const asrTimes = useAsync(placeKey && `${placeKey}|asr|${method}`, async () => {
    const [std, han] = await Promise.all([fetchDay(place!, method, 'standard'), fetchDay(place!, method, 'hanafi')]);
    return { standard: formatTime(std.times.asr, tz, true), hanafi: formatTime(han.times.asr, tz, true) };
  });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ calc_method: method, asr_method: asr });
      next('/setup-reminders');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      bg="onboard"
      header={<OBTop step={3} />}
      footer={
        <>
          {error && <T style={{ color: SC.coral, fontSize: 14, textAlign: 'center' }}>{error}</T>}
          <Btn kind="mint" disabled={saving} icon={saving ? <ActivityIndicator color={SC.ink} /> : undefined} onPress={save}>
            Continue
          </Btn>
        </>
      }>
      <OBHead k="STEP 3 OF 5" t="How should we calculate times?" />
      <View style={{ marginTop: 24, paddingHorizontal: 16, gap: 8 }}>
        {visible.map((m) => {
          const on = m.id === method;
          const p = previews.data?.[m.id];
          return (
            <Tap
              key={m.id}
              onPress={() => setMethod(m.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{
                height: 68,
                borderRadius: 22,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: on ? mintA(0.12) : 'rgba(255,255,255,0.05)',
                borderWidth: 1.5,
                borderColor: on ? SC.mint : 'rgba(255,255,255,0.07)',
              }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? SC.mint : 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: SC.mint }} />}
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                  {m.name}
                  {m.id === suggested && <T style={{ fontSize: 11, color: SC.mint, letterSpacing: 0.8 }}>{'  '}SUGGESTED</T>}
                </T>
                <T style={{ fontSize: 12, opacity: 0.55 }}>{m.sub}</T>
              </View>
              {!p && previews.loading && <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />}
              {p && (
                <T style={{ textAlign: 'right', fontSize: 12, opacity: 0.75, lineHeight: 18 }}>
                  Fajr {p.fajr}
                  {'\n'}Isha {p.isha}
                </T>
              )}
            </Tap>
          );
        })}
        {previews.error && <T style={{ fontSize: 12, color: SC.coral, textAlign: 'center' }}>Couldn’t load previews: {previews.error}</T>}
        <T onPress={() => setShowAll((v) => !v)} style={{ fontSize: 14, opacity: 0.6, textAlign: 'center', paddingVertical: 8 }}>
          {showAll ? 'Show fewer' : `+ ${METHODS.length - SHOWN} more methods`}
        </T>
      </View>
      <View style={{ marginTop: 12, paddingHorizontal: 16 }}>
        <Label>Asr time</Label>
        <Segmented
          value={asr}
          onChange={setAsr}
          options={[
            { value: 'standard', label: 'Standard', sub: asrTimes.data?.standard },
            { value: 'hanafi', label: 'Ḥanafī', sub: asrTimes.data?.hanafi },
          ]}
        />
        <T style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>Shāfiʿī, Mālikī, Ḥanbalī use Standard.</T>
      </View>
    </Screen>
  );
}
