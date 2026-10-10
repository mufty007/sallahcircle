import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, monospacedDigit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

/** All data arrives through props; the widget runtime can't fetch or import anything. */
export type NextPrayerProps = {
  /** Next prayer name and its time (ms since epoch), plus the one after for the medium size. */
  name: string;
  at: number;
  timeLabel: string;
  thenName: string;
  thenLabel: string;
  city: string;
};

const NextPrayerWidget = (props: NextPrayerProps, env: WidgetEnvironment) => {
  'widget';
  const MINT = '#8FE3C0';
  const NAVY = '#141A3E';
  const dim = '#FFFFFFAA';
  if (!props.name) {
    return (
      <VStack modifiers={[containerBackground(NAVY, 'widget')]}>
        <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>Open Salah Circle</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(dim)]}>to load prayer times</Text>
      </VStack>
    );
  }
  if (env.widgetFamily === 'accessoryRectangular' || env.widgetFamily === 'accessoryInline') {
    return (
      <VStack alignment="leading">
        <Text modifiers={[font({ size: 14, weight: 'bold' })]}>{`${props.name} ${props.timeLabel}`}</Text>
        <Text date={new Date(props.at)} dateStyle="timer" modifiers={[font({ size: 13 }), monospacedDigit()]} />
      </VStack>
    );
  }
  const small = env.widgetFamily !== 'systemMedium';
  return (
    <HStack modifiers={[containerBackground(NAVY, 'widget')]}>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(dim)]}>{props.city ? props.city.toUpperCase() : 'NEXT PRAYER'}</Text>
        <Text modifiers={[font({ size: small ? 26 : 30, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props.name}</Text>
        <Text date={new Date(props.at)} dateStyle="timer" modifiers={[font({ size: small ? 22 : 26, weight: 'semibold' }), monospacedDigit(), foregroundStyle(MINT)]} />
        <Text modifiers={[font({ size: 12 }), foregroundStyle(dim)]}>{`Adhān ${props.timeLabel}`}</Text>
      </VStack>
      {!small && <Spacer />}
      {!small && (
        <VStack alignment="trailing" modifiers={[padding({ leading: 8 })]}>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(dim)]}>THEN</Text>
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>{props.thenName}</Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(dim)]}>{props.thenLabel}</Text>
        </VStack>
      )}
    </HStack>
  );
};

export default createWidget('NextPrayer', NextPrayerWidget);
