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
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!url) return;
    sessionFromUrl(url)
      .catch((e) => console.warn('OAuth callback failed', e))
      .finally(() => setDone(true));
  }, [url]);

  if (done) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: SC.navy, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={SC.mint} />
    </View>
  );
}
