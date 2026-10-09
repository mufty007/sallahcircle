// App data from Supabase + AlAdhan, with a tiny refreshable query cache.
import { useEffect, useState, useSyncExternalStore } from 'react';

import type { PrayerStatus } from '@/data/mock';

import { fetchDay, fetchNextPrayer, PRAYER_KEYS, type AsrMethod, type CalcMethod, type DayTimes, type Place, type PrayerKey } from './prayer-times';
import { supabase, type Enums } from './supabase';

// ─── Query store ────────────────────────────────────────────────
// Every query re-runs when `invalidate()` is called (e.g. after logging a prayer).
let version = 0;
const listeners = new Set<() => void>();
export function invalidate() {
  version++;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

type QueryState<T> = { data: T | null; error: string | null; loading: boolean };
const cache = new Map<string, unknown>();

/** Run `load` for `key` (null = skip). Keeps showing the previous data while refreshing. */
export function useQuery<T>(key: string | null, load: () => Promise<T>): QueryState<T> & { refresh: () => void } {
  const v = useSyncExternalStore(subscribe, () => version, () => version);
  const [state, setState] = useState<{ key: string | null; error: string | null; loading: boolean }>({ key: null, error: null, loading: !!key });
  useEffect(() => {
    if (!key) return;
    let live = true;
    load()
      .then((data) => {
        cache.set(key, data);
        if (live) setState({ key, error: null, loading: false });
      })
      .catch((e) => live && setState({ key, error: e instanceof Error ? e.message : String(e), loading: false }));
    return () => {
      live = false;
    };
    // `load` is recreated each render; `key` + the store version capture its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, v]);
  const data = key ? ((cache.get(key) as T | undefined) ?? null) : null;
  return { data, error: state.key === key ? state.error : null, loading: !!key && data === null && !state.error, refresh: invalidate };
}

// ─── Helpers ────────────────────────────────────────────────────
/** YYYY-MM-DD for `d` in a time zone. */
export function isoDate(d: Date, timezone?: string | null) {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone ?? undefined }).format(d);
  return parts; // en-CA formats as YYYY-MM-DD
}

/** Hours since local midnight (e.g. 21.5 = 9:30 PM) in a time zone. */
export function decimalHour(d: Date, timezone?: string | null) {
  const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: timezone ?? undefined }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h + m / 60;
}

export const STATUS_CELL: Record<Enums<'prayer_status'>, PrayerStatus> = { on_time: 'd', late: 'l', missed: 'm' };

// ─── Circles & members ─────────────────────────────────────────
export type CircleMember = {
  id: string;
  name: string;
  username: string | null;
  init: string;
  color: string;
  city: string | null;
  timezone: string | null;
  place: Place | null;
  calcMethod: CalcMethod;
  asrMethod: AsrMethod;
  role: Enums<'circle_role'>;
  you: boolean;
};

export type Circle = {
  id: string;
  name: string;
  code: string;
  color: string;
  visibility: Enums<'circle_visibility'>;
  focus: string;
  createdBy: string;
  members: CircleMember[];
};

const PROFILE_COLS = 'id, display_name, username, avatar_color, city, timezone, latitude, longitude, calc_method, asr_method';

export async function loadMyCircles(userId: string): Promise<Circle[]> {
  const { data: mine, error } = await supabase
    .from('circle_members')
    .select('joined_at, circle:circles(id, name, code, color, visibility, focus, created_by)')
    .eq('user_id', userId)
    .order('joined_at');
  if (error) throw error;
  const circles = (mine ?? []).map((r) => r.circle).filter((c): c is NonNullable<typeof c> => !!c);
  if (!circles.length) return [];

  const { data: rows, error: e2 } = await supabase
    .from('circle_members')
    .select(`circle_id, role, profile:profiles(${PROFILE_COLS})`)
    .in(
      'circle_id',
      circles.map((c) => c.id),
    );
  if (e2) throw e2;

  return circles.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    color: c.color,
    visibility: c.visibility,
    focus: c.focus,
    createdBy: c.created_by,
    members: (rows ?? [])
      .filter((r) => r.circle_id === c.id && r.profile)
      .map((r) => {
        const p = r.profile!;
        const name = p.display_name ?? p.username ?? 'Member';
        return {
          id: p.id,
          name,
          username: p.username,
          init: name[0]?.toUpperCase() ?? '?',
          color: p.avatar_color,
          city: p.city,
          timezone: p.timezone,
          place: p.latitude != null && p.longitude != null ? { latitude: p.latitude, longitude: p.longitude, timezone: p.timezone } : null,
          calcMethod: p.calc_method,
          asrMethod: p.asr_method,
          role: r.role,
          you: p.id === userId,
        };
      })
      .sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name)),
  }));
}

