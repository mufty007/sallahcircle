// Mock data for the UI. Everything here will be replaced by Supabase queries.
import { AVATAR_COLORS, type Period } from '@/theme/colors';

/** d = on time, l = late, m = missed, n = next, u = upcoming */
export type PrayerStatus = 'd' | 'l' | 'm' | 'n' | 'u';

export type Member = {
  id: string;
  name: string;
  you?: boolean;
  init: string;
  city: string;
  local: string;
  next: string;
  nin: string;
  at: string;
  st: PrayerStatus[];
  streak: number;
  color: string;
};

export const MEMBERS: Member[] = [
  { id: 'you', name: 'mtomas', you: true, init: 'M', city: 'Chicago', local: '8:59 PM', next: 'Maghrib', nin: '7m', at: '9:07 PM', st: ['d', 'd', 'l', 'n', 'u'], streak: 12, color: AVATAR_COLORS[0] },
  { id: 'ab', name: 'Abdullahi', init: 'A', city: 'Chicago', local: '8:59 PM', next: 'Maghrib', nin: '7m', at: '9:07 PM', st: ['d', 'd', 'm', 'n', 'u'], streak: 3, color: AVATAR_COLORS[1] },
  { id: 'za', name: 'Zainab', init: 'Z', city: 'London', local: '2:59 AM', next: 'Fajr', nin: '14m', at: '3:13 AM', st: ['n', 'u', 'u', 'u', 'u'], streak: 41, color: AVATAR_COLORS[2] },
  { id: 'yu', name: 'Yusuf', init: 'Y', city: 'Toronto', local: '9:59 PM', next: 'Isha', nin: '31m', at: '10:30 PM', st: ['d', 'd', 'd', 'd', 'n'], streak: 8, color: AVATAR_COLORS[3] },
  { id: 'ay', name: 'Ayuba', init: 'A', city: 'Lagos', local: '2:59 AM', next: 'Fajr', nin: '2h 25m', at: '5:24 AM', st: ['n', 'u', 'u', 'u', 'u'], streak: 0, color: AVATAR_COLORS[4] },
];

export const memberById = (id: string) => MEMBERS.find((m) => m.id === id) ?? MEMBERS[1];

export const PRAYERS: [string, string][] = [
  ['Fajr', '4:12'],
  ['Dhuhr', '1:02'],
  ['Asr', '5:01'],
  ['Maghrib', '9:07'],
  ['Isha', '10:39'],
];

/** Prayer times as decimal hours, used to place them on the 24h dial. */
export const PRAYER_HOURS: [string, number][] = [
  ['Fajr', 4.2],
  ['Dhuhr', 13.03],
  ['Asr', 17.02],
  ['Maghrib', 21.12],
  ['Isha', 22.65],
];
export const SUNRISE = 5.55;

export type PeriodData = {
  key: Period;
  name: string;
  at: string;
  clock: string;
  dark: boolean;
  stars?: boolean;
  st: PrayerStatus[];
  now: number;
  cd: string;
  queue: [Member, string][];
  cardSub: string;
};

const [, AB, ZA, YU, AY] = MEMBERS;

export const PERIODS: Record<Period, PeriodData> = {
  fajr: { key: 'fajr', name: 'Fajr', at: '4:12 AM', clock: '4:01', dark: true, st: ['n', 'u', 'u', 'u', 'u'], now: 4.02, cd: '10:48', queue: [[AB, 'Fajr · 11m'], [ZA, 'Fajr · 1h 48m'], [AY, 'Fajr · 3h 22m']], cardSub: 'Abdullahi is up with you' },
  dhuhr: { key: 'dhuhr', name: 'Dhuhr', at: '1:02 PM', clock: '12:48', dark: false, st: ['d', 'n', 'u', 'u', 'u'], now: 12.8, cd: '14:06', queue: [[AB, 'Dhuhr · 14m'], [YU, 'Dhuhr · 1h 14m'], [ZA, 'Asr · 2h 01m']], cardSub: 'Zainab & Ayuba prayed Dhuhr' },
  maghrib: { key: 'maghrib', name: 'Maghrib', at: '9:07 PM', clock: '9:00', dark: true, st: ['d', 'd', 'l', 'n', 'u'], now: 21.0, cd: '7:12', queue: [[AB, 'Maghrib · 7m'], [ZA, 'Fajr · 14m'], [YU, 'Isha · 31m'], [AY, 'Fajr · 2h 25m']], cardSub: '2 could use a nudge' },
  isha: { key: 'isha', name: 'Isha', at: '10:39 PM', clock: '10:21', dark: true, stars: true, st: ['d', 'd', 'l', 'd', 'n'], now: 22.35, cd: '18:10', queue: [[AB, 'Isha · 18m'], [ZA, 'Fajr · 1h 05m'], [AY, 'Fajr · 3h 49m']], cardSub: 'Yusuf just prayed Isha' },
};

