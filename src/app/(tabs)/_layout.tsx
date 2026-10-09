import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useLiveSync } from '@/lib/live';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

export default function TabsLayout() {
  const { loading, session, profile, onboarded } = useSession();
  useLiveSync(onboarded ? session?.user.id : undefined, onboarded ? profile : null);
  if (loading) return null;
  if (!session) return <Redirect href="/welcome" />;
  if (!onboarded) return <Redirect href="/setup-name" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: SC.navy }, animation: 'fade' }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="qibla" options={{ title: 'Qibla' }} />
      <Tabs.Screen name="circles" options={{ title: 'Circles' }} />
      <Tabs.Screen name="board" options={{ title: 'Board' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
