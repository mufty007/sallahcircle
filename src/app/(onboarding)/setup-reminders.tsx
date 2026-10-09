import { useState } from 'react';
import { View } from 'react-native';

import { OBHead, OBTop, useSetupNext } from '@/components/onboarding';
import { Icon } from '@/components/ui/icon';
import { Btn, Chip, glass, hairline, Label, LocalToggle } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { REMINDERS } from '@/data/mock';
import { SC } from '@/theme/colors';

const HEADS_UP = ['Off', '5 min', '10 min', '15 min', '30 min'];
const SOUNDS = ['Adhān', 'Chime', 'Silent'];

export default function SetupRemindersScreen() {
  const next = useSetupNext();
  const [headsUp, setHeadsUp] = useState('10 min');
  const [sounds, setSounds] = useState(REMINDERS.map(([, , s]) => s));
  const cycleSound = (i: number) => setSounds((all) => all.map((s, k) => (k === i ? SOUNDS[(SOUNDS.indexOf(s) + 1) % SOUNDS.length] : s)));

  return (
    <Screen
      bg="onboard"
      header={<OBTop step={4} skipTo="/find-circle" />}
      footer={
        <Btn kind="mint" icon={<Icon n="bell" s={20} c={SC.ink} />} onPress={() => next('/find-circle')}>
          Allow notifications
        </Btn>
      }>
      <OBHead k="STEP 4 OF 5" t="When should we remind you?" />
      <View style={[glass, { marginHorizontal: 16, marginTop: 24, paddingVertical: 2, paddingHorizontal: 16 }]}>
        {REMINDERS.map(([n, t], i) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', height: 54, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
            <T style={{ flex: 1, fontSize: 16, fontWeight: '600' }}>
              {n}
              <T style={{ fontSize: 13, opacity: 0.5, fontWeight: '400' }}>{'  '}{t}</T>
            </T>
            <Chip style={{ height: 30, marginRight: 10 }} onPress={() => cycleSound(i)}>
              {sounds[i]}
              <Icon n="down" s={14} />
            </Chip>
            <LocalToggle />
          </View>
        ))}
      </View>

      <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
        <Label>Heads-up before each prayer</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {HEADS_UP.map((t) => (
            <Chip
              key={t}
              bg={t === headsUp ? SC.mint : 'rgba(255,255,255,0.07)'}
              c={t === headsUp ? SC.ink : '#fff'}
              style={{ height: 40, flex: 1, justifyContent: 'center', paddingHorizontal: 0 }}
              textStyle={{ fontSize: 14 }}
              onPress={() => setHeadsUp(t)}>
              {t}
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
        <LocalToggle />
      </View>
    </Screen>
  );
}
