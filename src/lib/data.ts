// App data from Supabase + AlAdhan, with a tiny refreshable query cache.
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { PrayerStatus } from '@/data/mock';

import { fetchDay, fetchNextPrayer, PRAYER_KEYS, type AsrMethod, type CalcMethod, type DayTimes, type Place, type PrayerKey } from './prayer-times';
import { pushNudge } from './notifications';
import { supabase, type Enums, type Tables } from './supabase';

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
  seed: string;
  city: string | null;
  timezone: string | null;
  place: Place | null;
  calcMethod: CalcMethod;
  asrMethod: AsrMethod;
  role: Enums<'circle_role'>;
  /** On a break (e.g. excused days). Carries no reason; nudges are blocked. */
  paused: boolean;
  you: boolean;
};

export type Circle = {
  id: string;
  name: string;
  code: string;
  color: string;
  visibility: Enums<'circle_visibility'>;
  focus: string;
  description: string | null;
  leaderboardEnabled: boolean;
  nudgesEnabled: boolean;
  createdBy: string;
  members: CircleMember[];
};

const PROFILE_COLS = 'id, display_name, username, avatar_color, city, timezone, latitude, longitude, calc_method, asr_method, paused_since, avatar_seed';

export async function loadMyCircles(userId: string): Promise<Circle[]> {
  const { data: mine, error } = await supabase
    .from('circle_members')
    .select('joined_at, circle:circles(id, name, code, color, visibility, focus, description, leaderboard_enabled, nudges_enabled, created_by)')
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
    description: c.description,
    leaderboardEnabled: c.leaderboard_enabled,
    nudgesEnabled: c.nudges_enabled,
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
          seed: p.avatar_seed ?? p.id,
          city: p.city,
          timezone: p.timezone,
          place: p.latitude != null && p.longitude != null ? { latitude: p.latitude, longitude: p.longitude, timezone: p.timezone } : null,
          calcMethod: p.calc_method,
          asrMethod: p.asr_method,
          role: r.role,
          paused: !!p.paused_since,
          you: p.id === userId,
        };
      })
      .sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name)),
  }));
}

export function useMyCircles(userId: string | undefined) {
  return useQuery(userId ? `circles:${userId}` : null, () => loadMyCircles(userId!));
}

// ─── Circle management ─────────────────────────────────────────
export type CirclePatch = Partial<Pick<Tables<'circles'>, 'name' | 'description' | 'color' | 'visibility' | 'focus' | 'nudges_enabled' | 'leaderboard_enabled'>>;

export async function updateCircle(id: string, patch: CirclePatch) {
  const { error } = await supabase.from('circles').update(patch).eq('id', id);
  if (error) throw error;
  invalidate();
}

/** New invite code; the old one stops working. Owner only. */
export async function resetCircleCode(id: string) {
  const { data, error } = await supabase.rpc('reset_circle_code', { cid: id });
  if (error) throw error;
  invalidate();
  return data;
}

/** Owner removes someone, or (with your own id) you leave. Ownership passes on automatically. */
export async function removeMember(circleId: string, userId: string) {
  const { data, error } = await supabase.from('circle_members').delete().eq('circle_id', circleId).eq('user_id', userId).select('user_id');
  if (error) throw error;
  if (!data?.length) throw new Error('Only the circle owner can remove members.');
  invalidate();
}

export async function deleteCircle(id: string) {
  const { data, error } = await supabase.from('circles').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Only the circle owner can delete it.');
  invalidate();
}

// ─── Voice notes ───────────────────────────────────────────────
const VOICE_BUCKET = 'voice-notes';

