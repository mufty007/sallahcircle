import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Chip, Ring, Tap } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { SC } from '@/theme/colors';

type Phrase = { ar: string; en: string; target: number };
type Mode = 'after' | 'free';

/** The dhikr after every farḍ prayer: 33 + 33 + 34 = 100. */
const AFTER_PRAYER: Phrase[] = [
  { ar: 'سُبْحَانَ اللّٰه', en: 'SubḥānAllāh', target: 33 },
  { ar: 'اَلْحَمْدُ لِلّٰه', en: 'Alḥamdulillāh', target: 33 },
  { ar: 'اَللّٰهُ أَكْبَر', en: 'Allāhu Akbar', target: 34 },
];
const FREE: Phrase[] = [{ ar: 'أَسْتَغْفِرُ اللّٰه', en: 'Free count', target: 100 }];

type Saved = { mode: Mode; phase: number; count: number; total: number; day: string };
const KEY = 'tasbih:v1';
const todayKey = () => new Date().toDateString();

const tick = (style: 'light' | 'heavy' | 'done') => {
  if (Platform.OS === 'web') return;
  if (style === 'done') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(style === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export default function TasbihScreen() {
  const [mode, setMode] = useState<Mode>('after');
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Restore today's progress (per device; nothing leaves the phone).
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const s = raw ? (JSON.parse(raw) as Saved) : null;
        if (s && s.day === todayKey()) {
          setMode(s.mode);
          setPhase(s.phase);
          setCount(s.count);
          setTotal(s.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const s: Saved = { mode, phase, count, total, day: todayKey() };
    AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  }, [loaded, mode, phase, count, total]);

  const phrases = mode === 'after' ? AFTER_PRAYER : FREE;
  const p = phrases[Math.min(phase, phrases.length - 1)];
  const finished = mode === 'after' && phase >= phrases.length;

  const tap = () => {
    if (finished) return;
    const n = count + 1;
    setTotal((t) => t + 1);
    if (n < p.target || mode === 'free') {
      setCount(n);
      tick(mode === 'free' && n % p.target === 0 ? 'done' : 'light');
      return;
    }
    // Set complete: move to the next phrase.
    const last = phase === phrases.length - 1;
    tick(last ? 'done' : 'heavy');
    setPhase(phase + 1);
    setCount(0);
  };

  const reset = () => {
    setPhase(0);
    setCount(0);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  const pct = finished ? 1 : mode === 'free' ? (count % p.target) / p.target : count / p.target;

  return (
    <Screen bg="navy" header={<BackBar right={<Tap onPress={reset} accessibilityLabel="Reset" style={{ padding: 8 }}><Icon n="redo" s={20} c="rgba(255,255,255,0.7)" /></Tap>} />} scroll={false}>
      <PageTitle k={`TODAY · ${total}`} t="Tasbīḥ" style={{ marginTop: 16 }} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 }}>
        {(
          [
            ['after', 'After prayer · 33/33/34'],
            ['free', 'Free count'],
          ] as const
        ).map(([m, label]) => (
          <Chip key={m} bg={m === mode ? '#fff' : 'rgba(255,255,255,0.08)'} c={m === mode ? SC.ink : '#fff'} style={{ height: 36 }} textStyle={{ fontSize: 14 }} onPress={() => switchMode(m)}>
            {label}
          </Chip>
        ))}
      </View>

      <Tap onPress={tap} accessibilityLabel="Count" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
        {finished ? (
          <View style={{ alignItems: 'center', gap: 10 }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: SC.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon n="check" s={56} c={SC.ink} w={2.4} />
            </View>
            <T style={{ fontSize: 24, fontWeight: '700', marginTop: 10 }}>100 · done</T>
            <T style={{ fontSize: 14, opacity: 0.6, textAlign: 'center', marginHorizontal: 40 }}>Lā ilāha illallāhu waḥdahu lā sharīka lah…</T>
            <Chip style={{ height: 40, marginTop: 12 }} onPress={reset}>
              Start again
            </Chip>
          </View>
        ) : (
          <>
            <T style={{ fontSize: 34, writingDirection: 'rtl', fontFamily: 'serif', marginBottom: 4 }}>{p.ar}</T>
            <T style={{ fontSize: 16, opacity: 0.7, marginBottom: 24 }}>{p.en}</T>
            <Ring pct={pct} size={260} stroke={10} label={String(count)} labelSize={72} />
            <T style={{ fontSize: 14, opacity: 0.55, marginTop: 18 }}>
              {mode === 'after' ? `Set ${phase + 1} of 3 · ${p.target - count} to go` : `Round of ${p.target}`}
            </T>
          </>
        )}
      </Tap>
      <T style={{ textAlign: 'center', fontSize: 12, opacity: 0.4, marginBottom: 24 }}>Tap anywhere to count</T>
    </Screen>
  );
}
