import {
  OASIS_THRESHOLDS,
  SEEDS_DAILY_MIX_BONUS,
  SEEDS_ITEM_CORRECT,
  SEEDS_LESSON_COMPLETED,
  SEEDS_ROUND_COMPLETED,
} from '../constants';

/** PRD §7.1: Oasis Stage 1–10 from cumulative Seeds. */
export function oasisStageFor(seeds: number): number {
  let stage = 0;
  for (const t of OASIS_THRESHOLDS) if (seeds >= t) stage++;
  return Math.max(1, stage);
}

export function seedsToNextStage(seeds: number): number | null {
  const next = OASIS_THRESHOLDS.find((t) => t > seeds);
  return next === undefined ? null : next - seeds;
}

/**
 * A Seed credit with a stable id. Crediting the same id twice is a no-op (FR-23), so replaying
 * events or reloading mid-set never duplicates Seeds.
 */
export interface SeedCredit {
  id: string;
  amount: number;
}

export const credits = {
  itemCorrect: (sessionId: string, itemIndex: number): SeedCredit => ({ id: `item:${sessionId}:${itemIndex}`, amount: SEEDS_ITEM_CORRECT }),
  roundCompleted: (sessionId: string): SeedCredit => ({ id: `round:${sessionId}`, amount: SEEDS_ROUND_COMPLETED }),
  lessonCompleted: (sessionId: string): SeedCredit => ({ id: `lesson:${sessionId}`, amount: SEEDS_LESSON_COMPLETED }),
  dailyMixBonus: (date: string): SeedCredit => ({ id: `dailyMixBonus:${date}`, amount: SEEDS_DAILY_MIX_BONUS }),
};

/** Pure ledger application: returns the new total and whether the credit was new. */
export function applyCredit(seeds: number, ledger: ReadonlySet<string>, credit: SeedCredit): { seeds: number; applied: boolean } {
  if (ledger.has(credit.id)) return { seeds, applied: false };
  return { seeds: seeds + credit.amount, applied: true };
}
