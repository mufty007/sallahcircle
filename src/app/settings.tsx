import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { glass, hairline, Kicker, LocalToggle, Tap } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { useSession } from '@/state/session';

type Row = { label: string; value?: string; toggle?: boolean; href?: Href };

const GROUPS: [string, Row[]][] = [
  [
    'PRAYER TIMES',
    [
      { label: 'Location', value: 'Chicago, IL', href: '/setup-location' },
      { label: 'Calculation', value: 'ISNA', href: '/setup-method' },
      { label: 'Asr', value: 'Standard', href: '/setup-method' },
      { label: 'Manual adjustments', value: 'Off' },
      { label: 'High-latitude rule', value: 'Angle-based' },
    ],
  ],
  [
    'REMINDERS',
    [
      { label: 'Adhān & sounds', value: 'Fajr, Maghrib', href: '/setup-reminders' },
      { label: 'Heads-up', value: '10 min before', href: '/setup-reminders' },
      { label: 'Nudges from circles', toggle: true },
      { label: 'Quiet hours', value: '11 PM – 3:30 AM' },
    ],
  ],
  [
    'APPEARANCE & PRIVACY',
    [
      { label: 'Theme', value: 'Follow the sky' },
      { label: 'Who sees my log', value: 'My circles' },
    ],
  ],
];

export default function SettingsScreen() {
  const { signOut } = useSession();
  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle t="Settings" style={{ marginTop: 16 }} />
      <View style={{ marginHorizontal: 16, marginTop: 20, gap: 16 }}>
        {GROUPS.map(([title, rows]) => (
          <View key={title}>
            <Kicker style={{ opacity: 0.5, marginHorizontal: 8, marginBottom: 8 }}>{title}</Kicker>
            <View style={[glass, { paddingHorizontal: 16 }]}>
              {rows.map((r, i) => (
                <Tap
                  key={r.label}
                  disabled={r.toggle || !r.href}
                  onPress={() => r.href && router.push(r.href)}
                  style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
                  <T style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>
                    {r.label}
                  </T>
                  {r.toggle ? (
                    <LocalToggle />
                  ) : (
                    <>
                      <T style={{ opacity: 0.55, fontSize: 15 }}>{r.value}</T>
                      <Icon n="chev" s={16} c="rgba(255,255,255,0.35)" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </Tap>
              ))}
            </View>
          </View>
        ))}
        <Tap onPress={async () => {
            await signOut();
            router.dismissAll();
            router.replace('/welcome');
          }} style={[glass, { height: 50, alignItems: 'center', justifyContent: 'center' }]}>
          <T style={{ fontSize: 15, fontWeight: '600', color: '#F07F77' }}>Sign out</T>
        </Tap>
      </View>
    </Screen>
  );
}
