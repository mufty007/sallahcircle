import { createContext, use, useState, type ReactNode } from 'react';

import { PERIOD_ORDER } from '@/data/mock';
import type { Period } from '@/theme/colors';

type AppState = {
  /** Manual sky preview (long-press the Today dial); null = follow the real time of day. */
  skyOverride: Period | null;
  cycleSky: () => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [skyOverride, setSkyOverride] = useState<Period | null>(null);
  const cycleSky = () =>
    setSkyOverride((s) => {
      const i = s ? PERIOD_ORDER.indexOf(s) + 1 : 0;
      return i < PERIOD_ORDER.length ? PERIOD_ORDER[i] : null;
    });
  return <Ctx value={{ skyOverride, cycleSky }}>{children}</Ctx>;
}

export function useAppState() {
  const v = use(Ctx);
  if (!v) throw new Error('useAppState must be used inside AppStateProvider');
  return v;
}
