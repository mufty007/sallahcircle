import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Btn } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { applyLocationDrift, snoozeLocationDrift, useLocationDrift, type Drift } from '@/lib/location-drift';
import { useSession } from '@/state/session';
import { mintA, SC } from '@/theme/colors';

function driftCopy(d: Drift) {
  if (d.reason === 'timezone') {
    return d.savedLabel
      ? `Your time zone changed. Prayer times are still set for ${d.savedLabel}.`
      : 'Your time zone changed. Update your location so prayer times stay accurate.';
  }
  if (d.hereLabel && d.savedLabel && d.hereLabel !== d.savedLabel) return `You’re in ${d.hereLabel}. Prayer times are still set for ${d.savedLabel}.`;
  if (d.savedLabel) return `You’ve moved far enough that prayer times for ${d.savedLabel} are off.`;
  if (d.hereLabel) return `You’re in ${d.hereLabel}. Update so your prayer times stay accurate.`;
  return 'You’ve moved. Update your location so prayer times stay accurate.';
}

/** Banner shown when the phone is somewhere other than the saved prayer location. */
export function LocationPrompt({ dark }: { dark: boolean }) {
  const { drift, busy, error } = useLocationDrift();
  const { session, updateProfile } = useSession();
  if (!drift) return null;

  const userId = session?.user.id;
  const update = () => {
    if (!userId) return;
    if (!drift.here) {
      router.push('/setup-location');
      return;
    }
    void applyLocationDrift(userId, updateProfile);
  };

  const card = dark
    ? { backgroundColor: 'rgba(8,12,30,0.55)', borderColor: 'rgba(255,255,255,0.12)' }
    : { backgroundColor: 'rgba(255,255,255,0.88)', borderColor: 'rgba(255,255,255,0.95)' };

  return (
    <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 28, padding: 16, borderWidth: 1, ...card }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: dark ? mintA(0.16) : 'rgba(11,18,32,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon n="pin" s={20} c={dark ? SC.mint : SC.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 16, fontWeight: '600' }}>Hey, update your location</T>
          <T style={{ fontSize: 13, opacity: 0.65, marginTop: 2, lineHeight: 18 }}>{driftCopy(drift)}</T>
        </View>
      </View>
      {error && <T style={{ color: SC.coral, fontSize: 13, marginTop: 10 }}>{error}</T>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <Btn
          kind={dark ? 'mint' : 'ink'}
          disabled={busy}
          style={{ flex: 1, height: 48 }}
          textStyle={{ fontSize: 15 }}
          icon={busy ? <ActivityIndicator color={dark ? SC.ink : '#fff'} /> : undefined}
          onPress={update}>
          Update location
        </Btn>
        <T
          accessibilityRole="button"
          onPress={() => userId && !busy && void snoozeLocationDrift(userId)}
          style={{ fontSize: 15, fontWeight: '600', opacity: busy ? 0.4 : 0.7, paddingVertical: 8 }}>
          Not now
        </T>
      </View>
    </View>
  );
}
