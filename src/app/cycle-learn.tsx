import { View } from 'react-native';

import { glass } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { CYCLE_EDUCATION } from '@/data/cycle-education';
import { usePeriodTheme } from '@/state/period-theme';
import { SC } from '@/theme/colors';

export default function CycleLearnScreen() {
  const period = usePeriodTheme();
  return (
    <Screen bg={period.active ? 'period-inner' : 'inner'} header={<BackBar />}>
      <PageTitle k="PRIVATE · NOT MEDICAL ADVICE" t="Learn" style={{ marginTop: 16 }} />
      <T style={{ marginHorizontal: 24, marginTop: 8, fontSize: 14, opacity: 0.65, lineHeight: 20 }}>
        Short notes to support rest and clarity. For personal rulings, ask a scholar you trust.
      </T>
      <View style={{ marginHorizontal: 16, marginTop: 18, gap: 12 }}>
        {CYCLE_EDUCATION.map((a) => (
          <View key={a.id} style={[glass, { padding: 18 }]}>
            <T style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: period.active ? SC.pink : SC.mint }}>{a.kicker}</T>
            <T style={{ fontSize: 20, fontWeight: '700', marginTop: 6 }}>{a.title}</T>
            {a.body.map((p, i) => (
              <T key={i} style={{ fontSize: 14, opacity: 0.72, marginTop: i ? 10 : 12, lineHeight: 21 }}>
                {p}
              </T>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
