import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';

import { Background } from '@/components/ui/background';
import { Icon } from '@/components/ui/icon';
import { Av, Chip, glass, hairline, Kicker, Stars, Tap } from '@/components/ui/primitives';
import { PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { joinCircle, useMyCircles, usePublicCircles, type PublicCircle } from '@/lib/data';
import { useSession } from '@/state/session';
import { FONT, SC } from '@/theme/colors';

const FILTERS = ['All', 'All five prayers', 'Fajr', 'Jumuʿah', 'Qurʾān daily'];
const CODE_RE = /^[A-Z2-9]{6}$/;

export default function DiscoverScreen() {
  const { session } = useSession();
  const mine = useMyCircles(session?.user.id);
  const pub = usePublicCircles(!!session);
  const [filter, setFilter] = useState(FILTERS[0]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const q = query.trim();
  const asCode = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const list = (pub.data ?? []).filter((c) => (filter === 'All' || c.focus === filter) && c.name.toLowerCase().includes(q.toLowerCase()));
  const featured = !q && filter === 'All' ? list[0] : undefined;
  const rest = featured ? list.slice(1) : list;

  const join = async (key: string, code: string) => {
    setBusy(key);
    setError(null);
    try {
      const id = await joinCircle(code);
      router.push({ pathname: '/circle/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen bg="navy" withTabBar>
      <PageTitle
        t="Circles"
        style={{ marginTop: 8 }}
        right={
          <Tap
            onPress={() => router.push('/create-circle')}
            accessibilityLabel="Create a circle"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: SC.mint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="plus" s={22} w={2.2} c={SC.ink} />
          </Tap>
        }
      />

      <View style={{ marginHorizontal: 16, marginTop: 22, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 }}>
        <Icon n="search" s={20} c="rgba(255,255,255,0.6)" />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setError(null);
          }}
          placeholder="Search circles or enter an invite code"
          placeholderTextColor="rgba(255,255,255,0.45)"
          selectionColor={SC.mint}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, height: '100%', color: '#fff', fontSize: 15, fontFamily: FONT[400] }}
        />
      </View>
      {CODE_RE.test(asCode) && (
        <Tap
          onPress={() => join('code', asCode)}
          style={{ marginHorizontal: 16, marginTop: 10, height: 48, borderRadius: 24, backgroundColor: SC.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {busy === 'code' ? <ActivityIndicator color={SC.ink} /> : <Icon n="plus" s={18} c={SC.ink} w={2.2} />}
          <T style={{ color: SC.ink, fontWeight: '600', fontSize: 15 }}>Join circle with code {asCode}</T>
        </Tap>
      )}
      {error && <T style={{ color: SC.coral, fontSize: 14, marginTop: 10, marginHorizontal: 24 }}>{error}</T>}

      <Kicker style={{ marginTop: 22, marginHorizontal: 24, marginBottom: 8 }}>YOUR CIRCLES</Kicker>
      {mine.data?.length ? (
        <View style={{ marginHorizontal: 16, gap: 8 }}>
          {mine.data.map((c) => {
            const others = c.members.filter((m) => !m.you);
            return (
              <Tap
                key={c.id}
                onPress={() => router.push({ pathname: '/circle/[id]', params: { id: c.id } })}
                style={[glass, { paddingHorizontal: 16, height: 74, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ color: SC.ink, fontWeight: '700', fontSize: 17 }}>{c.name[0]?.toUpperCase()}</T>
                </View>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                    {c.name}
                  </T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={{ flexDirection: 'row' }}>
                      {others.slice(0, 4).map((m, i) => (
                        <Av key={m.id} m={m} s={18} style={{ marginLeft: i ? -5 : 0, borderWidth: 1.5, borderColor: SC.navy }} />
                      ))}
                    </View>
                    <T style={{ fontSize: 12, opacity: 0.55 }}>
                      {c.members.length} member{c.members.length === 1 ? '' : 's'} · {c.code}
                    </T>
                  </View>
                </View>
                <Icon n="chev" s={18} c="rgba(255,255,255,0.4)" />
              </Tap>
            );
          })}
        </View>
      ) : (
        <Tap onPress={() => router.push('/find-circle')} style={[glass, { marginHorizontal: 16, padding: 16 }]}>
          <T style={{ fontSize: 15, fontWeight: '600' }}>{mine.loading ? 'Loading…' : 'You’re not in a circle yet'}</T>
          {!mine.loading && <T style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Enter an invite code above, or create one with +</T>}
        </Tap>
      )}

      <Kicker style={{ marginTop: 26, marginHorizontal: 24, marginBottom: 10 }}>DISCOVER PUBLIC CIRCLES</Kicker>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={{ flexGrow: 0 }}>
        {FILTERS.map((t) => (
          <Chip key={t} bg={t === filter ? '#fff' : 'rgba(255,255,255,0.08)'} c={t === filter ? SC.ink : '#fff'} style={{ height: 36 }} textStyle={{ fontSize: 14 }} onPress={() => setFilter(t)}>
            {t}
          </Chip>
        ))}
      </ScrollView>

      {pub.loading && <ActivityIndicator style={{ marginTop: 24 }} color="#fff" />}

      {featured && <Featured c={featured} busy={busy === featured.id} onJoin={() => join(featured.id, featured.code)} />}

      {rest.length > 0 && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 14, paddingVertical: 4, paddingHorizontal: 16 }]}>
          {rest.map((c, i) => (
            <Tap
              key={c.id}
              onPress={() => router.push({ pathname: '/public-circle/[id]', params: { id: c.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 66, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
                <T style={{ color: SC.ink, fontWeight: '700', fontSize: 17 }}>{c.name[0]?.toUpperCase()}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                  {c.name}
                </T>
                <T style={{ fontSize: 12, opacity: 0.55 }} numberOfLines={1}>
                  {c.memberCount} member{c.memberCount === 1 ? '' : 's'} · {c.focus}
                </T>
              </View>
              <JoinPill joined={c.joined} busy={busy === c.id} onPress={() => (c.joined ? router.push({ pathname: '/circle/[id]', params: { id: c.id } }) : join(c.id, c.code))} />
            </Tap>
          ))}
        </View>
      )}
      {!pub.loading && list.length === 0 && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 14, padding: 16 }]}>
          <T style={{ fontSize: 15, fontWeight: '600' }}>{q || filter !== 'All' ? 'No public circles match' : 'No public circles yet'}</T>
          <T style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Create one and set “Who can join” to Public so others can find it.</T>
        </View>
      )}
    </Screen>
  );
}

