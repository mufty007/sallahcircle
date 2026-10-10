import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { OBHead } from '@/components/onboarding';
import { Btn, Field } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { sessionFromUrl, setNewPassword } from '@/lib/auth';
import { SC } from '@/theme/colors';

/** Opened from the password-reset email: signs in with the link, then asks for a new password. */
export default function ResetPasswordScreen() {
  const url = Linking.useLinkingURL();
  const [state, setState] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    sessionFromUrl(url)
      .then((ok) => setState(ok ? 'ready' : 'invalid'))
      .catch((e) => {
        setLinkError(e instanceof Error ? e.message : null);
        setState('invalid');
      });
  }, [url]);

  const valid = password.length >= 8 && password === confirm;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await setNewPassword(password);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t update your password.');
      setBusy(false);
    }
  };

  return (
    <Screen
      bg="onboard"
      footer={
        state === 'ready' ? (
          <>
            {error && <T style={{ color: SC.coral, fontSize: 14, textAlign: 'center' }}>{error}</T>}
            <Btn kind="mint" disabled={!valid || busy} style={{ opacity: valid ? 1 : 0.5 }} icon={busy ? <ActivityIndicator color={SC.ink} /> : undefined} onPress={save}>
              Save new password
            </Btn>
          </>
        ) : state === 'invalid' ? (
          <Btn kind="mint" onPress={() => router.replace('/sign-up')}>
            Back to sign in
          </Btn>
        ) : undefined
      }>
      <OBHead
        t={state === 'invalid' ? 'This link has expired' : 'Set a new password'}
        sub={state === 'invalid' ? (linkError ?? 'Reset links work once and expire after an hour. Ask for a new one from the sign-in screen.') : 'Choose something you haven’t used elsewhere.'}
      />
      {state === 'checking' && <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />}
      {state === 'ready' && (
        <View style={{ marginTop: 32, paddingHorizontal: 16, gap: 18 }}>
          <Field label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" textContentType="newPassword" />
          <Field
            label="Confirm"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            ok={valid}
            hint={confirm && password !== confirm ? 'Passwords don’t match' : undefined}
            returnKeyType="go"
            onSubmitEditing={() => valid && save()}
          />
        </View>
      )}
    </Screen>
  );
}
