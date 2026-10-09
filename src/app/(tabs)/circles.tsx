import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Background } from '@/components/ui/background';
import { Icon } from '@/components/ui/icon';
import { Av, Chip, glass, hairline, Kicker, Stars, Tap } from '@/components/ui/primitives';
import { PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { FEATURED_CIRCLE, PUBLIC_CIRCLES } from '@/data/mock';
import { useMyCircles } from '@/lib/data';
import { useSession } from '@/state/session';
import { FONT, SC } from '@/theme/colors';

const FILTERS = ['For you', 'Fajr', 'Sisters', 'Brothers', 'Students'];

export default function DiscoverScreen() {
  const { session } = useSession();
  const mine = useMyCircles(session?.user.id);
  const [filter, setFilter] = useState(FILTERS[0]);
  const [query, setQuery] = useState('');
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const list = PUBLIC_CIRCLES.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Screen bg="navy" withTabBar>
      <PageTitle
        t="Discover"
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
          onChangeText={setQuery}
          placeholder="Circles or invite code"
          placeholderTextColor="rgba(255,255,255,0.45)"
          selectionColor={SC.mint}
          autoCapitalize="none"
          style={{ flex: 1, height: '100%', color: '#fff', fontSize: 15, fontFamily: FONT[400] }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={{ marginTop: 14, flexGrow: 0 }}>
        {FILTERS.map((t) => (
          <Chip key={t} bg={t === filter ? '#fff' : 'rgba(255,255,255,0.08)'} c={t === filter ? SC.ink : '#fff'} style={{ height: 36 }} textStyle={{ fontSize: 14 }} onPress={() => setFilter(t)}>
            {t}
          </Chip>
        ))}
      </ScrollView>

      <Tap onPress={() => router.push(`/public-circle/${FEATURED_CIRCLE.id}`)} style={{ marginHorizontal: 16, marginTop: 18, height: 196, borderRadius: 30, overflow: 'hidden', padding: 20 }}>
        <Background kind="fajr" />
        <Stars n={14} h={100} />
        <Chip bg="rgba(255,255,255,0.18)" style={{ height: 26 }} textStyle={{ fontSize: 12 }}>
          Featured
        </Chip>
        <T style={{ fontSize: 32, fontWeight: '700', letterSpacing: -1, marginTop: 12 }}>{FEATURED_CIRCLE.name}</T>
        <T style={{ fontSize: 14, opacity: 0.8, marginTop: 2 }}>{FEATURED_CIRCLE.tagline}</T>
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T style={{ fontSize: 13 }}>
            <T style={{ fontSize: 17, fontWeight: '700' }}>{FEATURED_CIRCLE.members}</T> members · <T style={{ fontSize: 17, fontWeight: '700' }}>{FEATURED_CIRCLE.onTime}</T> on time
          </T>
          <Tap
            onPress={() => router.push(`/public-circle/${FEATURED_CIRCLE.id}`)}
            style={{ height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center' }}>
            <T style={{ color: SC.ink, fontWeight: '600', fontSize: 15 }}>Join</T>
          </Tap>
        </View>
      </Tap>

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
          <Tap onPress={() => router.push('/find-circle')} style={{ paddingVertical: 8, alignItems: 'center' }}>
            <T style={{ fontSize: 14, color: SC.mint, fontWeight: '600' }}>Join with a code</T>
          </Tap>
        </View>
      ) : (
        <Tap onPress={() => router.push('/find-circle')} style={[glass, { marginHorizontal: 16, padding: 16 }]}>
          <T style={{ fontSize: 15, fontWeight: '600' }}>{mine.loading ? 'Loading…' : 'You’re not in a circle yet'}</T>
          {!mine.loading && <T style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Join with an invite code or create one →</T>}
        </Tap>
      )}

      <Kicker style={{ marginTop: 22, marginHorizontal: 24, marginBottom: 8 }}>POPULAR</Kicker>
      <View style={[glass, { marginHorizontal: 16, paddingVertical: 4, paddingHorizontal: 16 }]}>
        {list.map((c, i) => (
          <Tap
            key={c.id}
            onPress={() => router.push(`/public-circle/${c.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 66, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ color: SC.ink, fontWeight: '700', fontSize: 17 }}>{c.name[0]}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 16, fontWeight: '600' }}>{c.name}</T>
              <T style={{ fontSize: 12, opacity: 0.55 }}>
                {c.sub} · {c.pct}% on time
              </T>
            </View>
            <Tap
              onPress={() => setJoined((j) => ({ ...j, [c.id]: !j[c.id] }))}
              style={{
                height: 34,
                paddingHorizontal: 14,
                borderRadius: 17,
                borderWidth: 1,
                borderColor: joined[c.id] ? SC.mint : 'rgba(255,255,255,0.25)',
                backgroundColor: joined[c.id] ? SC.mint : 'transparent',
                justifyContent: 'center',
              }}>
              <T style={{ fontSize: 14, fontWeight: '600', color: joined[c.id] ? SC.ink : '#fff' }}>{joined[c.id] ? 'Joined' : 'Join'}</T>
            </Tap>
          </Tap>
        ))}
        {list.length === 0 && <T style={{ textAlign: 'center', opacity: 0.5, paddingVertical: 20 }}>No circles match “{query}”</T>}
      </View>
    </Screen>
  );
}
