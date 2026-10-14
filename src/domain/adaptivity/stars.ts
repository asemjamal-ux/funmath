import {
  REVIEW_INTERVALS_DAYS,
  STAR2_FIRST_TRY_RATE,
  STAR2_MIN_SHARE_TIER2_PLUS,
  STAR3_DISTINCT_DAYS,
  STAR3_FIRST_TRY_RATE,
} from '../constants';
import type { Tier } from '../math/types';
import { addDays } from '../time';

export type Stars = 0 | 1 | 2 | 3;

export interface MasteryState {
  stars: Stars;
  tier3QualifyingDates: string[]; // YYYY-MM-DD, device local
  masteredAt?: string;
  nextReviewAt?: string; // YYYY-MM-DD
  reviewStep: number; // 0 = not mastered; 1..3 = which interval is pending
}

export interface SetResult {
  /** Tier of each item as presented. */
  tiers: Tier[];
  /** First-try correct flags per item. */
  firstTry: boolean[];
}

export function firstTryRate(r: SetResult): number {
  if (r.firstTry.length === 0) return 0;
  return r.firstTry.filter(Boolean).length / r.firstTry.length;
}

/** PRD §6.8 Star 1: Lesson completed with ≥ 1 guided try correct. Stars never decrease. */
export function afterLesson(state: MasteryState, guidedCorrect: number): MasteryState {
  if (guidedCorrect < 1 || state.stars >= 1) return state;
  return { ...state, stars: 1 };
}

/** Star 2 qualification: ≥ 80 % first-try with at least half the items at Tier 2+. */
export function qualifiesStar2(r: SetResult): boolean {
  const n = r.tiers.length;
  if (n === 0) return false;
  const tier2Plus = r.tiers.filter((t) => t >= 2).length;
  return firstTryRate(r) >= STAR2_FIRST_TRY_RATE && tier2Plus >= n * STAR2_MIN_SHARE_TIER2_PLUS;
}

/** Star 3 qualification for one set: ≥ 90 % first-try with every item at Tier 3 (decision 004). */
export function qualifiesStar3Set(r: SetResult): boolean {
  return r.tiers.length > 0 && r.tiers.every((t) => t === 3) && firstTryRate(r) >= STAR3_FIRST_TRY_RATE;
}

/** Applies a completed (non-partial) Practice Set. `today` is the injected local date YYYY-MM-DD. */
export function afterPracticeSet(state: MasteryState, r: SetResult, today: string): MasteryState {
  let next: MasteryState = { ...state, tier3QualifyingDates: [...state.tier3QualifyingDates] };
  if (qualifiesStar2(r) && next.stars < 2) next.stars = 2;
  if (qualifiesStar3Set(r) && !next.tier3QualifyingDates.includes(today)) {
    next.tier3QualifyingDates.push(today);
  }
  if (next.stars < 3 && next.tier3QualifyingDates.length >= STAR3_DISTINCT_DAYS) {
    next = {
      ...next,
      stars: 3,
      masteredAt: today,
      reviewStep: 1,
      nextReviewAt: addDays(today, REVIEW_INTERVALS_DAYS[0]),
    };
  }
  return next;
}

export function isReviewDue(state: MasteryState, today: string): boolean {
  return state.stars === 3 && state.nextReviewAt !== undefined && state.nextReviewAt <= today;
}

/** Completing a due review moves to the next interval (+7 → +21 → +60, then every 60 days). */
export function afterReview(state: MasteryState, today: string): MasteryState {
  if (!isReviewDue(state, today)) return state;
  const step = Math.min(state.reviewStep + 1, REVIEW_INTERVALS_DAYS.length);
  const days: number = REVIEW_INTERVALS_DAYS[step - 1] ?? 60;
  return { ...state, reviewStep: step, nextReviewAt: addDays(today, days) };
}
