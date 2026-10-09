import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Sheet, useCloseSheet } from '@/components/sheet';
import { Icon } from '@/components/ui/icon';
import { Av, Chip, Kicker, Tap } from '@/components/ui/primitives';
import { InkContext, T } from '@/components/ui/text';
import { DUAS } from '@/data/mock';
import { loadMemberSchedules, shortIn, useMyCircles, useNow, useQuery } from '@/lib/data';
import { formatTime, PRAYER_LABEL } from '@/lib/prayer-times';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

const card = { borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(11,18,32,0.06)', padding: 14 } as const;

export default function NudgeSheet() {
  return (
    <Sheet>
      <NudgeContent />
    </Sheet>
  );
}

function NudgeContent() {
  const close = useCloseSheet();
  const { id, circle: circleId, mode } = useLocalSearchParams<{ id: string; circle?: string; mode?: string }>();
  const { session } = useSession();
  const circles = useMyCircles(session?.user.id);
  const circle = circles.data?.find((c) => c.id === circleId) ?? circles.data?.find((c) => c.members.some((m) => m.id === id));
  const m = circle?.members.find((x) => x.id === id);
  const sched = useQuery(m ? `sched:${m.id}` : null, () => loadMemberSchedules([m!]));
  const s = sched.data?.[0];

  const now = useNow(30_000);
  const [preset, setPreset] = useState(0);
  const [dua, setDua] = useState<number | null>(mode === 'dua' ? 0 : null);
  const [together, setTogether] = useState(mode === 'together');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!m || !circle) {
    return <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>{circles.loading ? <ActivityIndicator color={SC.ink} /> : <T>Member not found.</T>}</View>;
  }

  const nextName = s ? PRAYER_LABEL[s.next] : 'Prayer';
  const inText = s ? shortIn(s.at.getTime() - now.getTime()) : '';
  const presets = [`${nextName}${inText ? ` in ${inText}` : ''} — let’s go`, 'Pray with me?', 'Don’t let it slip', 'Making wuḍūʾ now'];

  const send = async () => {
    if (!s) return;
    setSending(true);
    setError(null);
    const kind = together ? 'together' : dua !== null ? 'dua' : 'nudge';
    const message = together ? `Pray ${nextName} together?` : dua !== null ? `${DUAS[dua][0]} — ${DUAS[dua][1]}` : presets[preset];
    const { error: e } = await supabase.from('nudges').insert({ circle_id: circle.id, to_user: m.id, kind, prayer: s.next, prayer_date: s.prayerDate, message });
    setSending(false);
    if (e) {
      setError(/limit/i.test(e.message) ? `You’ve already nudged ${m.name} twice for ${nextName}.` : e.message);
      return;
    }
    close();
  };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Av m={m} s={48} />
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }} numberOfLines={1}>
            Nudge {m.name}
          </T>
          <T style={{ fontSize: 14, opacity: 0.6 }}>
            {s ? `${nextName} in ${inText} · it’s ${formatTime(now, m.timezone, true)} for them` : m.place ? 'Loading their prayer time…' : 'They haven’t set a location yet'}
          </T>
        </View>
      </View>

      <Tap
        onPress={send}
        disabled={!s || sending}
        style={{ marginTop: 20, height: 60, borderRadius: 30, backgroundColor: SC.green, opacity: s ? 1 : 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {sending ? <ActivityIndicator color="#fff" /> : <Icon n="wave" s={22} c="#fff" />}
        <T style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>{together ? 'Send invite' : dua !== null ? 'Send duʿāʾ' : 'Send a nudge'}</T>
      </Tap>
      {error && <T style={{ color: SC.coral, fontSize: 14, marginTop: 10, textAlign: 'center' }}>{error}</T>}

      <Kicker style={{ fontSize: 13, letterSpacing: 1, opacity: 0.5, marginTop: 22, marginBottom: 10 }}>QUICK MESSAGE</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {presets.map((t, i) => {
          const on = i === preset && dua === null && !together;
          return (
            <Chip
              key={t}
              bg={on ? SC.ink : '#fff'}
              c={on ? '#fff' : SC.ink}
              style={{ height: 38, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(11,18,32,0.08)' }}
              textStyle={{ fontSize: 14 }}
              onPress={() => {
                setPreset(i);
                setDua(null);
                setTogether(false);
              }}>
              {t}
            </Chip>
          );
        })}
      </View>

      <Kicker style={{ fontSize: 13, letterSpacing: 1, opacity: 0.5, marginTop: 22, marginBottom: 10 }}>SEND A DUʿĀʾ</Kicker>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {DUAS.map(([ar, en], i) => (
          <Tap
            key={en}
            onPress={() => {
              setDua(dua === i ? null : i);
              setTogether(false);
            }}
            style={[card, { flex: 1 }, dua === i && { borderColor: SC.green, borderWidth: 1.5 }]}>
            <T style={{ fontSize: 20, writingDirection: 'rtl', textAlign: 'right', fontFamily: 'serif' }}>{ar}</T>
            <T style={{ fontSize: 13, opacity: 0.6, marginTop: 6, lineHeight: 17 }}>{en}</T>
          </Tap>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <View style={[card, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.5 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SC.coral, alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="mic" s={20} c="#fff" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <T style={{ fontSize: 15, fontWeight: '600' }}>Voice note</T>
            <T style={{ fontSize: 12, opacity: 0.55 }}>Coming soon</T>
          </View>
        </View>
        <Tap
          onPress={() => {
            setTogether((v) => !v);
            setDua(null);
          }}
          style={[card, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SC.mint, borderColor: together ? SC.green : 'transparent', borderWidth: together ? 1.5 : 1 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SC.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="together" s={20} c="#fff" />
          </View>
          <InkContext value={SC.ink}>
            <View style={{ flexShrink: 1 }}>
              <T style={{ fontSize: 15, fontWeight: '600' }}>Pray together</T>
              <T style={{ fontSize: 12, opacity: 0.65 }}>Invite to jamāʿah</T>
            </View>
          </InkContext>
        </Tap>
      </View>
      <T style={{ fontSize: 12, opacity: 0.45, textAlign: 'center', marginTop: 16 }}>Nudges are limited to 2 per prayer, so they stay meaningful.</T>
    </>
  );
}
