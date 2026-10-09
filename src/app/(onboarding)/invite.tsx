import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Share, View } from 'react-native';

import { OBHead } from '@/components/onboarding';
import { Icon } from '@/components/ui/icon';
import { Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { InkContext, T } from '@/components/ui/text';
import { useAsync } from '@/lib/prayer-times';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

export default function InviteScreen() {
  const { circle: circleId } = useLocalSearchParams<{ circle?: string }>();
  const { onboarded } = useSession();
  const [copied, setCopied] = useState(false);

  const circle = useAsync(circleId ? `circle:${circleId}` : null, async () => {
    const { data, error } = await supabase.from('circles').select('id, name, code').eq('id', circleId!).single();
    if (error) throw error;
    return data;
  });

  const code = circle.data?.code;
  const name = circle.data?.name ?? 'Your circle';
  // Deep link into the app's join screen; works once the app is installed.
  const link = code ? `sallahcircle://find-circle?code=${code}` : '';
  const message = code ? `Join my prayer circle “${name}” on Salah Circle. Invite code: ${code}\n${link}` : '';

  const done = () => (onboarded ? router.back() : router.push({ pathname: '/all-set', params: { circle: circleId } }));

  return (
    <Screen
      bg="onboard"
      header={
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, height: 40, justifyContent: 'center' }}>
          <T onPress={done} style={{ fontSize: 16, fontWeight: '600', color: SC.mint }}>
            Done
          </T>
        </View>
      }>
      <OBHead k={`${name.toUpperCase()} IS READY`} t="Invite your people" sub="Circles work best with 3–8 people you’ll actually nudge." style={{ marginTop: 8 }} />

      <View style={{ marginHorizontal: 16, marginTop: 28, borderRadius: 30, backgroundColor: SC.mint, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center' }}>
        <InkContext value={SC.ink}>
          <T style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1.2, opacity: 0.6 }}>INVITE CODE</T>
          {code ? (
            <T style={{ fontSize: 52, fontWeight: '700', letterSpacing: 8, marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>
              {code}
            </T>
          ) : (
            <View style={{ height: 70, justifyContent: 'center' }}>
              {circle.error ? <T style={{ fontSize: 14 }}>{circle.error}</T> : <ActivityIndicator color={SC.ink} />}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, alignSelf: 'stretch' }}>
            <Tap
              disabled={!code}
              onPress={() => Share.share({ message })}
              style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: 'rgba(11,18,32,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon n="share" s={18} />
              <T style={{ fontWeight: '600', fontSize: 15 }}>Share</T>
            </Tap>
            <Tap
              disabled={!code}
              onPress={async () => {
                await Clipboard.setStringAsync(code ?? '');
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: 'rgba(11,18,32,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon n={copied ? 'check' : 'copy'} s={18} />
              <T style={{ fontWeight: '600', fontSize: 15 }}>{copied ? 'Copied' : 'Copy code'}</T>
            </Tap>
          </View>
        </InkContext>
      </View>
      <T style={{ marginTop: 20, marginHorizontal: 32, textAlign: 'center', fontSize: 13, opacity: 0.55, lineHeight: 19 }}>
        Friends enter this code on the “Find your circle” step, or from Circles → Join with code.
      </T>
    </Screen>
  );
}
