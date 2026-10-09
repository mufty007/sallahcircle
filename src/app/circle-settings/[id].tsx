import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Av, Btn, Chip, Field, glass, hairline, Kicker, Label, Segmented, Tap, Toggle } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { deleteCircle, removeMember, resetCircleCode, updateCircle, useMyCircles, type Circle } from '@/lib/data';
import { useSession } from '@/state/session';
import { AVATAR_COLORS, SC } from '@/theme/colors';

const COLORS = AVATAR_COLORS.slice(0, 5);
const FOCUS = ['All five prayers', 'Fajr', 'Jumuʿah', 'Qurʾān daily'];

/** Ask before something that can't be undone. Resolves true if confirmed. */
function confirm(title: string, message: string, action: string) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

const leaveToCircles = () => {
  router.dismissAll();
  router.replace('/circles');
};

export default function CircleSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const circles = useMyCircles(session?.user.id);
  const c = circles.data?.find((x) => x.id === id);

  if (!c) {
    return (
      <Screen bg="navy" header={<BackBar />}>
        <View style={{ marginTop: 80, alignItems: 'center' }}>
          {circles.loading ? <ActivityIndicator color="#fff" /> : <T style={{ opacity: 0.7 }}>This circle isn’t available.</T>}
        </View>
      </Screen>
    );
  }
  const isOwner = c.createdBy === session?.user.id;
  return isOwner ? <OwnerSettings key={c.id} c={c} /> : <MemberSettings c={c} me={session!.user.id} />;
}

function MemberSettings({ c, me }: { c: Circle; me: string }) {
  const [busy, setBusy] = useState(false);
  const owner = c.members.find((m) => m.id === c.createdBy);

  const leave = async () => {
    if (!(await confirm(`Leave ${c.name}?`, 'You can rejoin later with an invite code.', 'Leave'))) return;
    setBusy(true);
    try {
      await removeMember(c.id, me);
      leaveToCircles();
    } catch (e) {
      Alert.alert('Couldn’t leave', e instanceof Error ? e.message : '');
      setBusy(false);
    }
  };

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle k="CIRCLE" t={c.name} style={{ marginTop: 16 }} />
      <View style={[glass, { marginHorizontal: 16, marginTop: 20, paddingHorizontal: 16 }]}>
        {[
          ['Owner', owner?.name ?? '—'],
          ['Members', String(c.members.length)],
          ['Who can join', c.visibility === 'public' ? 'Public' : 'Invite only'],
          ['Focus', c.focus],
          ['Leaderboard', c.leaderboardEnabled ? 'On' : 'Off'],
          ['Nudges', c.nudgesEnabled ? 'On' : 'Off'],
        ].map(([k, v], i) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
            <T style={{ flex: 1, fontSize: 15 }}>{k}</T>
            <T style={{ fontSize: 15, opacity: 0.55 }}>{v}</T>
          </View>
        ))}
      </View>
      {!!c.description && <T style={{ marginHorizontal: 24, marginTop: 14, fontSize: 14, opacity: 0.6, lineHeight: 20 }}>{c.description}</T>}
      <Tap onPress={leave} disabled={busy} style={[glass, { marginHorizontal: 16, marginTop: 20, height: 50, alignItems: 'center', justifyContent: 'center' }]}>
        {busy ? <ActivityIndicator color={SC.coral} /> : <T style={{ fontSize: 15, fontWeight: '600', color: SC.coral }}>Leave circle</T>}
      </Tap>
    </Screen>
  );
}