function JoinPill({ joined, busy, onPress }: { joined: boolean; busy: boolean; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      disabled={busy}
      style={{
        height: 34,
        minWidth: 64,
        paddingHorizontal: 14,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: joined ? SC.mint : 'rgba(255,255,255,0.25)',
        backgroundColor: joined ? SC.mint : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {busy ? <ActivityIndicator size="small" color="#fff" /> : <T style={{ fontSize: 14, fontWeight: '600', color: joined ? SC.ink : '#fff' }}>{joined ? 'Open' : 'Join'}</T>}
    </Tap>
  );
}

function Featured({ c, busy, onJoin }: { c: PublicCircle; busy: boolean; onJoin: () => void }) {
  return (
    <Tap onPress={() => router.push({ pathname: '/public-circle/[id]', params: { id: c.id } })} style={{ marginHorizontal: 16, marginTop: 14, height: 196, borderRadius: 30, overflow: 'hidden', padding: 20 }}>
      <Background kind="fajr" />
      <Stars n={14} h={100} />
      <Chip bg="rgba(255,255,255,0.18)" style={{ height: 26 }} textStyle={{ fontSize: 12 }}>
        {`Featured · ${c.focus}`}
      </Chip>
      <T style={{ fontSize: 32, fontWeight: '700', letterSpacing: -1, marginTop: 12 }} numberOfLines={1}>
        {c.name}
      </T>
      {!!c.description && (
        <T style={{ fontSize: 14, opacity: 0.8, marginTop: 2 }} numberOfLines={2}>
          {c.description}
        </T>
      )}
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T style={{ fontSize: 13 }}>
          <T style={{ fontSize: 17, fontWeight: '700' }}>{c.memberCount}</T> member{c.memberCount === 1 ? '' : 's'}
        </T>
        <Tap
          onPress={() => (c.joined ? router.push({ pathname: '/circle/[id]', params: { id: c.id } }) : onJoin())}
          style={{ height: 40, minWidth: 72, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color={SC.ink} /> : <T style={{ color: SC.ink, fontWeight: '600', fontSize: 15 }}>{c.joined ? 'Open' : 'Join'}</T>}
        </Tap>
      </View>
    </Tap>
  );
}
