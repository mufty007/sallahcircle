import { useWindowDimensions, View } from 'react-native';

import { Globe } from '@/components/globe';
import { OBHead, OBTop, useSetupNext } from '@/components/onboarding';
import { Icon } from '@/components/ui/icon';
import { Btn, glass } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { HOME_COORD } from '@/data/mock';
import { mintA, SC } from '@/theme/colors';

export default function SetupLocationScreen() {
  const next = useSetupNext();
  const { height } = useWindowDimensions();
  const size = Math.min(260, height * 0.3);

  return (
    <Screen
      bg="onboard"
      header={<OBTop step={2} />}
      footer={
        <>
          <Btn kind="mint" icon={<Icon n="pin" s={20} c={SC.ink} />} onPress={() => next('/setup-method')}>
            Use my location
          </Btn>
          <Btn kind="text" style={{ height: 40 }} textStyle={{ fontSize: 15, opacity: 0.8 }} onPress={() => next('/setup-method')}>
            Search for a city instead
          </Btn>
        </>
      }>
      <OBHead k="STEP 2 OF 5" t="Where do you pray?" sub="We use your location for accurate prayer times and Qibla. It never leaves your device." />
      <View style={{ alignSelf: 'center', marginTop: 24 }}>
        <Globe id="loc" center={HOME_COORD} tilt={12} size={size} pins={[HOME_COORD]} />
      </View>
      <View style={[glass, { marginHorizontal: 16, marginTop: 24, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: mintA(0.16), alignItems: 'center', justifyContent: 'center' }}>
          <Icon n="pin" s={20} c={SC.mint} />
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 16, fontWeight: '600' }}>Chicago, Illinois</T>
          <T style={{ fontSize: 13, opacity: 0.6 }}>41.88° N, 87.63° W · CDT</T>
        </View>
        <T style={{ fontSize: 14, color: SC.mint, fontWeight: '600' }}>Change</T>
      </View>
    </Screen>
  );
}
