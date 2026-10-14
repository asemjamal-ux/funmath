import type { Rng } from '../rng';
import { additionWithoutCarry, subtractionSmallerFromLarger } from './digits';
import type { Item, Skill } from './types';

export function distractorCount(skill: Skill): number {
  // PRD §6.4: 3 options at Stage 1, 4 options at Stage 2+.
  return skill.stage === 1 ? 2 : 3;
}

/** Common error patterns first (PRD §6.5 rule 6), then nearby values. */
function patternCandidates(item: Item): number[] {
  const [a, b, c] = item.operands;
  const ans = item.answer;
  const out: number[] = [];
  if (item.blank !== 'result') {
    // Missing-number slips: giving the total, or adding instead of finding the gap.
    out.push(c, a + b, ans + 2, ans - 2, ans + 3);
    return out;
  }
  switch (item.operation) {
    case 'addition':
      out.push(additionWithoutCarry(a, b), Math.abs(a - b), ans + 10, ans - 10, ans + 2, ans - 2);
      break;
    case 'subtraction':
      out.push(subtractionSmallerFromLarger(a, b), a + b, ans + 10, ans - 10, ans + 2, ans - 2);
      break;
    case 'multiplication':
      out.push(a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a + b);
      break;
    case 'division':
      out.push(ans + 2, ans - 2, b, a - b, ans * 2);
      break;
  }
  return out;
}

/**
 * Unique, non-negative, ≠ answer, within the Skill's catalogue range, at most one off-by-one (P-07).
 */
export function makeDistractors(item: Item, skill: Skill, rng: Rng): number[] {
  const want = distractorCount(skill);
  const max = skill.generator.valueMax;
  const ans = item.answer;
  const chosen: number[] = [];
  let offByOneUsed = false;

  const tryAdd = (v: number): void => {
    if (chosen.length >= want) return;
    if (!Number.isInteger(v) || v < 0 || v > max || v === ans || chosen.includes(v)) return;
    const offByOne = Math.abs(v - ans) === 1;
    if (offByOne && offByOneUsed) return;
    if (offByOne) offByOneUsed = true;
    chosen.push(v);
  };

  const patterns = rng.shuffle(patternCandidates(item));
  // Always offer one off-by-one when possible: it's the most common slip.
  tryAdd(rng.next() < 0.5 ? ans + 1 : ans - 1);
  for (const p of patterns) tryAdd(p);

  // Fill with nearby values, widening the window until enough are found.
  for (let spread = 2; chosen.length < want && spread <= max + 2; spread++) {
    const candidates = rng.shuffle([ans - spread, ans + spread]);
    for (const v of candidates) tryAdd(v);
  }
  if (chosen.length < want) {
    for (let v = 0; v <= max && chosen.length < want; v++) tryAdd(v);
  }
  return chosen;
}
