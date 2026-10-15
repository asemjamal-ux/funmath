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

const DECIMAL_POINTS = new Set(['.', '٫', ',']);

/** Decimal answers (decimals World): one decimal point (. ٫ or ,) with Western, Eastern Arabic or Persian digits. */
export function parseDecimal(input: string): number | null {
  const chars = [...input.trim()];
  const point = chars.findIndex((ch) => DECIMAL_POINTS.has(ch));
  if (point < 0) return parseDigits(chars.join(''));
  const whole = chars.slice(0, point).join('');
  const frac = chars.slice(point + 1);
  if (frac.some((ch) => DECIMAL_POINTS.has(ch))) return null;
  const w = whole === '' ? 0 : parseDigits(whole);
  if (w === null) return null;
  if (frac.length === 0) return w;
  const f = parseDigits(frac.join(''));
  if (f === null) return null;
  return Number(`${w}.${String(f).padStart(frac.length, '0')}`);
}

export function checkAnswer(item: Item, input: string | number): boolean {
  const n = typeof input === 'number' ? input : item.dp ? parseDecimal(input) : parseDigits(input);
  if (n === null) return false;
  // Decimal answers are compared at the item's precision, so float noise can't mark a right answer wrong.
  if (item.dp) return Math.abs(n - item.answer) < 10 ** -(item.dp + 3);
  return Number.isInteger(n) && n === item.answer;
}
