import { PRACTICE_SET_LENGTH_OTHER, PRACTICE_SET_LENGTH_STAGE1, PRACTICE_SET_MAX_LENGTH } from '../constants';
import { generateItem, isTrivialFact, sameItem, type GenerateOptions } from './generate';
import type { Item, Skill, Tier } from './types';

export const MAX_TRIVIAL_FACTS_PER_SET = 2; // P-06

export function practiceSetLength(skill: Skill): number {
  return skill.stage === 1 ? PRACTICE_SET_LENGTH_STAGE1 : PRACTICE_SET_LENGTH_OTHER;
}

/**
 * Next item for a set, honouring set-level rules: no item identical to any earlier item in the set (§6.5 rule 7)
 * and at most two ×0/×1 facts (P-06).
 */
export function nextSetItem(skill: Skill, tier: Tier, seed: number, index: number, previous: readonly Item[], opts: GenerateOptions = {}): Item {
  const trivialCount = previous.filter(isTrivialFact).length;
  const overCap = (c: Item) => trivialCount >= MAX_TRIVIAL_FACTS_PER_SET && isTrivialFact(c);
  const strict = (c: Item) => previous.some((p) => sameItem(p, c)) || overCap(c) || (opts.reject?.(c) ?? false);
  const item = generateItem(skill, tier, seed, index, { ...opts, reject: strict });
  if (!strict(item)) return item;
  // Some Stage 1 Tiers have fewer distinct facts than a set has items; then only forbid back-to-back repeats.
  const last = previous[previous.length - 1];
  const relaxed = (c: Item) => (last !== undefined && sameItem(last, c)) || overCap(c) || (opts.reject?.(c) ?? false);
  return generateItem(skill, tier, seed, index, { ...opts, reject: relaxed });
}

/** A similar (same Skill/Tier/operation/format), never identical, item for a re-queue after a Worked Example. */
export function similarItem(skill: Skill, original: Item, seed: number, index: number, previous: readonly Item[]): Item {
  return nextSetItem(skill, original.tier, seed, index, [...previous.filter((p) => !sameItem(p, original)), original], {
    format: original.format,
    reject: (c) => c.operation !== original.operation || c.blank !== original.blank || sameItem(c, original),
  });
}

export function canRequeue(plannedLength: number): boolean {
  return plannedLength < PRACTICE_SET_MAX_LENGTH;
}

/** Position for a re-queued item: two items later when possible, otherwise at the end (never immediately next). */
export function requeuePosition(currentIndex: number, plannedLength: number): number {
  return Math.min(currentIndex + 3, plannedLength);
}
