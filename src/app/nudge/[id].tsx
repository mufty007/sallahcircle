import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Sheet, useCloseSheet } from '@/components/sheet';
import { Icon } from '@/components/ui/icon';
import { Av, Chip, Kicker, Tap } from '@/components/ui/primitives';
import { InkContext, T } from '@/components/ui/text';
import { DUAS, memberById, NUDGE_PRESETS } from '@/data/mock';
import { SC } from '@/theme/colors';

const card = { borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(11,18,32,0.06)', padding: 14 } as const;

export default function NudgeSheet() {
  return (
    <Sheet>
      <NudgeContent />
    </Sheet>
  );
}

function NudgeContent() {
  const close = useCloseSheet();
  const { id } = useLocalSearchParams<{ id: string; mode?: string }>();
  const m = memberById(id);
  const [preset, setPreset] = useState(0);
  const [dua, setDua] = useState<number | null>(null);
  const [together, setTogether] = useState(false);

  const send = close;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Av m={m} s={48} />
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }}>Nudge {m.name}</T>
          <T style={{ fontSize: 14, opacity: 0.6 }}>
            {m.next} in {m.nin} · it’s {m.local} for them
          </T>
        </View>
      </View>

      <Tap
        onPress={send}
        style={{ marginTop: 20, height: 60, borderRadius: 30, backgroundColor: SC.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Icon n="wave" s={22} c="#fff" />
        <T style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>{together ? 'Send invite' : dua !== null ? 'Send duʿāʾ' : 'Send a nudge'}</T>
      </Tap>

      <Kicker style={{ fontSize: 13, letterSpacing: 1, opacity: 0.5, marginTop: 22, marginBottom: 10 }}>QUICK MESSAGE</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {NUDGE_PRESETS.map((t, i) => (
          <Chip
            key={t}
            bg={i === preset ? SC.ink : '#fff'}
            c={i === preset ? '#fff' : SC.ink}
            style={{ height: 38, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(11,18,32,0.08)' }}
            textStyle={{ fontSize: 14 }}
            onPress={() => setPreset(i)}>
            {t}
          </Chip>
        ))}
      </View>

      <Kicker style={{ fontSize: 13, letterSpacing: 1, opacity: 0.5, marginTop: 22, marginBottom: 10 }}>SEND A DUʿĀʾ</Kicker>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {DUAS.map(([ar, en], i) => (
          <Tap key={en} onPress={() => setDua(dua === i ? null : i)} style={[card, { flex: 1 }, dua === i && { borderColor: SC.green, borderWidth: 1.5 }]}>
            <T style={{ fontSize: 20, writingDirection: 'rtl', textAlign: 'right', fontFamily: 'serif' }}>{ar}</T>
            <T style={{ fontSize: 13, opacity: 0.6, marginTop: 6, lineHeight: 17 }}>{en}</T>
          </Tap>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Tap style={[card, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SC.coral, alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="mic" s={20} c="#fff" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <T style={{ fontSize: 15, fontWeight: '600' }}>Voice note</T>
            <T style={{ fontSize: 12, opacity: 0.55 }}>Hold to record</T>
          </View>
        </Tap>
        <Tap
          onPress={() => setTogether((v) => !v)}
          style={[card, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SC.mint, borderColor: together ? SC.green : 'transparent', borderWidth: together ? 1.5 : 1 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SC.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="together" s={20} c="#fff" />
          </View>
          <InkContext value={SC.ink}>
            <View style={{ flexShrink: 1 }}>
              <T style={{ fontSize: 15, fontWeight: '600' }}>Pray together</T>
              <T style={{ fontSize: 12, opacity: 0.65 }}>Invite to jamāʿah</T>
            </View>
          </InkContext>
        </Tap>
      </View>
      <T style={{ fontSize: 12, opacity: 0.45, textAlign: 'center', marginTop: 16 }}>Nudges are limited to 2 per prayer, so they stay meaningful.</T>
    </>
  );
}
