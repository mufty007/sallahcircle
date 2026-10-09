import { createContext, use, useState, type ReactNode } from 'react';

import { PERIOD_ORDER, type PrayerStatus } from '@/data/mock';
import type { Period } from '@/theme/colors';

type AppState = {
  period: Period;
  setPeriod: (p: Period) => void;
  cyclePeriod: () => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  /** Today's log overrides by prayer index (local only until Supabase is wired). */
  logged: Partial<Record<number, PrayerStatus>>;
  logPrayer: (index: number, status: PrayerStatus) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>('maghrib');
  const [onboarded, setOnboarded] = useState(false);
  const [logged, setLogged] = useState<Partial<Record<number, PrayerStatus>>>({});

  const value: AppState = {
    period,
    setPeriod,
    cyclePeriod: () => setPeriod(PERIOD_ORDER[(PERIOD_ORDER.indexOf(period) + 1) % PERIOD_ORDER.length]),
    onboarded,
    setOnboarded,
    logged,
    logPrayer: (index, status) => setLogged((l) => ({ ...l, [index]: status })),
  };
  return <Ctx value={value}>{children}</Ctx>;
}

export function useAppState() {
  const v = use(Ctx);
  if (!v) throw new Error('useAppState must be used inside AppStateProvider');
  return v;
}
