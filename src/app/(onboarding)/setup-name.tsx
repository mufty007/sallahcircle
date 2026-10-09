import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { OBHead, OBTop, useSetupNext } from '@/components/onboarding';
import { Av, Btn, Field } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { useAsync } from '@/lib/prayer-times';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { AVATAR_COLORS, SC } from '@/theme/colors';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const suggestUsername = (name: string, email?: string) =>
  (name || email?.split('@')[0] || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);

export default function SetupNameScreen() {
  const next = useSetupNext();
  const { profile, session, updateProfile } = useSession();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? suggestUsername(profile?.display_name ?? '', session?.user.email));
  const [color, setColor] = useState<string>(profile?.avatar_color ?? AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = username.replace(/^@/, '').toLowerCase();

  // Debounced availability check (the user's own current username counts as available).
  const valid = USERNAME_RE.test(handle);
  const check = useAsync(valid ? `username:${handle}` : null, async () => {
    await new Promise((r) => setTimeout(r, 400));
    const { data, error: e } = await supabase.rpc('username_available', { name: handle });
    if (e) throw e;
    return data;
  });
  const availability: Availability = !valid
    ? 'invalid'
    : check.loading
      ? 'checking'
      : check.error
        ? 'idle'
        : check.data
          ? 'available'
          : 'taken';

  const canContinue = !!name.trim() && availability === 'available' && !saving;
  const hint =
    availability === 'invalid'
      ? '3–20 letters, numbers or _'
      : availability === 'checking'
        ? 'Checking…'
        : availability === 'taken'
          ? 'Already taken'
          : availability === 'available'
            ? 'Available'
            : undefined;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ display_name: name.trim(), username: handle, avatar_color: color });
      next('/setup-location');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        bg="onboard"
        header={<OBTop step={1} />}
        footer={
          <>
            {error && <T style={{ color: SC.coral, fontSize: 14, textAlign: 'center' }}>{error}</T>}
            <Btn
              kind="mint"
              disabled={!canContinue}
              style={{ opacity: canContinue ? 1 : 0.5 }}
              icon={saving ? <ActivityIndicator color={SC.ink} /> : undefined}
              onPress={save}>
              Continue
            </Btn>
          </>
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
                accessibilityState={{ selected: c === color }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, boxShadow: c === color ? '0 0 0 3px #141A3E, 0 0 0 5px #fff' : undefined }}
              />
            ))}
          </View>
        </View>
        <View style={{ marginTop: 32, paddingHorizontal: 16, gap: 18 }}>
          <Field label="Name" value={name} onChangeText={setName} autoComplete="name" maxLength={40} />
          <Field
            label="Username"
            value={`@${handle}`}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={21}
            ok={availability === 'available'}
            hint={hint}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
