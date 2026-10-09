import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppStateProvider } from '@/state/app-state';
import { SC } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: SC.navy, card: SC.navy, primary: SC.mint } };

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  const sheet = { presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } } as const;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: SC.navy }}>
      <ThemeProvider value={theme}>
        <AppStateProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: SC.navy } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(onboarding)" options={{ animation: 'fade' }} />
            <Stack.Screen name="log-prayer" options={sheet} />
            <Stack.Screen name="nudge/[id]" options={sheet} />
          </Stack>
        </AppStateProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
