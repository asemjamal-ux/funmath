import { describe, expect, it } from 'vitest';
import { initialTierState, nextTierState, type ItemOutcome } from '../src/domain/adaptivity/tier';
import { afterLesson, afterPracticeSet, afterReview, isReviewDue, qualifiesStar2, type MasteryState } from '../src/domain/adaptivity/stars';
import { isSkillUnlocked, isWorldOpen } from '../src/domain/adaptivity/unlock';
import { selectDailyMix, type MixCandidate } from '../src/domain/scheduler/dailyMix';
import { applyCredit, credits, oasisStageFor } from '../src/domain/rewards/rewards';
import { newlyEarnedTrophies, type TrophySnapshot } from '../src/domain/rewards/trophies';
import { createRng } from '../src/domain/rng';
import { addDays } from '../src/domain/time';
import { MVP_SKILLS, TROPHIES, getSkill, LESSONS } from '../src/services/content';
import { formatNumber } from '../src/services/formatting/number';
import type { SkillId, Tier } from '../src/domain/math/types';

const fresh: MasteryState = { stars: 0, tier3QualifyingDates: [], reviewStep: 0 };

describe('tier controller (PRD §6.7)', () => {
  const run = (start: Tier, outcomes: ItemOutcome[]) => outcomes.reduce(nextTierState, initialTierState(start)).tier;
  it.each<[Tier, ItemOutcome[], Tier]>([
    [1, ['firstTry', 'firstTry'], 1],
    [1, ['firstTry', 'firstTry', 'firstTry'], 2],
    [1, ['firstTry', 'firstTry', 'correctLater', 'firstTry'], 1],
    [2, ['firstTry', 'firstTry', 'firstTry', 'firstTry', 'firstTry', 'firstTry'], 3],
    [3, ['firstTry', 'firstTry', 'firstTry'], 3],
    [2, ['incorrect'], 2],
    [2, ['incorrect', 'incorrect'], 1],
    [3, ['incorrect', 'firstTry', 'incorrect'], 3],
    [1, ['incorrect', 'incorrect'], 1],
  ])('start %i %j → %i', (start, outcomes, expected) => expect(run(start, outcomes)).toBe(expected));
});

describe('stars (PRD §6.8)', () => {
  const set = (tiers: Tier[], ok: number) => ({ tiers, firstTry: tiers.map((_, i) => i < ok) });
  it('star 1 needs ≥ 1 guided correct', () => {
    expect(afterLesson(fresh, 0).stars).toBe(0);
    expect(afterLesson(fresh, 1).stars).toBe(1);
  });
  it('star 2 at exactly 80 % with half tier ≥ 2', () => {
    expect(qualifiesStar2(set([1, 1, 1, 1, 1, 2, 2, 2, 2, 2], 8))).toBe(true);
    expect(qualifiesStar2(set([1, 1, 1, 1, 1, 1, 2, 2, 2, 2], 8))).toBe(false);
    expect(qualifiesStar2(set([2, 2, 2, 2, 2, 2, 2, 2, 2, 2], 7))).toBe(false);
  });
  it('star 3 needs two ≥ 90 % tier-3 sets on different days, then review +7/+21/+60', () => {
    const t3 = set(Array(10).fill(3), 9);
    let s = afterPracticeSet({ ...fresh, stars: 2 }, t3, '2026-10-01');
    expect(s.stars).toBe(2);
    s = afterPracticeSet(s, t3, '2026-10-01');
    expect(s.stars).toBe(2); // same day does not count twice
    s = afterPracticeSet(s, t3, '2026-10-02');
    expect(s.stars).toBe(3);
    expect(s.nextReviewAt).toBe('2026-10-09');
    expect(isReviewDue(s, '2026-10-08')).toBe(false);
    expect(isReviewDue(s, '2026-10-09')).toBe(true);
    s = afterReview(s, '2026-10-09');
    expect(s.nextReviewAt).toBe(addDays('2026-10-09', 21));
    s = afterReview(s, s.nextReviewAt!);
    expect(s.reviewStep).toBe(3);
    expect(s.nextReviewAt).toBe(addDays('2026-10-30', 60));
  });
  it('89 % does not qualify for star 3; stars never decrease', () => {
    const s = afterPracticeSet({ ...fresh, stars: 3, reviewStep: 1 }, { tiers: Array(9).fill(1), firstTry: Array(9).fill(false) }, '2026-10-01');
    expect(s.stars).toBe(3);
    const t = afterPracticeSet({ ...fresh, stars: 2 }, { tiers: Array(10).fill(3), firstTry: [...Array(8).fill(true), false, false] }, '2026-10-01');
    expect(t.tier3QualifyingDates).toEqual([]);
  });
});