export function useMyCircles(userId: string | undefined) {
  return useQuery(userId ? `circles:${userId}` : null, () => loadMyCircles(userId!));
}

// ─── Prayer logs ───────────────────────────────────────────────
export type LogRow = { user_id: string; prayer: PrayerKey; prayed_on: string; status: Enums<'prayer_status'> };

/** Logs for these users since `since` (YYYY-MM-DD). Circle-mates only see the status. */
export async function loadLogs(userIds: string[], since: string): Promise<LogRow[]> {
  if (!userIds.length) return [];
  const { data, error } = await supabase.from('prayer_logs').select('user_id, prayer, prayed_on, status').in('user_id', userIds).gte('prayed_on', since);
  if (error) throw error;
  return data ?? [];
}

export async function logPrayer(input: { prayer: PrayerKey; prayedOn: string; status: Enums<'prayer_status'>; inJamaah: boolean; atMasjid: boolean }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in');
  const { data: log, error } = await supabase
    .from('prayer_logs')
    .upsert(
      { user_id: auth.user.id, prayer: input.prayer, prayed_on: input.prayedOn, status: input.status, logged_at: new Date().toISOString() },
      { onConflict: 'user_id,prayed_on,prayer' },
    )
    .select('id')
    .single();
  if (error) throw error;
  // Private details (owner-only table; circle-mates never see these).
  const { error: e2 } = await supabase
    .from('prayer_log_details')
    .upsert({ log_id: log.id, user_id: auth.user.id, in_jamaah: input.inJamaah, at_masjid: input.atMasjid });
  if (e2) throw e2;
  invalidate();
}

/** Current streak: consecutive days (ending today or yesterday) with all five prayers logged. */
export function streakFrom(logs: LogRow[], userId: string, today: string) {
  const perDay = new Map<string, number>();
  for (const l of logs) if (l.user_id === userId && l.status !== 'missed') perDay.set(l.prayed_on, (perDay.get(l.prayed_on) ?? 0) + 1);
  const d = new Date(`${today}T12:00:00Z`);
  // Today still counts as "in progress", so start from yesterday if today isn't complete yet.
  if ((perDay.get(today) ?? 0) < 5) d.setUTCDate(d.getUTCDate() - 1);
  let streak = 0;
  while ((perDay.get(d.toISOString().slice(0, 10)) ?? 0) >= 5) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

// ─── Member schedules ──────────────────────────────────────────
export type MemberNext = {
  member: CircleMember;
  next: PrayerKey;
  at: Date;
  /** Member's local date today (YYYY-MM-DD) and the date their next prayer falls on. */
  today: string;
  prayerDate: string;
  day: DayTimes;
};

/** Each member's next prayer from AlAdhan (members without a location are skipped). */
export async function loadMemberSchedules(members: CircleMember[], now = new Date()): Promise<MemberNext[]> {
  const out = await Promise.all(
    members
      .filter((m) => m.place)
      .map(async (m) => {
        const [n, day] = await Promise.all([fetchNextPrayer(m.place!, m.calcMethod, m.asrMethod, now), fetchDay(m.place!, m.calcMethod, m.asrMethod, now)]);
        return { member: m, next: n.key, at: n.at, today: isoDate(now, m.timezone), prayerDate: isoDate(n.at, m.timezone), day };
      }),
  );
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Five-cell status row for a member today: logged statuses, their next prayer, otherwise blank. */
export function statusRow(logs: LogRow[], userId: string, date: string, next?: PrayerKey): PrayerStatus[] {
  return PRAYER_KEYS.map((p) => {
    const log = logs.find((l) => l.user_id === userId && l.prayed_on === date && l.prayer === p);
    if (log) return STATUS_CELL[log.status];
    return p === next ? 'n' : 'u';
  });
}

/** Ticking clock for countdowns. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** "7:12" (m:ss) under an hour, otherwise "1:48:10". */
export function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "7m", "1h 48m" */
export function shortIn(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}
