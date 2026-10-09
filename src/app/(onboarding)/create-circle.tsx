import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Btn, Chip, Field, glass, hairline, Label, RoundBtn, Segmented, Toggle } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { AVATAR_COLORS, SC } from '@/theme/colors';

const COLORS = AVATAR_COLORS.slice(0, 5);
const FOCUS = ['All five prayers', 'Fajr', 'Jumuʿah', 'Qurʾān daily'];

export default function CreateCircleScreen() {
  const [name, setName] = useState('Fam');
  const [color, setColor] = useState<string>(COLORS[0]);
  const [privacy, setPrivacy] = useState<'invite' | 'public'>('invite');
  const [focus, setFocus] = useState(FOCUS[0]);
  const [board, setBoard] = useState(true);
  const [nudges, setNudges] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setSaving(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('circles')
      .insert({ name: name.trim(), color, visibility: privacy === 'public' ? 'public' : 'private', focus, leaderboard_enabled: board, nudges_enabled: nudges })
      .select('id')
      .single();
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    router.push({ pathname: '/invite', params: { circle: data.id } });
  };

  const rows: [string, string, boolean, (v: boolean) => void][] = [
    ['Weekly leaderboard', 'Friendly ranking, resets each Sunday', board, setBoard],
    ['Nudges between members', 'Up to 2 per prayer', nudges, setNudges],
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        bg="onboard"
        header={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 40 }}>
            <RoundBtn n="back" bg="rgba(255,255,255,0.08)" onPress={() => router.back()} />
            <T style={{ fontSize: 16, fontWeight: '600' }}>New circle</T>
            <View style={{ width: 40 }} />
          </View>
        }
        footer={
          <>
            {error && <T style={{ color: SC.coral, fontSize: 14, textAlign: 'center' }}>{error}</T>}
            <Btn
              kind="mint"
              disabled={!name.trim() || saving}
              style={{ opacity: name.trim() ? 1 : 0.5 }}
              icon={saving ? <ActivityIndicator color={SC.ink} /> : undefined}
              onPress={create}>
              Create circle
            </Btn>
          </>
        }>
        <View style={{ marginTop: 24, paddingHorizontal: 16, gap: 22 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end' }}>
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ color: SC.ink, fontSize: 32, fontWeight: '700' }}>{(name.trim()[0] ?? '?').toUpperCase()}</T>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Circle name" value={name} onChangeText={setName} maxLength={32} />
            </View>
          </View>

          <View>
            <Label>Colour</Label>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, boxShadow: c === color ? '0 0 0 3px #141A3E, 0 0 0 5px #fff' : undefined }}
                />
              ))}
            </View>
          </View>

          <View>
            <Label>Who can join</Label>
            <Segmented
              value={privacy}
              onChange={setPrivacy}
              options={[
                { value: 'invite', label: 'Invite only' },
                { value: 'public', label: 'Public' },
              ]}
            />
          </View>

          <View>
            <Label>Focus</Label>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {FOCUS.map((t) => (
                <Chip
                  key={t}
                  bg={t === focus ? SC.mint : 'rgba(255,255,255,0.07)'}
                  c={t === focus ? SC.ink : '#fff'}
                  style={{ height: 40, paddingHorizontal: 16 }}
                  textStyle={{ fontSize: 14 }}
                  onPress={() => setFocus(t)}>
                  {t}
                </Chip>
              ))}
            </View>
          </View>

          <View style={[glass, { paddingHorizontal: 16 }]}>
            {rows.map(([t, s, on, set], i) => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', height: 66, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 16, fontWeight: '600' }}>{t}</T>
                  <T style={{ fontSize: 12, opacity: 0.55 }}>{s}</T>
                </View>
                <Toggle on={on} onChange={set} />
              </View>
            ))}
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
