import { router, type Href } from 'expo-router';
import { Alert, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { glass, hairline, Toggle, Tap } from '@/components/ui/primitives';
import { PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { usePeriodTheme } from '@/state/period-theme';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

type Item = { icon: IconName; label: string; sub: string; href?: Href; toggle?: { on: boolean; onChange: (v: boolean) => void } };

/** More tab — bottom-drawer style hub for secondary features. */
export default function MoreScreen() {
  const { profile, updateProfile } = useSession();
  const period = usePeriodTheme();
  const accent = period.active ? SC.pink : SC.mint;

  const setTraveling = async (v: boolean) => {
    try {
      await updateProfile({ traveling: v });
    } catch (e) {
      Alert.alert('Couldn’t save', e instanceof Error ? e.message : '');
    }
  };

  const items: Item[] = [
    { icon: 'user', label: 'Me', sub: 'Streak, heatmap, badges', href: '/me' },
    { icon: 'cal', label: 'Calendar', sub: 'Month view & day history', href: '/calendar' },
    { icon: 'beads', label: 'Tasbīḥ', sub: 'Dhikr counter', href: '/tasbih' },
    { icon: 'list', label: 'Qaḍāʾ', sub: 'Prayers and fasts to make up', href: '/qada' },
    { icon: 'plate', label: 'Fasting', sub: 'Suḥūr, ifṭār and your fasts', href: '/fasting' },
    { icon: 'pin', label: 'Masjids nearby', sub: 'Find a place to pray', href: '/masjids' },
    ...(profile?.track_excused
      ? [{ icon: 'moon' as const, label: 'Excused days', sub: 'Cycle history & care', href: '/excused' as Href }]
      : []),
    {
      icon: 'wave',
      label: 'I’m traveling',
      sub: 'Mark Dhuhr+Asr / Maghrib+Isha as jamʿ',
      toggle: { on: !!profile?.traveling, onChange: setTraveling },
    },
    { icon: 'gear', label: 'Settings', sub: 'Reminders, location, privacy', href: '/settings' },
  ];

  return (
    <Screen bg={period.active ? 'period-inner' : 'inner'} withTabBar>
      <PageTitle k="FEATURES" t="More" style={{ marginTop: 8 }} />
      <T style={{ marginHorizontal: 24, marginTop: 4, fontSize: 14, opacity: 0.6 }}>Everything else, one tap away.</T>

      <View style={[glass, { marginHorizontal: 16, marginTop: 18, paddingHorizontal: 16 }]}>
        {items.map((item, i) => (
          <Tap
            key={item.label}
            disabled={!!item.toggle}
            onPress={() => item.href && router.push(item.href)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 64,
              paddingVertical: 10,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: hairline(),
            }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: period.active ? 'rgba(245,163,199,0.18)' : 'rgba(135,232,191,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon n={item.icon} s={20} c={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 16, fontWeight: '600' }}>{item.label}</T>
              <T style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>{item.sub}</T>
            </View>
            {item.toggle ? <Toggle on={item.toggle.on} onChange={item.toggle.onChange} /> : <Icon n="chev" s={16} c="rgba(255,255,255,0.35)" />}
          </Tap>
        ))}
      </View>
    </Screen>
  );
}
