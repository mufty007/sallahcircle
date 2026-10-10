import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { OBHead, OBTop } from '@/components/onboarding';
import { Icon, type IconName } from '@/components/ui/icon';
import { Btn, Label, Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { invalidate } from '@/lib/data';
import { takePendingInvite } from '@/lib/invite';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { mintA, SC } from '@/theme/colors';

const LEN = 6;

export default function FindCircleScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState((params.code ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6));
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);
  const complete = code.length === LEN;
  const { onboarded } = useSession();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Code from an invite link opened before signing up.
  useEffect(() => {
    if (params.code) return;
    takePendingInvite().then((c) => c && setCode(c));
  }, [params.code]);

  const join = async () => {
    setJoining(true);
    setError(null);
    const { data, error: e } = await supabase.rpc('join_circle', { invite_code: code });
    setJoining(false);
    if (e) {
      setError(e.code === 'P0002' ? 'No circle found for that code. Check it and try again.' : e.message);
      return;
    }
    invalidate();
    if (onboarded) router.replace({ pathname: '/circle/[id]', params: { id: data } });
    else router.push({ pathname: '/all-set', params: { circle: data } });
  };

  const options: [IconName, string, string, () => void][] = [
    ['plus', 'Create a circle', 'For family, friends or your MSA', () => router.push('/create-circle')],
    // Public circles live on the Circles tab, which needs setup to be finished first.
    ...(onboarded ? [['compass', 'Browse public circles', 'Open circles anyone can join', () => router.push('/circles')] as [IconName, string, string, () => void]] : []),
  ];

  return (
    <Screen
      bg="onboard"
      header={<OBTop step={5} skipTo="/all-set" />}
      footer={
        <>
          {error && <T style={{ color: SC.coral, fontSize: 14, textAlign: 'center' }}>{error}</T>}
          <Btn
            kind={complete ? 'mint' : 'ghost'}
            disabled={!complete || joining}
            style={{ opacity: complete ? 1 : 0.5 }}
            icon={joining ? <ActivityIndicator color={SC.ink} /> : undefined}
            onPress={join}>
            Join circle
          </Btn>
        </>
      }>
      <OBHead k="STEP 5 OF 5" t="Find your circle" sub="Join friends with a code, or start one of your own." />
      <View style={{ marginTop: 28, paddingHorizontal: 16 }}>
        <Label>Invite code</Label>
        <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: 'row', gap: 8 }}>
          {Array.from({ length: LEN }).map((_, i) => {
            const active = focused && i === Math.min(code.length, LEN - 1);
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 62,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderWidth: 1.5,
                  borderColor: active ? SC.mint : 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <T style={{ fontSize: 26, fontWeight: '700' }}>{code[i] ?? ''}</T>
              </View>
            );
          })}
        </Pressable>
        {/* Hidden input drives the six boxes. */}
        <TextInput
          ref={input}
          value={code}
          onChangeText={(t) => {
            setError(null);
            setCode(t.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, LEN));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={LEN}
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        />
      </View>

      <View style={{ marginTop: 40, paddingHorizontal: 16, gap: 10 }}>
        {options.map(([ic, t, s, onPress], i) => (
          <Tap
            key={t}
            onPress={onPress}
            style={{
              height: 92,
              borderRadius: 26,
              backgroundColor: i ? 'rgba(255,255,255,0.05)' : mintA(0.1),
              borderWidth: 1,
              borderColor: i ? 'rgba(255,255,255,0.07)' : mintA(0.4),
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingHorizontal: 18,
            }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: i ? 'rgba(255,255,255,0.1)' : SC.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon n={ic} s={22} c={i ? '#fff' : SC.ink} w={2} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 17, fontWeight: '600' }}>{t}</T>
              <T style={{ fontSize: 13, opacity: 0.6 }}>{s}</T>
            </View>
            <Icon n="chev" s={18} c="rgba(255,255,255,0.5)" />
          </Tap>
        ))}
      </View>
    </Screen>
  );
}
