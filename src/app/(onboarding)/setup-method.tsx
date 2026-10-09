import { useState } from 'react';
import { View } from 'react-native';

import { OBHead, OBTop, useSetupNext } from '@/components/onboarding';
import { Btn, Label, Segmented, Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { CALC_METHODS } from '@/data/mock';
import { mintA, SC } from '@/theme/colors';

export default function SetupMethodScreen() {
  const next = useSetupNext();
  const [method, setMethod] = useState(CALC_METHODS[0].name);
  const [asr, setAsr] = useState<'standard' | 'hanafi'>('standard');

  return (
    <Screen bg="onboard" header={<OBTop step={3} />} footer={<Btn kind="mint" onPress={() => next('/setup-reminders')}>Continue</Btn>}>
      <OBHead k="STEP 3 OF 5" t="How should we calculate times?" />
      <View style={{ marginTop: 24, paddingHorizontal: 16, gap: 8 }}>
        {CALC_METHODS.map((m, i) => {
          const on = m.name === method;
          return (
            <Tap
              key={m.name}
              onPress={() => setMethod(m.name)}
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
                <T style={{ fontSize: 16, fontWeight: '600' }}>
                  {m.name}
                  {i === 0 && <T style={{ fontSize: 11, color: SC.mint, letterSpacing: 0.8 }}>{'  '}SUGGESTED</T>}
                </T>
                <T style={{ fontSize: 12, opacity: 0.55 }}>{m.sub}</T>
              </View>
              <T style={{ textAlign: 'right', fontSize: 12, opacity: 0.75, lineHeight: 18 }}>
                Fajr {m.fajr}
                {'\n'}Isha {m.isha}
              </T>
            </Tap>
          );
        })}
        <T style={{ fontSize: 14, opacity: 0.6, textAlign: 'center', paddingVertical: 4 }}>+ 6 more methods</T>
      </View>
      <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
        <Label>Asr time</Label>
        <Segmented
          value={asr}
          onChange={setAsr}
          options={[
            { value: 'standard', label: 'Standard', sub: '5:01 PM' },
            { value: 'hanafi', label: 'Ḥanafī', sub: '6:08 PM' },
          ]}
        />
        <T style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>Shāfiʿī, Mālikī, Ḥanbalī use Standard.</T>
      </View>
    </Screen>
  );
}
