import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useAppState } from '@/state/app-state';
import { SC } from '@/theme/colors';

export default function TabsLayout() {
  const { onboarded } = useAppState();
  // Until auth is wired up, every fresh launch starts with onboarding.
  if (!onboarded) return <Redirect href="/welcome" />;

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
