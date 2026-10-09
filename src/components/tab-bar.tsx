import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { InkContext, T } from '@/components/ui/text';
import { PERIODS } from '@/data/mock';
import { useAppState } from '@/state/app-state';
import { SC } from '@/theme/colors';

const ITEMS: Record<string, [IconName, string]> = {
  index: ['home', 'Today'],
  qibla: ['compass', 'Qibla'],
  circles: ['users', 'Circles'],
  board: ['trophy', 'Board'],
  me: ['user', 'Me'],
};

/** Floating glass pill tab bar from the design. Goes light on the daytime Today sky. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { period } = useAppState();
  const activeName = state.routes[state.index]?.name;
  const dark = activeName !== 'index' || PERIODS[period].dark;
  const bg = dark ? 'rgba(8,12,28,0.62)' : 'rgba(255,255,255,0.78)';
  const fg = dark ? 'rgba(255,255,255,0.7)' : 'rgba(11,18,32,0.6)';

  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 18),
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(11,18,32,0.06)',
      }}>
      <BlurView intensity={40} tint={dark ? 'dark' : 'light'} style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
          {state.routes.map((route, i) => {
            const item = ITEMS[route.name];
            if (!item) return null;
            const [icon, label] = item;
            const focused = i === state.index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };
            return (
              <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }}>
                <Animated.View
                  layout={LinearTransition.springify().damping(18)}
                  style={
                    focused
                      ? { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: SC.mint }
                      : { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }
                  }>
                  {focused ? (
                    <InkContext value={SC.ink}>
                      <Icon n={icon} s={20} w={2} />
                      <T style={{ fontWeight: '600', fontSize: 15 }}>{label}</T>
                    </InkContext>
                  ) : (
                    <>
                      <Icon n={icon} s={22} c={fg} />
                      {route.name === 'circles' && (
                        <View style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: SC.coral }} />
                      )}
                    </>
                  )}
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
