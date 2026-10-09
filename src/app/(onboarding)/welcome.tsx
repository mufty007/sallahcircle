import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, type ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrbitDial } from '@/components/orbit-dial';
import { Background } from '@/components/ui/background';
import { Icon } from '@/components/ui/icon';
import { Av, Btn, Dots, Stars } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { MEMBERS, PERIODS } from '@/data/mock';
import { mintA, SC, type Period } from '@/theme/colors';

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const go = (i: number) => ref.current?.scrollTo({ x: i * width, animated: true });

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}>
        <Page sky="isha" stars={60} i={0}
          art={<IntroDial />}
          title={'Five prayers.\nOne circle.'}
          titleSize={50}
          body="Keep each other on time, wherever in the world you are."
          primary={['Get started', () => go(1)]}
          secondary={['I have an invite code', () => router.push('/sign-up')]}
        />
        <Page sky="fajr" stars={30} i={1}
          art={<UpNextCards />}
          title={'See who’s\nup next.'}
          body="Every member’s next prayer, in their own city and time zone."
          primary={['Continue', () => go(2)]}
        />
        <Page sky="maghrib" i={2}
          art={<NudgeBubbles />}
          title={'Nudge with\ncare.'}
          body="Gentle reminders, a duʿāʾ, or an invite to pray together. Two per prayer at most."
          primary={['Create account', () => router.push('/sign-up')]}
          secondary={['I already have an account', () => router.push('/sign-up')]}
        />
      </ScrollView>
    </View>
  );
}

function Page({
  sky,
  stars,
  art,
  title,
  titleSize = 46,
  body,
  primary,
  secondary,
  i,
}: {
  sky: Period;
  stars?: number;
  art: ReactNode;
  title: string;
  titleSize?: number;
  body: string;
  primary: [string, () => void];
  secondary?: [string, () => void];
  i: number;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ width, height }}>
      <Background kind={sky} />
      {stars && <Stars n={stars} h={i === 0 ? 560 : 300} />}
      <View style={{ flex: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 18 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>{art}</View>
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <T style={{ fontSize: titleSize, fontWeight: '700', letterSpacing: -1.8, lineHeight: titleSize * 1.02 }}>{title}</T>
          <T style={{ fontSize: 17, opacity: 0.8, marginTop: 14, lineHeight: 24 }}>{body}</T>
        </View>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Dots i={i} />
          <Btn onPress={primary[1]}>{primary[0]}</Btn>
          {secondary ? (
            <Btn kind="text" style={{ height: 40 }} textStyle={{ fontSize: 15, opacity: 0.85 }} onPress={secondary[1]}>
              {secondary[0]}
            </Btn>
          ) : (
            <View style={{ height: 40 }} />
          )}
        </View>
      </View>
    </View>
  );
}

function IntroDial() {
  const { width } = useWindowDimensions();
  const size = Math.min(340, width - 40);
  return (
    <View style={{ alignSelf: 'center' }}>
      <OrbitDial now={PERIODS.isha.now} dark queue={PERIODS.maghrib.queue} size={size} showLabels={false} />
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: SC.mint, boxShadow: `0 0 0 14px ${mintA(0.14)}` }} />
      </View>
    </View>
  );
}

function UpNextCards() {
  const cards: [(typeof MEMBERS)[number], string, string, string][] = [
    [MEMBERS[1], 'Maghrib', '7m', 'Chicago · 8:59 PM'],
    [MEMBERS[2], 'Fajr', '14m', 'London · 2:59 AM'],
    [MEMBERS[3], 'Isha', '31m', 'Toronto · 9:59 PM'],
  ];
  return (
    <View style={{ paddingHorizontal: 28, gap: 12 }}>
      {cards.map(([m, p, t, s], i) => {
        const light = i === 0;
        const ink = light ? SC.ink : '#fff';
        return (
          <View
            key={m.id}
            style={{
              height: 84,
              borderRadius: 26,
              backgroundColor: light ? 'rgba(255,255,255,0.92)' : 'rgba(10,15,40,0.45)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              transform: [{ translateX: i * 14 }, { scale: 1 - i * 0.03 }],
              opacity: 1 - i * 0.15,
            }}>
            <Av m={m} s={44} />
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 17, fontWeight: '700', color: ink }}>{m.name}</T>
              <T style={{ fontSize: 13, opacity: 0.6, color: ink }}>{s}</T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.8, color: ink }}>{t}</T>
              <T style={{ fontSize: 12, opacity: 0.6, color: ink }}>{p}</T>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function NudgeBubbles() {
  const bubble = { maxWidth: 260, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 22 } as const;
  return (
    <View style={{ paddingHorizontal: 24, gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Av m={MEMBERS[1]} s={40} style={{ marginTop: 8 }} />
        <View style={{ gap: 10, flexShrink: 1 }}>
          <View style={[bubble, { backgroundColor: 'rgba(255,255,255,0.92)', borderBottomLeftRadius: 6 }]}>
            <T style={{ fontSize: 15, fontWeight: '500', color: SC.ink }}>Maghrib in 7m. Let’s go, akhi</T>
            <T style={{ fontSize: 12, opacity: 0.55, marginTop: 3, color: SC.ink }}>Abdullahi · nudge</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 26, borderBottomLeftRadius: 6, backgroundColor: 'rgba(255,255,255,0.92)', alignSelf: 'flex-start' }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: SC.coral, alignItems: 'center', justifyContent: 'center' }}>
              <Icon n="mic" s={16} c="#fff" />
            </View>
            <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
              {[6, 12, 18, 10, 16, 22, 12, 8, 14, 18, 9, 5, 12, 16].map((h, i) => (
                <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: SC.ink, opacity: 0.7 }} />
              ))}
            </View>
            <T style={{ fontSize: 13, opacity: 0.6, color: SC.ink }}>0:08</T>
          </View>
        </View>
      </View>
      <View style={[bubble, { backgroundColor: SC.mint, borderBottomRightRadius: 6, alignSelf: 'flex-end', alignItems: 'flex-end' }]}>
        <T style={{ fontSize: 17, color: SC.ink, fontFamily: 'serif' }}>بارك الله فيك</T>
        <T style={{ fontSize: 12, opacity: 0.55, marginTop: 3, color: SC.ink }}>JazākAllāhu khayran, I’m praying now</T>
      </View>
      <View style={{ height: 64, borderRadius: 22, backgroundColor: 'rgba(10,15,40,0.5)', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
        <Icon n="together" s={22} c={SC.mint} />
        <T style={{ flex: 1, fontSize: 15 }}>
          <T style={{ fontWeight: '700' }}>Yusuf</T> invited you to pray Isha together
        </T>
      </View>
    </View>
  );
}
