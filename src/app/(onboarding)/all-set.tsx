import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';

import { OrbitDial } from '@/components/orbit-dial';
import { Av, Btn } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { PERIODS } from '@/data/mock';
import { fetchNextPrayer, formatIn, PRAYER_LABEL, useAsync } from '@/lib/prayer-times';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

export default function AllSetScreen() {
  const { circle: circleId } = useLocalSearchParams<{ circle?: string }>();
  const { profile, updateProfile } = useSession();
  const { width } = useWindowDimensions();
  const size = Math.min(340, width - 40);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const place =
    profile?.latitude != null && profile.longitude != null
      ? { latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone }
      : null;
  const next = useAsync(place ? `next:${place.latitude},${place.longitude},${profile?.calc_method},${profile?.asr_method}` : null, async () => {
    const n = await fetchNextPrayer(place!, profile!.calc_method, profile!.asr_method);
    return { ...n, inMs: n.at.getTime() - Date.now() };
  });
  const circle = useAsync(circleId ? `circle-name:${circleId}` : null, async () => {
    const { data } = await supabase.from('circles').select('name').eq('id', circleId!).single();
    return data?.name ?? null;
  });

  const nextLine = next.data ? `${PRAYER_LABEL[next.data.key]} is in ${formatIn(next.data.inMs)}.` : '';
  const circleLine = circle.data ? ` ${circle.data} is waiting for you.` : ' You can join or start a circle any time from Circles.';

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ onboarded_at: new Date().toISOString() });
      router.dismissAll();
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup.');
      setSaving(false);
    }
  };

  const me = { init: (profile?.display_name?.[0] ?? '?').toUpperCase(), color: profile?.avatar_color ?? SC.mint, seed: profile?.avatar_seed ?? profile?.id };
  const p = PERIODS.maghrib;

  return (
    <Screen
      bg="maghrib"
      footer={
        <>
          {error && <T style={{ color: SC.coral, fontSize: 14, textAlign: 'center' }}>{error}</T>}
          <Btn disabled={saving} icon={saving ? <ActivityIndicator color={SC.ink} /> : undefined} onPress={finish}>
            Go to Today
          </Btn>
        </>
      }>
      <View style={{ alignSelf: 'center', marginTop: 24 }}>
        <OrbitDial now={p.now} dark size={size} />
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Av m={me} s={76} style={{ boxShadow: '0 0 0 6px rgba(255,255,255,0.18)' }} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <T style={{ fontSize: 15, fontWeight: '600', opacity: 0.8, letterSpacing: 0.4 }}>Bismillāh</T>
        <T style={{ fontSize: 46, fontWeight: '700', letterSpacing: -1.8, lineHeight: 47, marginTop: 4 }}>
          {circle.data ? 'You’re in the circle.' : 'You’re all set.'}
        </T>
        <T style={{ fontSize: 17, opacity: 0.85, marginTop: 14, lineHeight: 24 }}>
          {nextLine}
          {circleLine}
        </T>
      </View>
    </Screen>
  );
}