export const PERIOD_ORDER: Period[] = ['fajr', 'dhuhr', 'maghrib', 'isha'];

export type Circle = {
  id: string;
  name: string;
  sub: string;
  pct: number;
  color: string;
  members?: number;
};

export const MY_CIRCLE = { id: 'fam', name: 'Fam', code: 'BGQBML', members: 5, zones: 4, privacy: 'Private', onTime: 0.84 };

export const PUBLIC_CIRCLES: Circle[] = [
  { id: 'sisters-of-sabr', name: 'Sisters of Ṣabr', sub: '312 members · English', pct: 88, color: AVATAR_COLORS[2] },
  { id: 'uic-msa', name: 'UIC MSA', sub: '146 members · Chicago', pct: 81, color: AVATAR_COLORS[1] },
  { id: 'new-muslims', name: 'New Muslims Circle', sub: '89 members · Gentle pace', pct: 76, color: AVATAR_COLORS[3] },
  { id: 'night-shift', name: 'Night Shift Ummah', sub: '204 members · Toronto', pct: 72, color: AVATAR_COLORS[4] },
];

export const FEATURED_CIRCLE = {
  id: 'fajr-club',
  name: 'Fajr Club',
  tagline: 'Wake up for Fajr, every single day.',
  members: '2,340',
  onTime: '91%',
  avgStreak: '23',
  focus: 'Fajr focus',
  about:
    'You’re paired with a Fajr buddy in a nearby time zone each week. Members can nudge you once before Fajr. No leaderboard, just streaks.',
  tags: ['Weekly buddy', '1 nudge / prayer', 'Brothers & sisters'],
};

export const NUDGE_PRESETS = ['Maghrib in 7m — let’s go', 'Pray with me?', 'Don’t let it slip, akhi', 'Making wuḍūʾ now'];
export const DUAS: [string, string][] = [
  ['اللهم أعني على ذكرك', 'O Allah, help me remember You'],
  ['بارك الله فيك', 'May Allah bless you'],
];

export const CALC_METHODS: { name: string; sub: string; fajr: string; isha: string }[] = [
  { name: 'ISNA', sub: 'North America · 15°', fajr: '4:12', isha: '10:39' },
  { name: 'Muslim World League', sub: 'Europe, Far East · 18°', fajr: '3:46', isha: '11:08' },
  { name: 'Umm al-Qura', sub: 'Arabian Peninsula', fajr: '3:41', isha: '10:37' },
  { name: 'Egyptian Authority', sub: 'Africa, Levant · 19.5°', fajr: '3:33', isha: '10:58' },
];

export const REMINDERS: [string, string, string][] = [
  ['Fajr', '4:12 AM', 'Adhān'],
  ['Dhuhr', '1:02 PM', 'Chime'],
  ['Asr', '5:01 PM', 'Chime'],
  ['Maghrib', '9:07 PM', 'Adhān'],
  ['Isha', '10:39 PM', 'Chime'],
];

export const CONTACTS: [string, string, string][] = [
  ['Ibrahim K.', 'I', AVATAR_COLORS[5]],
  ['Maryam', 'M', AVATAR_COLORS[2]],
  ['Bilal (MSA)', 'B', AVATAR_COLORS[3]],
];

export const HOME_COORD: [number, number] = [-87.63, 41.88];
export const MAKKAH: [number, number] = [39.826, 21.4225];