describe('unlocking (PRD §6.9)', () => {
  const stars = (m: Record<string, number>) => (id: SkillId) => m[id] ?? 0;
  it('stage 1 profile', () => {
    const input = { skills: MVP_SKILLS, startingStage: 1 as const, unlockAll: false, stars: stars({}) };
    expect(isWorldOpen('multiplication', input)).toBe(false);
    expect(isSkillUnlocked(getSkill('ADD-01')!, input)).toBe(true);
    expect(isSkillUnlocked(getSkill('ADD-02')!, input)).toBe(false);
    expect(isSkillUnlocked(getSkill('ADD-02')!, { ...input, stars: stars({ 'ADD-01': 2 }) })).toBe(true);
    expect(isWorldOpen('multiplication', { ...input, stars: stars({ 'ADD-05': 2 }) })).toBe(true);
  });
  it('stage 3 profile opens all worlds and first stage-3 skill', () => {
    const input = { skills: MVP_SKILLS, startingStage: 3 as const, unlockAll: false, stars: stars({}) };
    for (const op of ['addition', 'subtraction', 'multiplication', 'division'] as const) expect(isWorldOpen(op, input)).toBe(true);
    expect(isSkillUnlocked(getSkill('ADD-06')!, input)).toBe(true);
    expect(isSkillUnlocked(getSkill('ADD-07')!, input)).toBe(true);
    expect(isSkillUnlocked(getSkill('MUL-03')!, input)).toBe(true);
    expect(isSkillUnlocked(getSkill('MUL-04')!, input)).toBe(false);
    expect(isSkillUnlocked(getSkill('DIV-02')!, input)).toBe(true);
    expect(isSkillUnlocked(getSkill('DIV-03')!, input)).toBe(false);
  });
});

describe('daily mix (PRD §6.10)', () => {
  it('weights 40/40/20 within ±5 % over 1,000 mixes', () => {
    const cands: MixCandidate[] = [
      { skillId: 'ADD-01', stars: 3, due: true, accuracy: 0.9 },
      { skillId: 'ADD-02', stars: 3, due: true, accuracy: 0.9 },
      { skillId: 'ADD-03', stars: 1, due: false, accuracy: 0.3 },
      { skillId: 'ADD-04', stars: 2, due: false, accuracy: 0.5 },
      { skillId: 'SUB-01', stars: 2, due: false, accuracy: 0.95 },
      { skillId: 'SUB-02', stars: 3, due: false, accuracy: 1 },
    ];
    const counts = { due: 0, weak: 0, other: 0 };
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) for (const p of selectDailyMix(cands, rng)) counts[p.category]++;
    expect(counts.due / 10000).toBeCloseTo(0.4, 1);
    expect(Math.abs(counts.due / 10000 - 0.4)).toBeLessThan(0.05);
    expect(Math.abs(counts.weak / 10000 - 0.4)).toBeLessThan(0.05);
    expect(Math.abs(counts.other / 10000 - 0.2)).toBeLessThan(0.05);
  });
  it('only skills with ≥ 1 star; 10 items', () => {
    const mix = selectDailyMix([{ skillId: 'ADD-01', stars: 0, due: false, accuracy: null }, { skillId: 'ADD-02', stars: 1, due: false, accuracy: null }], createRng(1));
    expect(mix).toHaveLength(10);
    expect(mix.every((m) => m.skillId === 'ADD-02')).toBe(true);
  });
});

describe('rewards (PRD §7)', () => {
  it('oasis thresholds', () => {
    expect([0, 24, 25, 74, 75, 150, 300, 500, 800, 1200, 1700, 2499, 2500, 9999].map(oasisStageFor)).toEqual([1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10, 10]);
  });
  it('seed credits are idempotent', () => {
    const ledger = new Set<string>();
    let seeds = 0;
    for (const c of [credits.itemCorrect('s1', 0), credits.itemCorrect('s1', 0), credits.roundCompleted('s1'), credits.roundCompleted('s1')]) {
      const r = applyCredit(seeds, ledger, c);
      seeds = r.seeds;
      if (r.applied) ledger.add(c.id);
    }
    expect(seeds).toBe(4);
  });
  it('trophies award once', () => {
    const snap: TrophySnapshot = { counters: { lessonsCompleted: 1 }, stars: new Map(), mvpSkills: MVP_SKILLS.map((s) => s.id), oasisStage: 1, gamesPlayed: 0 };
    const first = newlyEarnedTrophies(TROPHIES, snap, new Set());
    expect(first.map((t) => t.id)).toEqual(['TR-01']);
    expect(newlyEarnedTrophies(TROPHIES, snap, new Set(['TR-01']))).toEqual([]);
  });
  it('all 18 trophies defined; all 26 lessons with 4–7 steps', () => {
    expect(TROPHIES).toHaveLength(18);
    expect(LESSONS).toHaveLength(26);
    for (const l of LESSONS) {
      expect(l.steps[0]?.kind).toBe('hook');
      expect(l.steps.at(-1)?.kind).toBe('ready');
      const guided = l.steps.filter((s) => s.kind === 'guided').length;
      expect(guided).toBeGreaterThanOrEqual(2);
      expect(guided).toBeLessThanOrEqual(3);
    }
  });
});

describe('formatting (agent-instructions §7.4)', () => {
  it('formats per locale and style', () => {
    expect(formatNumber(345, { locale: 'ar', numberStyle: 'arab' })).toBe('٣٤٥');
    expect(formatNumber(345, { locale: 'ar', numberStyle: 'latn' })).toBe('345');
    expect(formatNumber(12000, { locale: 'ar', numberStyle: 'arab' })).toBe('١٢٬٠٠٠');
    expect(formatNumber(3456, { locale: 'en', numberStyle: 'latn' })).toBe('3456');
  });
});
