import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import { Sheet, useCloseSheet } from '@/components/sheet';
import { Icon } from '@/components/ui/icon';
import { revealFocusedInput } from '@/components/ui/keyboard';
import { Btn, Tap, Toggle } from '@/components/ui/primitives';
import { T } from '@/components/ui/text';
import { fileReport, REPORT_REASONS, setBlocked, type ReportReason } from '@/lib/data';
import { FONT, SC } from '@/theme/colors';

export default function ReportSheet() {
  return (
    <Sheet>
      <ReportContent />
    </Sheet>
  );
}

function ReportContent() {
  const close = useCloseSheet();
  const { user, circle, nudge, name } = useLocalSearchParams<{ user?: string; circle?: string; nudge?: string; name?: string }>();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(!!user);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      await fileReport({ targetUser: user, targetCircle: circle, nudgeId: nudge, reason, details });
      if (user && alsoBlock) await setBlocked(user, true);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send the report.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: SC.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon n="check" s={30} c={SC.ink} w={2.4} />
        </View>
        <T style={{ fontSize: 22, fontWeight: '700' }}>Thanks for telling us</T>
        <T style={{ fontSize: 14, opacity: 0.6, textAlign: 'center', lineHeight: 20 }}>
          We review every report{user && alsoBlock ? `. ${name ?? 'They'} can’t nudge you any more and you won’t see their nudges.` : '.'}
        </T>
        <Btn kind="ink" style={{ marginTop: 10, alignSelf: 'stretch' }} onPress={close}>
          Done
        </Btn>
      </View>
    );
  }

  return (
    <>
      <T style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, opacity: 0.5 }}>REPORT</T>
      <T style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.6, marginTop: 4 }}>{`What’s wrong with ${name ?? (circle ? 'this circle' : 'this')}?`}</T>
      <View style={{ marginTop: 16, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(11,18,32,0.07)', paddingHorizontal: 16 }}>
        {REPORT_REASONS.map((r, i) => (
          <Tap
            key={r.value}
            onPress={() => setReason(r.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: reason === r.value }}
            style={{ flexDirection: 'row', alignItems: 'center', height: 50, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(11,18,32,0.06)' }}>
            <T style={{ flex: 1, fontSize: 15 }}>{r.label}</T>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: reason === r.value ? SC.green : 'rgba(11,18,32,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              {reason === r.value && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: SC.green }} />}
            </View>
          </Tap>
        ))}
      </View>
      <TextInput
        value={details}
        onChangeText={setDetails}
        onFocus={revealFocusedInput}
        placeholder="Anything else we should know? (optional)"
        placeholderTextColor="rgba(11,18,32,0.4)"
        multiline
        maxLength={500}
        style={{ marginTop: 12, minHeight: 70, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(11,18,32,0.07)', padding: 14, fontSize: 15, fontFamily: FONT[400], color: SC.ink, textAlignVertical: 'top' }}
      />
      {user && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 15, fontWeight: '600' }}>{`Also block ${name ?? 'them'}`}</T>
            <T style={{ fontSize: 12, opacity: 0.55 }}>They can’t nudge you and their nudges are hidden</T>
          </View>
          <Toggle on={alsoBlock} onChange={setAlsoBlock} light />
        </View>
      )}
      {error && <T style={{ color: SC.coral, fontSize: 14, marginTop: 12, textAlign: 'center' }}>{error}</T>}
      <Btn kind="ink" disabled={!reason || busy} style={{ marginTop: 16, opacity: reason ? 1 : 0.5 }} icon={busy ? <ActivityIndicator color="#fff" /> : undefined} onPress={submit}>
        Send report
      </Btn>
    </>
  );
}
