import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { RoundBtn } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

/** Back button, 5-step progress bar and optional Skip. */
export function OBTop({ step, total = 5, skipTo }: { step: number; total?: number; skipTo?: Href }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 40 }}>
      <RoundBtn n="back" bg="rgba(255,255,255,0.08)" onPress={() => router.canGoBack() && router.back()} />
      <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? SC.mint : 'rgba(255,255,255,0.14)' }} />
        ))}
      </View>
      <T onPress={skipTo ? () => router.push(skipTo) : undefined} style={{ width: 40, fontSize: 15, opacity: skipTo ? 0.7 : 0, textAlign: 'right' }}>
        Skip
      </T>
    </View>
  );
}

export function OBHead({ k, t, sub, style }: { k?: string; t: string; sub?: string; style?: object }) {
  return (
    <View style={[{ paddingHorizontal: 24, marginTop: 24 }, style]}>
      {k && <T style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1.2, color: SC.mint, marginBottom: 10 }}>{k}</T>}
      <T style={{ fontSize: 36, fontWeight: '700', letterSpacing: -1.3, lineHeight: 38 }}>{t}</T>
      {sub && <T style={{ fontSize: 16, opacity: 0.65, marginTop: 10, lineHeight: 22 }}>{sub}</T>}
    </View>
  );
}

/**
 * Advance through setup. When these screens are opened from Settings
 * (user already onboarded) the primary button just returns.
 */
export function useSetupNext() {
  const { onboarded } = useSession();
  return (href: Href) => (onboarded ? router.back() : router.push(href));
}
