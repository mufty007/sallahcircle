import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { unregisterDevice } from '@/lib/notifications';
import { clearReminders } from '@/lib/reminders';
import { supabase, type Profile } from '@/lib/supabase';

type ProfilePatch = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'friend_code'>>;

type SessionState = {
  /** True until the stored session (and its profile) has been read. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  onboarded: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<Profile>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restoring, setRestoring] = useState(true);
  /** Which user the current `profile` was fetched for (set even if the fetch failed). */
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setRestoring(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) console.warn('Failed to load profile', error.message);
    setProfile(data ?? null);
    setProfileFor(userId);
  }, [userId]);

  useEffect(() => {
    // Fetching on sign-in; the setState calls happen after the network round-trip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId) refreshProfile();
  }, [userId, refreshProfile]);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
      if (error) throw error;
      setProfile(data);
      return data;
    },
    [userId],
  );

  const signOut = useCallback(async () => {
    await Promise.all([clearReminders().catch(() => {}), unregisterDevice().catch(() => {})]);
    await supabase.auth.signOut();
  }, []);

  const value: SessionState = {
    loading: restoring || (!!userId && profileFor !== userId),
    session,
    profile,
    onboarded: !!profile?.onboarded_at,
    refreshProfile,
    updateProfile,
    signOut,
  };
  return <Ctx value={value}>{children}</Ctx>;
}

export function useSession() {
  const v = use(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
