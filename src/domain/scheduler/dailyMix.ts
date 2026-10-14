import { DAILY_MIX_LENGTH, DAILY_MIX_WEIGHTS } from '../constants';
import type { Rng } from '../rng';
import type { SkillId } from '../math/types';

export interface MixCandidate {
  skillId: SkillId;
  stars: number;
  due: boolean;
  /** Recent first-try accuracy 0–1, or null when there is no history. */
  accuracy: number | null;
}

export type MixCategory = 'due' | 'weak' | 'other';

export interface MixPick {
  skillId: SkillId;
  category: MixCategory;
}

const WEAK_POOL_MAX = 3;

/** PRD §6.10: 10 items from unlocked Skills with ≥ 1 Star, weighted 40 % due / 40 % weak / 20 % other. */
export function selectDailyMix(candidates: readonly MixCandidate[], rng: Rng, length = DAILY_MIX_LENGTH): MixPick[] {
  const eligible = candidates.filter((c) => c.stars >= 1);
  if (eligible.length === 0) return [];
  const due = eligible.filter((c) => c.due);
  const weakSorted = eligible
    .filter((c) => !c.due && (c.stars === 1 || c.stars === 2))
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
  const weak = weakSorted.slice(0, Math.min(WEAK_POOL_MAX, Math.max(1, Math.ceil(weakSorted.length / 2))));
  const used = new Set([...due, ...weak].map((c) => c.skillId));
  const other = eligible.filter((c) => !used.has(c.skillId));
  const pools: Array<[MixCategory, MixCandidate[], number]> = [
    ['due', due, DAILY_MIX_WEIGHTS.due],
    ['weak', weak, DAILY_MIX_WEIGHTS.weak],
    ['other', other, DAILY_MIX_WEIGHTS.other],
  ];
  const active = pools.filter(([, list]) => list.length > 0);
  const total = active.reduce((s, [, , w]) => s + w, 0);
  const picks: MixPick[] = [];
  for (let i = 0; i < length; i++) {
    let r = rng.next() * total;
    let chosen = active[active.length - 1] as [MixCategory, MixCandidate[], number];
    for (const p of active) {
      if (r < p[2]) {
        chosen = p;
        break;
      }
      r -= p[2];
    }
    picks.push({ skillId: rng.pick(chosen[1]).skillId, category: chosen[0] });
  }
  return picks;
}
