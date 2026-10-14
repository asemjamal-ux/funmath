import { MAX_TIER, MIN_TIER, STEP_DOWN_AFTER_INCORRECT, STEP_UP_AFTER_FIRST_TRY_CORRECT } from '../constants';
import type { Tier } from '../math/types';

export interface TierState {
  tier: Tier;
  firstTryStreak: number;
  incorrectStreak: number;
}

/** Outcome of one item: first-try correct, correct after a retry/hint, or incorrect (two wrong attempts). */
export type ItemOutcome = 'firstTry' | 'correctLater' | 'incorrect';

export function initialTierState(tier: Tier): TierState {
  return { tier, firstTryStreak: 0, incorrectStreak: 0 };
}

/** PRD §6.7: up after 3 consecutive first-try correct; down after 2 consecutive incorrect. */
export function nextTierState(state: TierState, outcome: ItemOutcome): TierState {
  switch (outcome) {
    case 'firstTry': {
      const streak = state.firstTryStreak + 1;
      if (streak >= STEP_UP_AFTER_FIRST_TRY_CORRECT && state.tier < MAX_TIER)
        return { tier: (state.tier + 1) as Tier, firstTryStreak: 0, incorrectStreak: 0 };
      return { tier: state.tier, firstTryStreak: streak, incorrectStreak: 0 };
    }
    case 'incorrect': {
      const streak = state.incorrectStreak + 1;
      if (streak >= STEP_DOWN_AFTER_INCORRECT && state.tier > MIN_TIER)
        return { tier: (state.tier - 1) as Tier, firstTryStreak: 0, incorrectStreak: 0 };
      return { tier: state.tier, firstTryStreak: 0, incorrectStreak: streak };
    }
    case 'correctLater':
      return { tier: state.tier, firstTryStreak: 0, incorrectStreak: 0 };
    default: {
      const never: never = outcome;
      return never;
    }
  }
}
