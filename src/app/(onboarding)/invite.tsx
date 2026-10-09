import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { OBHead } from '@/components/onboarding';
import { Icon } from '@/components/ui/icon';
import { Av, glass, hairline, Kicker, Tap } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { InkContext, T } from '@/components/ui/text';
import { CONTACTS, MY_CIRCLE } from '@/data/mock';
import { useAppState } from '@/state/app-state';
import { SC } from '@/theme/colors';

export default function InviteScreen() {
  const { name = MY_CIRCLE.name } = useLocalSearchParams<{ name?: string }>();
  const { onboarded } = useAppState();
  const [invited, setInvited] = useState<Record<string, boolean>>({ [CONTACTS[0][0]]: true });
  const [copied, setCopied] = useState(false);
  const code = MY_CIRCLE.code;
  const link = `https://salahcircle.app/join/${code}`;

  return (
    <Screen
      bg="onboard"
      header={
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, height: 40, justifyContent: 'center' }}>
          <T onPress={() => (onboarded ? router.back() : router.push('/all-set'))} style={{ fontSize: 16, fontWeight: '600', color: SC.mint }}>
            Done
          </T>
        </View>
      }>
      <OBHead k={`${name.toUpperCase()} IS READY`} t="Invite your people" sub="Circles work best with 3–8 people you’ll actually nudge." style={{ marginTop: 8 }} />

      <View style={{ marginHorizontal: 16, marginTop: 28, borderRadius: 30, backgroundColor: SC.mint, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center' }}>
        <InkContext value={SC.ink}>
          <T style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1.2, opacity: 0.6 }}>INVITE CODE</T>
          <T style={{ fontSize: 52, fontWeight: '700', letterSpacing: 8, marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>
            {code}
          </T>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, alignSelf: 'stretch' }}>
            <Tap
              onPress={() => Share.share({ message: `Join my prayer circle “${name}” on Salah Circle: ${link}` })}
              style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: 'rgba(11,18,32,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon n="share" s={18} />
              <T style={{ fontWeight: '600', fontSize: 15 }}>Share</T>
            </Tap>
            <Tap
              onPress={async () => {
                await Clipboard.setStringAsync(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: 'rgba(11,18,32,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon n={copied ? 'check' : 'copy'} s={18} />
              <T style={{ fontWeight: '600', fontSize: 15 }}>{copied ? 'Copied' : 'Copy link'}</T>
            </Tap>
          </View>
        </InkContext>
      </View>

      <Kicker style={{ marginTop: 26, marginHorizontal: 24 }}>FROM YOUR CONTACTS</Kicker>
      <View style={[glass, { marginHorizontal: 16, marginTop: 10, paddingVertical: 2, paddingHorizontal: 16 }]}>
        {CONTACTS.map(([n, init, color], k) => {
          const done = invited[n];
          return (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 60, borderTopWidth: k ? 1 : 0, borderTopColor: hairline() }}>
              <Av m={{ init, color }} s={38} />
              <T style={{ flex: 1, fontSize: 16, fontWeight: '600' }}>{n}</T>
              <Tap
                disabled={done}
                onPress={() => setInvited((s) => ({ ...s, [n]: true }))}
                style={{
                  height: 34,
                  paddingHorizontal: 16,
                  borderRadius: 17,
                  backgroundColor: done ? 'transparent' : '#fff',
                  borderWidth: done ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.25)',
                  justifyContent: 'center',
                }}>
                <T style={{ fontSize: 14, fontWeight: '600', color: done ? '#fff' : SC.ink }}>{done ? 'Invited' : 'Invite'}</T>
              </Tap>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
