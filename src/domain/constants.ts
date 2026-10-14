// Every number here comes from product-requirements.md; change only with a Product-approved decision record.

/** PRD §5 / §6.4: Practice Set lengths. */
export const PRACTICE_SET_LENGTH_STAGE1 = 8;
export const PRACTICE_SET_LENGTH_OTHER = 10;
/** PRD §6.6: re-queues can extend a set to at most 12 items. */
export const PRACTICE_SET_MAX_LENGTH = 12;

/** PRD §6.7 adaptivity. */
export const STEP_UP_AFTER_FIRST_TRY_CORRECT = 3;
export const STEP_DOWN_AFTER_INCORRECT = 2;
export const MIN_TIER = 1;
export const MAX_TIER = 3;

/** PRD §6.8 Stars. */
export const STAR2_FIRST_TRY_RATE = 0.8;
export const STAR2_MIN_SHARE_TIER2_PLUS = 0.5;
export const STAR3_FIRST_TRY_RATE = 0.9;
export const STAR3_DISTINCT_DAYS = 2;
/** PRD §6.8: review intervals after mastery, in days. */
export const REVIEW_INTERVALS_DAYS = [7, 21, 60] as const;

/** PRD §6.9: a Skill (and the next World) unlocks at 2 Stars on its predecessor. */
export const UNLOCK_STARS = 2;

/** PRD §6.10 Daily Mix. */
export const DAILY_MIX_LENGTH = 10;
export const DAILY_MIX_WEIGHTS = { due: 0.4, weak: 0.4, other: 0.2 } as const;

/** PRD §7.1 Seeds. */
export const SEEDS_LESSON_COMPLETED = 5;
export const SEEDS_ITEM_CORRECT = 1;
export const SEEDS_ROUND_COMPLETED = 3;
export const SEEDS_DAILY_MIX_BONUS = 5;
/** PRD §7.1: cumulative Seed thresholds for Oasis Stages 1–10. */
export const OASIS_THRESHOLDS = [0, 25, 75, 150, 300, 500, 800, 1200, 1700, 2500] as const;

/** PRD §9 Games. */
export const BUBBLE_POP_ITEMS = 8;
export const NUMBER_LINE_HOP_ITEMS = 6;
export const MATCH_PAIRS_PAIRS = 6;

/** PRD A-09. */
export const MAX_PROFILES = 6;
/** FR-03. */
export const NICKNAME_MAX_LENGTH = 12;

/** FR-31 report rules. */
export const REPORT_ACCURACY_WINDOW_DAYS = 30;
export const NEEDS_HELP_ACCURACY = 0.6;
export const NEEDS_HELP_MIN_ITEMS = 10;

/** ARCH §5.3 retention. */
export const ITEM_RESPONSE_RETENTION_DAYS = 90;

/** FR-30 / agent-instructions §11 Grown-up Gate. */
export const GATE_HOLD_MS = 2000;
export const GATE_MAX_ATTEMPTS = 3;
export const GATE_COOLDOWN_MS = 30_000;
export const PIN_PBKDF2_ITERATIONS = 150_000;

/** FR-32 break reminder options (minutes, 0 = off). */
export const BREAK_REMINDER_OPTIONS = [0, 10, 15, 20, 30, 45] as const;
export const DEFAULT_BREAK_REMINDER = 20;
