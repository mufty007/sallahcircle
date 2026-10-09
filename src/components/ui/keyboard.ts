// The focused Screen registers how to scroll a focused input into view; inputs call it on focus.
let revealActive: (() => void) | null = null;

export function setRevealHandler(fn: (() => void) | null, only?: () => void) {
  if (fn) revealActive = fn;
  else if (revealActive === only) revealActive = null;
}

/** Call from an input's onFocus so moving between fields keeps the new one above the keyboard. */
export function revealFocusedInput() {
  setTimeout(() => revealActive?.(), 60);
}
