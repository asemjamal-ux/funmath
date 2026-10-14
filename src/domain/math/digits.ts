/** Place-value helpers used by generators, distractors, validation and worked examples. */

export function digitsOf(n: number): number[] {
  // ones first
  const out: number[] = [];
  let x = Math.abs(Math.trunc(n));
  do {
    out.push(x % 10);
    x = Math.floor(x / 10);
  } while (x > 0);
  return out;
}

export function digitAt(n: number, place: number): number {
  return Math.floor(n / 10 ** place) % 10;
}

/** Number of columns in which a + b produces a carry. */
export function additionCarries(a: number, b: number): number {
  let carry = 0;
  let count = 0;
  const places = Math.max(digitsOf(a).length, digitsOf(b).length);
  for (let p = 0; p < places; p++) {
    const s = digitAt(a, p) + digitAt(b, p) + carry;
    carry = s >= 10 ? 1 : 0;
    if (carry) count++;
  }
  return count;
}

/** Number of columns in which a − b needs to borrow. */
export function subtractionBorrows(a: number, b: number): number {
  let borrow = 0;
  let count = 0;
  const places = Math.max(digitsOf(a).length, digitsOf(b).length);
  for (let p = 0; p < places; p++) {
    const d = digitAt(a, p) - borrow - digitAt(b, p);
    borrow = d < 0 ? 1 : 0;
    if (borrow) count++;
  }
  return count;
}

/** True when a − b must borrow from a zero tens digit (e.g. 302 − 158). */
export function regroupsAcrossZero(a: number, b: number): boolean {
  return a >= 100 && digitAt(a, 1) === 0 && digitAt(a, 0) < digitAt(b, 0);
}

/** "Forgot to carry" slip: add each column, keep only the ones digit of each column sum. */
export function additionWithoutCarry(a: number, b: number): number {
  const places = Math.max(digitsOf(a).length, digitsOf(b).length);
  let out = 0;
  for (let p = 0; p < places; p++) out += ((digitAt(a, p) + digitAt(b, p)) % 10) * 10 ** p;
  return out;
}

/** "Smaller from larger" slip: subtract the smaller digit from the larger in each column. */
export function subtractionSmallerFromLarger(a: number, b: number): number {
  const places = Math.max(digitsOf(a).length, digitsOf(b).length);
  let out = 0;
  for (let p = 0; p < places; p++) out += Math.abs(digitAt(a, p) - digitAt(b, p)) * 10 ** p;
  return out;
}
