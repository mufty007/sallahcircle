import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { sessionFromUrl } from '@/lib/auth';
import { SC } from '@/theme/colors';

/**
 * Fallback for the OAuth deep link when the OS opens it as a route
 * instead of handing it back to the auth browser session.
 */
export default function AuthCallback() {
  const url = Linking.useLinkingURL();
  const [result, setResult] = useState<{ error?: string } | null>(null);

  useEffect(() => {
    if (!url) return;
    sessionFromUrl(url)
      .then(() => setResult({}))
      .catch((e) => setResult({ error: e instanceof Error ? e.message : 'Sign-in failed' }));
  }, [url]);

  if (result?.error) return <Redirect href={{ pathname: '/sign-up', params: { error: result.error } }} />;
  if (result) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: SC.navy, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={SC.mint} />
    </View>
  );
}
