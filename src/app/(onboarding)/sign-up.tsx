import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { OBHead } from '@/components/onboarding';
import { Btn, Field, RoundBtn } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { continueWithEmail, signInWithGoogle } from '@/lib/auth';
import { SC } from '@/theme/colors';

const AppleLogo = () => (
  <Svg width={18} height={20} viewBox="0 0 18 20">
    <Path
      d="M14.6 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM12.1 3c.7-.9 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"
      fill="#000"
    />
  </Svg>
);

type Busy = null | 'google' | 'email';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordOk = password.length >= 8;

  // The tabs layout decides whether to continue setup or go to Today.
  const done = () => router.replace('/');

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<unknown>) => {
    setBusy(kind);
    setError(null);
    try {
      const result = await fn();
      if (result !== false) done();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        bg="onboard"
        header={
          <View style={{ paddingHorizontal: 16 }}>
            <RoundBtn n="back" bg="rgba(255,255,255,0.08)" onPress={() => router.back()} />
          </View>
        }>
        <OBHead t="Create your account" sub="Your prayer log stays private. Your circle sees only what you share." />
        <View style={{ marginTop: 40, paddingHorizontal: 16, gap: 10 }}>
          {Platform.OS === 'ios' && (
            <Btn icon={<AppleLogo />} onPress={() => Alert.alert('Coming soon', 'Sign in with Apple will be available in a later build.')}>
              Continue with Apple
            </Btn>
          )}
          <Btn
            kind={Platform.OS === 'ios' ? 'ghost' : 'light'}
            disabled={!!busy}
            icon={busy === 'google' ? <ActivityIndicator color={Platform.OS === 'ios' ? '#fff' : SC.ink} /> : <T style={{ fontWeight: '800', fontSize: 18 }}>G</T>}
            onPress={() => run('google', signInWithGoogle)}>
            Continue with Google
          </Btn>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14, opacity: 0.45 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#fff' }} />
            <T style={{ fontSize: 13 }}>or</T>
            <View style={{ flex: 1, height: 1, backgroundColor: '#fff' }} />
          </View>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <View style={{ marginTop: 8 }}>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => emailOk && passwordOk && run('email', () => continueWithEmail(email.trim(), password))}
            />
          </View>
          {error && <T style={{ color: SC.coral, fontSize: 14, marginTop: 4 }}>{error}</T>}
          <Btn
            kind="mint"
            style={{ marginTop: 14, opacity: emailOk && passwordOk ? 1 : 0.5 }}
            disabled={!emailOk || !passwordOk || !!busy}
            icon={busy === 'email' ? <ActivityIndicator color={SC.ink} /> : undefined}
            onPress={() => run('email', () => continueWithEmail(email.trim(), password))}>
            Continue with email
          </Btn>
          <T style={{ fontSize: 12, opacity: 0.5, textAlign: 'center' }}>New here? We’ll create your account. Already joined? We’ll sign you in.</T>
        </View>
        <T style={{ marginTop: 32, marginHorizontal: 32, textAlign: 'center', fontSize: 12, opacity: 0.5, lineHeight: 18 }}>
          By continuing you agree to the Terms and Privacy Policy.
        </T>
      </Screen>
    </KeyboardAvoidingView>
  );
}
