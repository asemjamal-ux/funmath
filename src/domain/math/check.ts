import type { Item } from './types';

const EASTERN_ARABIC_ZERO = 0x0660;
const PERSIAN_ZERO = 0x06f0;

/** Maps ٠–٩ and ۰–۹ to 0–9; strips spaces and grouping separators (, ٬ . ’). */
export function parseDigits(input: string): number | null {
  let normalised = '';
  for (const ch of input.trim()) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= EASTERN_ARABIC_ZERO && code <= EASTERN_ARABIC_ZERO + 9) normalised += String(code - EASTERN_ARABIC_ZERO);
    else if (code >= PERSIAN_ZERO && code <= PERSIAN_ZERO + 9) normalised += String(code - PERSIAN_ZERO);
    else if (ch >= '0' && ch <= '9') normalised += ch;
    else if (/[\s,٬.'’٫  ]/.test(ch)) continue;
    else return null;
  }
  if (normalised === '') return null;
  const n = Number(normalised);
  return Number.isSafeInteger(n) ? n : null;
}

export function checkAnswer(item: Item, input: string | number): boolean {
  const n = typeof input === 'number' ? input : parseDigits(input);
  return n !== null && Number.isInteger(n) && n === item.answer;
}
