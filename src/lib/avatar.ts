// Avatars: DiceBear "Fun Emoji" by Davis Uche (CC BY 4.0), drawn on the person's chosen colour.
// https://www.dicebear.com/styles/fun-emoji/

const BASE = 'https://api.dicebear.com/9.x/fun-emoji/png';

/** PNG URL for a seed at a display size (fetched at 3× for sharp screens). */
export function avatarUrl(seed: string, size: number) {
  const px = Math.min(512, Math.max(48, Math.round(size * 3)));
  return `${BASE}?seed=${encodeURIComponent(seed)}&size=${px}&backgroundColor=transparent`;
}

/** A handful of fresh seeds to pick from. */
export function randomSeeds(n: number) {
  return Array.from({ length: n }, () => Math.random().toString(36).slice(2, 10));
}

export const AVATAR_CREDIT = 'Avatars: “Fun Emoji” by Davis Uche, CC BY 4.0, via DiceBear';