/** Upload a recording to voice-notes/{me}/{uuid}.m4a and return its storage path. */
export async function uploadVoice(uri: string, userId: string) {
  let body: Uint8Array | ArrayBuffer;
  if (Platform.OS === 'web') body = await (await fetch(uri)).arrayBuffer();
  else body = await new File(uri).bytes();
  const ext = Platform.OS === 'web' ? 'webm' : 'm4a';
  const path = `${userId}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(VOICE_BUCKET).upload(path, body, { contentType: Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4' });
  if (error) throw error;
  return path;
}

export async function discardVoice(path: string) {
  await supabase.storage.from(VOICE_BUCKET).remove([path]);
}

/** Short-lived URL for playing a voice note you sent or received. */
export async function voiceUrl(path: string) {
  const { data, error } = await supabase.storage.from(VOICE_BUCKET).createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

// ─── Prayer logs ───────────────────────────────────────────────
export type LogRow = { user_id: string; prayer: PrayerKey; prayed_on: string; status: Enums<'prayer_status'>; logged_at: string };

/** Logs for these users since `since` (YYYY-MM-DD). Circle-mates only see the status. */
export async function loadLogs(userIds: string[], since: string): Promise<LogRow[]> {
  if (!userIds.length) return [];
  const { data, error } = await supabase.from('prayer_logs').select('user_id, prayer, prayed_on, status, logged_at').in('user_id', userIds).gte('prayed_on', since);
  if (error) throw error;
  return data ?? [];
}

export async function logPrayer(input: { prayer: PrayerKey; prayedOn: string; status: Enums<'prayer_status'>; inJamaah: boolean; atMasjid: boolean }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in');
  const { data: log, error } = await supabase
    .from('prayer_logs')
    .upsert(
      // logged_at is left alone so editing a log doesn't make it look freshly prayed.
      { user_id: auth.user.id, prayer: input.prayer, prayed_on: input.prayedOn, status: input.status },
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

export type MyLog = { id: string; status: Enums<'prayer_status'>; inJamaah: boolean; atMasjid: boolean; sunnah: SunnahKind[] };

/** Your own log for one prayer (with its private details), or null if not logged yet. */
export async function loadMyLog(userId: string, prayer: PrayerKey, prayedOn: string): Promise<MyLog | null> {
  const [log, sun] = await Promise.all([
    supabase.from('prayer_logs').select('id, status').eq('user_id', userId).eq('prayer', prayer).eq('prayed_on', prayedOn).maybeSingle(),
    supabase.from('sunnah_logs').select('kind').eq('user_id', userId).eq('prayed_on', prayedOn),
  ]);
  if (log.error) throw log.error;
  if (sun.error) throw sun.error;
  const mine = new Set(SUNNAH_FOR[prayer].map((x) => x.kind));
  const sunnah = (sun.data ?? []).map((r) => r.kind).filter((k) => mine.has(k));
  if (!log.data) return null;
  const { data: d, error } = await supabase.from('prayer_log_details').select('in_jamaah, at_masjid').eq('log_id', log.data.id).maybeSingle();
  if (error) throw error;
  return { id: log.data.id, status: log.data.status, inJamaah: d?.in_jamaah ?? false, atMasjid: d?.at_masjid ?? false, sunnah };
}

/** Remove a log (its private details cascade). */
export async function unlogPrayer(logId: string) {
  const { error } = await supabase.from('prayer_logs').delete().eq('id', logId);
  if (error) throw error;
  invalidate();
}

/** Consecutive complete days. Excused days (`skip`) neither count nor break the streak. */
export function streakFrom(logs: LogRow[], userId: string, today: string, skip?: Set<string>) {
  const perDay = new Map<string, number>();
  for (const l of logs) if (l.user_id === userId && l.status !== 'missed') perDay.set(l.prayed_on, (perDay.get(l.prayed_on) ?? 0) + 1);
  const d = new Date(`${today}T12:00:00Z`);
  // Today still counts as "in progress", so start from yesterday if today isn't complete yet.
  if ((perDay.get(today) ?? 0) < 5) d.setUTCDate(d.getUTCDate() - 1);
  let streak = 0;
  for (let guard = 0; guard < 1000; guard++) {
    const iso = d.toISOString().slice(0, 10);
    if ((perDay.get(iso) ?? 0) >= 5) streak++;
    else if (!skip?.has(iso)) break;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

/** Streaks for you and circle-mates, computed server-side (excused days skipped, never revealed). */
export async function loadStreaks(userIds: string[]): Promise<Map<string, number>> {
  if (!userIds.length) return new Map();
  const { data, error } = await supabase.rpc('member_streaks', { uids: userIds });
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.user_id, r.streak]));
}

// ─── Excused days (private) ────────────────────────────────────
export type ExcusedPeriod = { id: string; kind: Enums<'excuse_kind'>; startedOn: string; endedOn: string | null };

export async function loadExcused(userId: string): Promise<ExcusedPeriod[]> {
  const { data, error } = await supabase.from('excused_periods').select('id, kind, started_on, ended_on').eq('user_id', userId).order('started_on', { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, kind: r.kind, startedOn: r.started_on, endedOn: r.ended_on }));
}

/** Only loads for people who opted in. */
export function useExcused(userId: string | undefined, enabled: boolean) {
  return useQuery(userId && enabled ? `excused:${userId}` : null, () => loadExcused(userId!));
}

/** Every excused date (YYYY-MM-DD) up to `today`. */
export function excusedDates(periods: ExcusedPeriod[] | null | undefined, today: string) {
  const out = new Set<string>();
  for (const p of periods ?? []) {
    const d = new Date(`${p.startedOn}T12:00:00Z`);
    const end = p.endedOn ?? today;
    for (let i = 0; i < 90 && d.toISOString().slice(0, 10) <= end; i++) {
      out.add(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }
  return out;
}

export async function startExcused(kind: Enums<'excuse_kind'>, startedOn: string) {
  const { error } = await supabase.from('excused_periods').insert({ kind, started_on: startedOn });
  if (error) throw error.code === '23505' ? new Error('You already have excused days in progress.') : error;
  invalidate();
}

export async function endExcused(id: string, endedOn: string) {
  const { error } = await supabase.from('excused_periods').update({ ended_on: endedOn }).eq('id', id);
  if (error) throw error;
  invalidate();
}

export async function deleteExcused(id: string) {
  const { error } = await supabase.from('excused_periods').delete().eq('id', id);
  if (error) throw error;
  invalidate();
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

// ─── Activity (nudges received) ────────────────────────────────
export type InboxItem = {
  id: string;
  kind: Enums<'nudge_kind'>;
  prayer: PrayerKey;
  prayerDate: string;
  message: string | null;
  voicePath: string | null;
  response: string | null;
  createdAt: Date;
  circleId: string;
  sender: { id: string; name: string; init: string; color: string; seed: string };
};

export async function loadInbox(userId: string, days = 7): Promise<InboxItem[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('nudges')
    .select('id, kind, prayer, prayer_date, message, voice_path, response, created_at, circle_id, sender:profiles!nudges_from_user_fkey(id, display_name, username, avatar_color, avatar_seed)')
    .eq('to_user', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((n) => {
    const name = n.sender?.display_name ?? n.sender?.username ?? 'Someone';
    return {
      id: n.id,
      kind: n.kind,
      prayer: n.prayer,
      prayerDate: n.prayer_date,
      message: n.message,
      voicePath: n.voice_path,
      response: n.response,
      createdAt: new Date(n.created_at),
      circleId: n.circle_id,
      sender: { id: n.sender?.id ?? '', name, init: name[0]?.toUpperCase() ?? '?', color: n.sender?.avatar_color ?? '#79DBB2', seed: n.sender?.avatar_seed ?? n.sender?.id ?? name },
    };
  });
}

export function useInbox(userId: string | undefined) {
  return useQuery(userId ? `inbox:${userId}` : null, () => loadInbox(userId!));
}

export async function respondToNudge(id: string, response: string) {
  const { error } = await supabase.from('nudges').update({ response, responded_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  pushNudge(id);
  invalidate();
}

// ─── Leaderboard ───────────────────────────────────────────────
export type BoardRow = { userId: string; onTime: number; late: number; jamaah: number; points: number };

export async function loadBoard(circleId: string, since: string): Promise<BoardRow[]> {
  const { data, error } = await supabase.rpc('circle_board', { cid: circleId, since });
  if (error) throw error;
  return (data ?? [])
    .map((r) => ({ userId: r.user_id, onTime: r.on_time, late: r.late, jamaah: r.jamaah, points: r.points }))
    .sort((a, b) => b.points - a.points);
}

/** Most recent Sunday (YYYY-MM-DD) on or before `date` (YYYY-MM-DD). */
export function weekStart(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

// ─── Discover ──────────────────────────────────────────────────
export type PublicCircle = {
  id: string;
  name: string;
  color: string;
  code: string;
  focus: string;
  description: string | null;
  memberCount: number;
  joined: boolean;
};

export async function loadPublicCircles(): Promise<PublicCircle[]> {
  const { data, error } = await supabase.rpc('public_circles');
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    code: c.code,
    focus: c.focus,
    description: c.description,
    memberCount: c.member_count,
    joined: c.joined,
  }));
}

export function usePublicCircles(enabled: boolean) {
  return useQuery(enabled ? 'public-circles' : null, loadPublicCircles);
}

export async function joinCircle(code: string) {
  const { data, error } = await supabase.rpc('join_circle', { invite_code: code });
  if (error) throw new Error(error.code === 'P0002' ? 'No circle found for that code.' : error.message);
  invalidate();
  return data;
}

// ─── Qaḍāʾ (owner-only) ────────────────────────────────────────
export type QadaItem = Enums<'qada_item'>;
export type QadaCount = { item: QadaItem; owed: number; madeUp: number };
export const QADA_ITEMS: QadaItem[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'fast'];

export async function loadQada(userId: string): Promise<Map<QadaItem, QadaCount>> {
  const { data, error } = await supabase.from('qada_counts').select('item, owed, made_up').eq('user_id', userId);
  if (error) throw error;
  const out = new Map<QadaItem, QadaCount>(QADA_ITEMS.map((item) => [item, { item, owed: 0, madeUp: 0 }]));
  for (const r of data ?? []) out.set(r.item, { item: r.item, owed: r.owed, madeUp: r.made_up });
  return out;
}

export async function setQada(userId: string, item: QadaItem, patch: { owed?: number; madeUp?: number }) {
  const row: { user_id: string; item: QadaItem; owed?: number; made_up?: number } = { user_id: userId, item };
  if (patch.owed != null) row.owed = Math.max(0, patch.owed);
  if (patch.madeUp != null) row.made_up = Math.max(0, patch.madeUp);
  const { error } = await supabase.from('qada_counts').upsert(row);
  if (error) throw error;
  invalidate();
}

// ─── Fasting (owner-only) ──────────────────────────────────────
export type FastKind = Enums<'fast_kind'>;
export type FastLog = { fastedOn: string; kind: FastKind };

export async function loadFasts(userId: string, since: string): Promise<FastLog[]> {
  const { data, error } = await supabase.from('fast_logs').select('fasted_on, kind').eq('user_id', userId).gte('fasted_on', since).order('fasted_on');
  if (error) throw error;
  return (data ?? []).map((r) => ({ fastedOn: r.fasted_on, kind: r.kind }));
}

/** Log (or change) the fast for a day; `null` removes it. A qaḍāʾ fast counts as made up automatically. */
export async function setFast(userId: string, fastedOn: string, kind: FastKind | null) {
  const { error } = kind
    ? await supabase.from('fast_logs').upsert({ user_id: userId, fasted_on: fastedOn, kind })
    : await supabase.from('fast_logs').delete().eq('user_id', userId).eq('fasted_on', fastedOn);
  if (error) throw error;
  invalidate();
}

// ─── Sunnah prayers (owner-only) ───────────────────────────────
export type SunnahKind = Enums<'sunnah_kind'>;
/** The sunnah prayers that go with each farḍ prayer (shown on the log sheet). */
export const SUNNAH_FOR: Record<PrayerKey, { kind: SunnahKind; label: string }[]> = {
  fajr: [{ kind: 'fajr_before', label: '2 before' }],
  dhuhr: [
    { kind: 'dhuhr_before', label: '4 before' },
    { kind: 'dhuhr_after', label: '2 after' },
  ],
  asr: [],
  maghrib: [{ kind: 'maghrib_after', label: '2 after' }],
  isha: [
    { kind: 'isha_after', label: '2 after' },
    { kind: 'witr', label: 'Witr' },
  ],
};

export async function loadSunnah(userId: string, since: string): Promise<{ prayedOn: string; kind: SunnahKind }[]> {
  const { data, error } = await supabase.from('sunnah_logs').select('prayed_on, kind').eq('user_id', userId).gte('prayed_on', since);
  if (error) throw error;
  return (data ?? []).map((r) => ({ prayedOn: r.prayed_on, kind: r.kind }));
}

export async function setSunnah(userId: string, prayedOn: string, kind: SunnahKind, done: boolean) {
  const { error } = done
    ? await supabase.from('sunnah_logs').upsert({ user_id: userId, prayed_on: prayedOn, kind })
    : await supabase.from('sunnah_logs').delete().eq('user_id', userId).eq('prayed_on', prayedOn).eq('kind', kind);
  if (error) throw error;
  invalidate();
}
