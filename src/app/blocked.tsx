import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Av, glass, hairline, Tap } from '@/components/ui/primitives';
import { BackBar, PageTitle, Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { setBlocked, useQuery } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

type Blocked = { id: string; name: string; color: string; seed: string };

async function loadBlockedPeople(userId: string): Promise<Blocked[]> {
  const { data, error } = await supabase.from('blocks').select('blocked, created_at').eq('blocker', userId).order('created_at', { ascending: false });
  if (error) throw error;
  const ids = (data ?? []).map((b) => b.blocked);
  if (!ids.length) return [];
  // Names are only visible while you still share a circle.
  const { data: people } = await supabase.from('profiles').select('id, display_name, username, avatar_color, avatar_seed').in('id', ids);
  return ids.map((id) => {
    const p = people?.find((x) => x.id === id);
    return { id, name: p?.display_name ?? p?.username ?? 'Someone you blocked', color: p?.avatar_color ?? '#C7AFF5', seed: p?.avatar_seed ?? id };
  });
}

export default function BlockedScreen() {
  const { session } = useSession();
  const me = session?.user.id;
  const list = useQuery(me ? `blocked-people:${me}` : null, () => loadBlockedPeople(me!));
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <Screen bg="navy" header={<BackBar />}>
      <PageTitle t="Blocked" style={{ marginTop: 16 }} />
      <T style={{ marginHorizontal: 24, marginTop: 8, fontSize: 14, opacity: 0.6, lineHeight: 20 }}>
        Blocked people can’t nudge you and you won’t see their nudges. They aren’t told.
      </T>
      {list.loading && <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />}
      {list.data?.length === 0 && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 20, padding: 18 }]}>
          <T style={{ fontSize: 15, opacity: 0.7 }}>You haven’t blocked anyone.</T>
        </View>
      )}
      {!!list.data?.length && (
        <View style={[glass, { marginHorizontal: 16, marginTop: 20, paddingHorizontal: 16 }]}>
          {list.data.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 60, borderTopWidth: i ? 1 : 0, borderTopColor: hairline() }}>
              <Av m={{ init: p.name[0] ?? '?', color: p.color, seed: p.seed }} s={36} />
              <T style={{ flex: 1, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                {p.name}
              </T>
              <Tap
                disabled={busy === p.id}
                onPress={async () => {
                  setBusy(p.id);
                  await setBlocked(p.id, false).finally(() => setBusy(null));
                }}
                style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', justifyContent: 'center' }}>
                {busy === p.id ? <ActivityIndicator size="small" color="#fff" /> : <T style={{ fontSize: 13, fontWeight: '600', color: SC.mint }}>Unblock</T>}
              </Tap>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
