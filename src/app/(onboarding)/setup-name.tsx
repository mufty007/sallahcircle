import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { OBHead, OBTop, useSetupNext } from '@/components/onboarding';
import { Av, Btn, Field } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { AVATAR_COLORS } from '@/theme/colors';

const TAKEN = ['admin', 'abdullahi', 'zainab'];

export default function SetupNameScreen() {
  const next = useSetupNext();
  const [name, setName] = useState('Muhammad');
  const [username, setUsername] = useState('mtomas');
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const handle = username.replace(/^@/, '').toLowerCase();
  const ok = handle.length >= 3 && !TAKEN.includes(handle);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        bg="onboard"
        header={<OBTop step={1} />}
        footer={
          <Btn kind="mint" disabled={!ok || !name.trim()} style={{ opacity: ok && name.trim() ? 1 : 0.5 }} onPress={() => next('/setup-location')}>
            Continue
          </Btn>
        }>
        <OBHead k="STEP 1 OF 5" t="What should your circle call you?" />
        <View style={{ alignItems: 'center', gap: 16, marginTop: 28 }}>
          <Av m={{ init: (name.trim()[0] ?? '?').toUpperCase(), color }} s={96} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {AVATAR_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityLabel="Avatar colour"
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, boxShadow: c === color ? '0 0 0 3px #141A3E, 0 0 0 5px #fff' : undefined }}
              />
            ))}
          </View>
        </View>
        <View style={{ marginTop: 32, paddingHorizontal: 16, gap: 18 }}>
          <Field label="Name" value={name} onChangeText={setName} autoComplete="name" />
          <Field
            label="Username"
            value={`@${handle}`}
            onChangeText={(t) => setUsername(t)}
            autoCapitalize="none"
            ok={ok}
            hint={handle.length < 3 ? 'At least 3 characters' : ok ? 'Available' : 'Already taken'}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
