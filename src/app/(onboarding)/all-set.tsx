import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { OrbitDial } from '@/components/orbit-dial';
import { Av, Btn } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { MEMBERS, PERIODS } from '@/data/mock';
import { useAppState } from '@/state/app-state';

export default function AllSetScreen() {
  const { setOnboarded, setPeriod } = useAppState();
  const { width } = useWindowDimensions();
  const size = Math.min(340, width - 40);
  const p = PERIODS.maghrib;

  return (
    <Screen
      bg="maghrib"
      footer={
        <Btn
          onPress={() => {
            setPeriod('maghrib');
            setOnboarded(true);
            router.dismissAll();
            router.replace('/');
          }}>
          Go to Today
        </Btn>
      }>
      <View style={{ alignSelf: 'center', marginTop: 24 }}>
        <OrbitDial now={p.now} dark queue={p.queue} size={size} />
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Av m={MEMBERS[0]} s={76} style={{ boxShadow: '0 0 0 6px rgba(255,255,255,0.18)' }} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <T style={{ fontSize: 15, fontWeight: '600', opacity: 0.8, letterSpacing: 0.4 }}>Bismillāh</T>
        <T style={{ fontSize: 46, fontWeight: '700', letterSpacing: -1.8, lineHeight: 47, marginTop: 4 }}>You’re in the circle.</T>
        <T style={{ fontSize: 17, opacity: 0.85, marginTop: 14, lineHeight: 24 }}>Maghrib is in 7 minutes. Abdullahi is up next with you.</T>
      </View>
    </Screen>
  );
}