function OwnerSettings({ c }: { c: Circle }) {
  const [name, setName] = useState(c.name);
  const [description, setDescription] = useState(c.description ?? '');
  const [color, setColor] = useState(c.color);
  const [visibility, setVisibility] = useState(c.visibility);
  const [focus, setFocus] = useState(c.focus);
  const [board, setBoard] = useState(c.leaderboardEnabled);
  const [nudges, setNudges] = useState(c.nudgesEnabled);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const others = c.members.filter((m) => !m.you);
  const dirty =
    name.trim() !== c.name ||
    (description.trim() || null) !== c.description ||
    color !== c.color ||
    visibility !== c.visibility ||
    focus !== c.focus ||
    board !== c.leaderboardEnabled ||
    nudges !== c.nudgesEnabled;

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    run('save', () =>
      updateCircle(c.id, {
        name: name.trim(),
        description: description.trim() || null,
        color,
        visibility,
        focus,
        leaderboard_enabled: board,
        nudges_enabled: nudges,
      }),
    );

  const resetCode = async () => {
    if (!(await confirm('Reset invite code?', `Code ${c.code} will stop working. People already in the circle stay.`, 'Reset'))) return;
    run('code', () => resetCircleCode(c.id));
  };

  const remove = async (memberId: string, memberName: string) => {
    if (!(await confirm(`Remove ${memberName}?`, 'They’ll lose access to this circle. Reset the invite code if you don’t want them rejoining.', 'Remove'))) return;
    run(`rm:${memberId}`, () => removeMember(c.id, memberId));
  };

  const leave = async () => {
    const msg = others.length ? 'Ownership passes to the member who joined earliest.' : 'You’re the only member, so the circle will be deleted.';
    if (!(await confirm(`Leave ${c.name}?`, msg, 'Leave'))) return;
    setBusy('leave');
    try {
      await removeMember(c.id, c.createdBy);
      leaveToCircles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t leave.');
      setBusy(null);
    }
  };

  const destroy = async () => {
    if (!(await confirm(`Delete ${c.name}?`, 'This removes the circle for everyone, including its nudges. It can’t be undone.', 'Delete'))) return;
    setBusy('delete');
    try {
      await deleteCircle(c.id);
      leaveToCircles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t delete.');
      setBusy(null);
    }
  };

  const toggles: [string, string, boolean, (v: boolean) => void][] = [
    ['Weekly leaderboard', 'Friendly ranking, resets each Sunday', board, setBoard],
    ['Nudges between members', 'Up to 2 per prayer', nudges, setNudges],
  ];

  return (
    <>
      <Screen
        bg="navy"
        header={<BackBar />}
        footer={
          dirty ? (
            <Btn kind="mint" disabled={!name.trim() || busy === 'save'} icon={busy === 'save' ? <ActivityIndicator color={SC.ink} /> : undefined} onPress={save}>
              Save changes
            </Btn>
          ) : undefined
        }>
        <PageTitle k="CIRCLE SETTINGS" t={c.name} style={{ marginTop: 16 }} />
        {error && <T style={{ color: SC.coral, fontSize: 14, marginTop: 10, marginHorizontal: 24 }}>{error}</T>}

        <View style={{ marginTop: 20, paddingHorizontal: 16, gap: 22 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end' }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ color: SC.ink, fontSize: 28, fontWeight: '700' }}>{(name.trim()[0] ?? '?').toUpperCase()}</T>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Circle name" value={name} onChangeText={setName} maxLength={32} />
            </View>
          </View>

          <View>
            <Label>Colour</Label>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {COLORS.map((x) => (
                <Pressable
                  key={x}
                  onPress={() => setColor(x)}
                  accessibilityLabel={`Colour ${x}`}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: x, boxShadow: x === color ? '0 0 0 3px #0B1220, 0 0 0 5px #fff' : undefined }}
                />
              ))}
            </View>
          </View>

          <View>
            <Label>Who can join</Label>
            <Segmented
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'private', label: 'Invite only' },
                { value: 'public', label: 'Public' },
              ]}
            />
          </View>
          {visibility === 'public' && (
            <Field label="Description (shown on Discover)" value={description} onChangeText={setDescription} placeholder="What is this circle about?" maxLength={200} />
          )}

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
            {toggles.map(([t, s, on, set], i) => (
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

        <Kicker style={{ marginTop: 26, marginHorizontal: 24, marginBottom: 8 }}>INVITE CODE</Kicker>
        <View style={[glass, { marginHorizontal: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', height: 60, gap: 10 }]}>
          <T style={{ flex: 1, fontSize: 22, fontWeight: '700', letterSpacing: 3 }}>{c.code}</T>
          <Chip
            style={{ height: 34 }}
            textStyle={{ fontSize: 13 }}
            onPress={async () => {
              await Clipboard.setStringAsync(c.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}>
            {copied ? 'Copied' : 'Copy'}
            <Icon n={copied ? 'check' : 'copy'} s={14} />
          </Chip>
          <Chip style={{ height: 34 }} textStyle={{ fontSize: 13 }} onPress={resetCode}>
            {busy === 'code' ? <ActivityIndicator size="small" color="#fff" /> : 'Reset'}
          </Chip>
        </View>

        <Kicker style={{ marginTop: 26, marginHorizontal: 24, marginBottom: 8 }}>{`MEMBERS · ${c.members.length}`}</Kicker>
        <View style={[glass, { marginHorizontal: 16, paddingHorizontal: 16 }]}>
          {c.members.map((m, i) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
              <Av m={m} s={32} />
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                  {m.you ? 'You' : m.name}
                </T>
                <T style={{ fontSize: 12, opacity: 0.5 }}>{m.id === c.createdBy ? 'Owner' : m.username ? `@${m.username}` : 'Member'}</T>
              </View>
              {!m.you && (
                <Tap onPress={() => remove(m.id, m.name)} disabled={!!busy} style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(240,127,119,0.4)', justifyContent: 'center' }}>
                  {busy === `rm:${m.id}` ? <ActivityIndicator size="small" color={SC.coral} /> : <T style={{ fontSize: 13, fontWeight: '600', color: SC.coral }}>Remove</T>}
                </Tap>
              )}
            </View>
          ))}
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 26, gap: 10 }}>
          <Tap onPress={leave} disabled={!!busy} style={[glass, { height: 50, alignItems: 'center', justifyContent: 'center' }]}>
            {busy === 'leave' ? <ActivityIndicator color="#fff" /> : <T style={{ fontSize: 15, fontWeight: '600' }}>Leave circle</T>}
          </Tap>
          <Tap onPress={destroy} disabled={!!busy} style={[glass, { height: 50, alignItems: 'center', justifyContent: 'center' }]}>
            {busy === 'delete' ? <ActivityIndicator color={SC.coral} /> : <T style={{ fontSize: 15, fontWeight: '600', color: SC.coral }}>Delete circle</T>}
          </Tap>
        </View>
      </Screen>
    </>
  );
}
