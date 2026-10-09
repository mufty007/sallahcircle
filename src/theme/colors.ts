// Design tokens from the Salah Circle design (oklch values converted to sRGB hex).
export const SC = {
  ink: '#0B1220',
  paper: '#F1EEE6',
  sheet: '#F6F4EE',
  navy: '#0A1226',
  navy2: '#121B36',
  green: '#0F3D2E',
  green2: '#16573F',
  deep: '#062018',
  mint: '#87E8BF',
  lime: '#C8F56D',
  amber: '#FCBE62',
  coral: '#F07F77',
} as const;

/** Mint with alpha, e.g. mintA(0.14). */
export const mintA = (a: number) => `rgba(135, 232, 191, ${a})`;

export const AVATAR_COLORS = ['#79DBB2', '#8CC3FC', '#FFA7A7', '#F5CB70', '#C7AFF5', '#80DBEB'] as const;

export type Gradient = {
  colors: readonly [string, string, ...string[]];
  locations: readonly [number, number, ...number[]];
};

export type Period = 'fajr' | 'dhuhr' | 'maghrib' | 'isha';

export const SKY: Record<Period, Gradient> = {
  fajr: { colors: ['#0A1233', '#262C61', '#9A5E7E', '#F0B08A'], locations: [0, 0.42, 0.74, 1] },
  dhuhr: { colors: ['#2E7FD0', '#7DB8EA', '#DDEBF0'], locations: [0, 0.5, 1] },
  maghrib: { colors: ['#171544', '#4E2A66', '#C2585C', '#F3A25A'], locations: [0, 0.38, 0.72, 1] },
  isha: { colors: ['#03060F', '#091330', '#12234A'], locations: [0, 0.6, 1] },
};

/** Top-of-screen washes that fade into navy (pixel stops in the design). */
export const INNER: Gradient & { height: number } = {
  colors: ['#3A2459', '#1A1A44', SC.navy],
  locations: [0, 0.5, 1],
  height: 360,
};
export const MEMBER_WASH: Gradient & { height: number } = {
  colors: ['#5B3A78', '#251E4E', SC.navy],
  locations: [0, 0.52, 1],
  height: 420,
};

export const FONT = {
  300: 'Outfit_300Light',
  400: 'Outfit_400Regular',
  500: 'Outfit_500Medium',
  600: 'Outfit_600SemiBold',
  700: 'Outfit_700Bold',
  800: 'Outfit_800ExtraBold',
} as const;
