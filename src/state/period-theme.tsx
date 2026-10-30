import { createContext, use, type ReactNode } from 'react';

import { useSession } from '@/state/session';
import { SC } from '@/theme/colors';

type PeriodTheme = {
  active: boolean;
  accent: string;
  accentInk: string;
  pill: string;
};

const Ctx = createContext<PeriodTheme>({ active: false, accent: SC.mint, accentInk: SC.ink, pill: SC.mint });

/** Pink/purple chrome while the user has an open excused period. */
export function PeriodThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useSession();
  const active = !!profile?.track_excused && !!profile?.paused_since;
  const value: PeriodTheme = active
    ? { active: true, accent: SC.pink, accentInk: SC.ink, pill: SC.lilac }
    : { active: false, accent: SC.mint, accentInk: SC.ink, pill: SC.mint };
  return <Ctx value={value}>{children}</Ctx>;
}

export function usePeriodTheme() {
  return use(Ctx);
}
