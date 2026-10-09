import { Stack } from 'expo-router';

import { SC } from '@/theme/colors';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: SC.navy } }} />;
}
