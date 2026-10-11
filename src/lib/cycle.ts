import type { ExcusedPeriod } from './data';

const DAY = 86_400_000;
/** Inclusive day count between two YYYY-MM-DD dates. */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY) + 1;
export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const niceDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** A reminder length, not a ruling. Ḥayḍ defaults to a past average, otherwise 10; nifās to 40. */
export const suggestDays = (kind: ExcusedPeriod['kind'], avgLength: number | null) =>
  kind === 'nifas' ? 40 : avgLength != null && avgLength >= 1 && avgLength <= 15 ? avgLength : 10;

/** True once an open period has run past the length the user set, and they haven't chosen to continue. */
export function isPastLimit(p: Pick<ExcusedPeriod, 'startedOn' | 'endedOn' | 'expectedDays' | 'continued'>, today: string) {
  return !p.endedOn && !p.continued && p.expectedDays != null && daysBetween(p.startedOn, today) > p.expectedDays;
}

/** Inclusive ranges. An open period runs through `openEnd`. */
export function rangesOverlap(periods: ExcusedPeriod[], start: string, end: string | null, ignoreId?: string) {
  const stop = end ?? '9999-12-31';
  return periods.some((p) => p.id !== ignoreId && p.startedOn <= stop && (p.endedOn ?? '9999-12-31') >= start);
}

/** `iso` at hour:minute in an IANA zone, as a UTC Date. */
export function localDateTime(iso: string, hour: number, minute: number, timeZone?: string | null) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const want = Date.parse(`${iso}T${pad(hour)}:${pad(minute)}:00Z`);
  const zone = timeZone || 'UTC';
  const wall = (ms: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(ms));
    const g = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    return Date.parse(`${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}Z`);
  };
  let t = want;
  for (let i = 0; i < 3; i++) t -= wall(t) - want;
  return new Date(t);
}

export type Cycle = {
  /** Open period, if excused right now. */
  open: ExcusedPeriod | null;
  /** Day of the current excused period (when open) or of the cycle since the last start. */
  day: number | null;
  /** Averages from past ḥayḍ periods (need at least two). */
  avgLength: number | null;
  avgCycle: number | null;
  /** Estimated next start, and days until it (negative = overdue). */
  nextStart: string | null;
  daysUntilNext: number | null;
};

/** Private, on-device estimates. Nothing here is a ruling; it's arithmetic on what the user logged. */
export function cycleInfo(periods: ExcusedPeriod[] | null | undefined, today: string): Cycle {
  const list = periods ?? [];
  const open = list.find((p) => !p.endedOn) ?? null;
  const hayd = list.filter((p) => p.kind === 'hayd').sort((a, b) => a.startedOn.localeCompare(b.startedOn));
  const done = hayd.filter((p) => p.endedOn);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const avgLength = done.length >= 2 ? avg(done.map((p) => daysBetween(p.startedOn, p.endedOn!))) : null;
  // Recent cycles matter most: average the last six gaps between starts.
  const gaps = hayd.slice(1).map((p, i) => daysBetween(hayd[i].startedOn, p.startedOn) - 1).slice(-6);
  const avgCycle = gaps.length >= 1 ? avg(gaps) : null;
  const lastStart = hayd.at(-1)?.startedOn ?? null;
  const nextStart = lastStart && avgCycle ? addDays(lastStart, avgCycle) : null;
  return {
    open,
    day: open ? daysBetween(open.startedOn, today) : lastStart ? daysBetween(lastStart, today) : null,
    avgLength,
    avgCycle,
    nextStart: open ? null : nextStart,
    daysUntilNext: !open && nextStart ? daysBetween(today, nextStart) - 1 : null,
  };
}
