import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Btn } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { joinCircle } from '@/lib/data';
import { savePendingInvite } from '@/lib/invite';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const clean = (c?: string) => (c ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);

/** Invite link: sallahcircle://join/ABC123 */
export default function JoinScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = clean(raw);
  const { loading, session, onboarded } = useSession();
  const [error, setError] = useState<string | null>(null);

  const ready = !loading && !!session && onboarded && code.length === 6;
  useEffect(() => {
    if (!ready) return;
    let live = true;
    joinCircle(code)
      .then((id) => live && router.replace({ pathname: '/circle/[id]', params: { id } }))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Couldn’t join this circle.'));
    return () => {
      live = false;
    };
  }, [ready, code]);

  useEffect(() => {
    if (!loading && (!session || !onboarded) && code.length === 6) savePendingInvite(code);
  }, [loading, session, onboarded, code]);

  if (loading) return <Centered />;
  if (!session) return <Redirect href="/welcome" />;
  if (!onboarded) return <Redirect href="/setup-name" />;
  if (code.length !== 6) return <Redirect href="/circles" />;
  if (error) {
    return (
      <Centered>
        <T style={{ fontSize: 20, fontWeight: '700', textAlign: 'center' }}>That invite didn’t work</T>
        <T style={{ fontSize: 14, opacity: 0.65, textAlign: 'center', marginTop: 6 }}>{error}</T>
        <Btn kind="mint" style={{ marginTop: 20, alignSelf: 'stretch' }} onPress={() => router.replace('/circles')}>
          Go to Circles
        </Btn>
      </Centered>
    );
  }
  return <Centered />;
}

function Centered({ children }: { children?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: SC.navy, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {children ?? <ActivityIndicator color={SC.mint} />}
    </View>
  );
}
