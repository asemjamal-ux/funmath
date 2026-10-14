import { afterLesson, afterPracticeSet, afterReview, isReviewDue, type SetResult } from '../../domain/adaptivity/stars';
import { eventBus } from '../../domain/events/bus';
import type { GameId, Item, SkillId, Tier } from '../../domain/math/types';
import { credits } from '../../domain/rewards/rewards';
import { newlyEarnedTrophies } from '../../domain/rewards/trophies';
import { localDateString } from '../../domain/time';
import { useApp, type Celebration } from '../../app/store';
import { appClock } from '../../services/clock';
import { MVP_SKILLS, TROPHIES } from '../../services/content';
import type { Activity, SkillProgressRow } from '../../services/storage/db';
import {
  addCounterMember,
  addDailyMixBonusDate,
  awardTrophy,
  bumpCounter,
  creditSeeds,
  getProgress,
  loadProfileData,
  recordItemResponse,
  saveProgress,
} from '../../services/storage/repo';

export interface Outcome {
  seedsAdded: number;
  celebrations: Celebration[];
  starsBefore?: number;
  starsAfter?: number;
}

/** Marks a one-off fact (e.g. "this session already bumped a counter") in the idempotency ledger. */
async function once(profileId: string, key: string): Promise<boolean> {
  return (await creditSeeds(profileId, { id: `once:${key}`, amount: 0 }, appClock.now())).applied;
}

async function evaluate(profileId: string, stageBefore: number, stageAfter: number): Promise<Celebration[]> {
  const data = await loadProfileData(profileId);
  if (!data) return [];
  const now = appClock.now();
  const out: Celebration[] = [];
  if (stageAfter > stageBefore) {
    out.push({ kind: 'oasis', stage: stageAfter });
    eventBus.publish({ type: 'oasisStage.reached', profileId, stage: stageAfter });
  }
  const counters: Record<string, number> = {};
  for (const [k, v] of data.counters) counters[k] = v.value;
  const snapshot = {
    counters,
    stars: new Map([...data.progress].map(([k, v]) => [k, v.stars])),
    mvpSkills: MVP_SKILLS.map((s) => s.id),
    oasisStage: data.rewards.oasisStage,
    gamesPlayed: counters.gamesPlayed ?? 0,
  };
  const awarded = new Set(data.trophies.map((t) => t.trophyId));
  for (const t of newlyEarnedTrophies(TROPHIES, snapshot, awarded)) {
    if (await awardTrophy(profileId, t.id, now)) {
      out.push({ kind: 'trophy', trophyId: t.id });
      eventBus.publish({ type: 'trophy.awarded', profileId, trophyId: t.id });
    }
  }
  return out;
}

async function finish(profileId: string, outcome: Outcome, stageBefore: number, stageAfter: number): Promise<Outcome> {
  outcome.celebrations = await evaluate(profileId, stageBefore, stageAfter);
  const app = useApp.getState();
  await app.refresh();
  app.pushCelebrations(outcome.celebrations);
  return outcome;
}

async function setStars(row: SkillProgressRow, next: SkillProgressRow): Promise<void> {
  await saveProgress(next);
  if (next.stars !== row.stars) {
    eventBus.publish({ type: 'stars.changed', profileId: row.profileId, skillId: row.skillId, from: row.stars, to: next.stars });
  }
}

export interface AnsweredInput {
  profileId: string;
  activity: Activity;
  sessionId: string;
  itemIndex: number;
  item: Item;
  answerGiven: number | null;
  correct: boolean;
  firstTry: boolean;
  hintsUsed: number;
  /** True when the learner saw a hint (requested or automatic after a first wrong try). */
  hadHint: boolean;
  durationMs: number;
}

/** Persists one answered item before the next renders (NFR-05) and credits Seeds idempotently. */
export async function recordAnswered(input: AnsweredInput): Promise<Outcome> {
  const now = appClock.now();
  const today = localDateString(now);
  const { profileId, item } = input;
  const isNew = await recordItemResponse({
    responseKey: `${input.sessionId}:${input.itemIndex}`,
    profileId,
    skillId: item.skillId,
    activity: input.activity,
    sessionId: input.sessionId,
    tier: item.tier,
    format: item.format,
    itemSpec: { operation: item.operation, operands: item.operands, blank: item.blank },
    answerGiven: input.answerGiven,
    correct: input.correct,
    firstTry: input.firstTry,
    hintsUsed: input.hintsUsed,
    durationMs: input.durationMs,
    answeredAt: now.toISOString(),
  });
  eventBus.publish({
    type: 'item.answered', profileId, skillId: item.skillId, activity: input.activity, tier: item.tier,
    correct: input.correct, firstTry: input.firstTry, hintsUsed: input.hintsUsed, durationMs: input.durationMs,
  });
  let seedsAdded = 0;
  let stageBefore = 0;
  let stageAfter = 0;
  if (input.correct && input.activity !== 'lesson') {
    const r = await creditSeeds(profileId, credits.itemCorrect(input.sessionId, input.itemIndex), now);
    if (r.applied) seedsAdded = 1;
    stageBefore = r.stageBefore;
    stageAfter = r.stageAfter;
  }
  if (isNew) {
    if (input.correct && input.hadHint) await bumpCounter(profileId, 'correctAfterHint');
    if (input.activity === 'practice' || input.activity === 'dailyMix') await addCounterMember(profileId, 'distinctPracticeDays', today);
    // A correct Daily Mix answer on a due Skill completes that review (PRD §6.8).
    if (input.activity === 'dailyMix' && input.correct) {
      const row = await getProgress(profileId, item.skillId);
      if (isReviewDue(row, today)) await saveProgress({ ...row, ...afterReview(row, today) });
    }
  }
  return finish(profileId, { seedsAdded, celebrations: [] }, stageBefore, stageAfter);
}

export async function completeLesson(profileId: string, skillId: SkillId, sessionId: string, guidedCorrect: number): Promise<Outcome> {
  const now = appClock.now();
  const row = await getProgress(profileId, skillId);
  const next: SkillProgressRow = { ...row, ...afterLesson(row, guidedCorrect), lessonCompletedAt: localDateString(now) };
  await setStars(row, next);
  eventBus.publish({ type: 'lesson.completed', profileId, skillId, guidedCorrect, sessionId });
  const r = await creditSeeds(profileId, credits.lessonCompleted(sessionId), now);
  if (r.applied) await bumpCounter(profileId, 'lessonsCompleted');
  return finish(profileId, { seedsAdded: r.applied ? 5 : 0, celebrations: [], starsBefore: row.stars, starsAfter: next.stars }, r.stageBefore, r.stageAfter);
}

export async function completePracticeSet(profileId: string, skillId: SkillId, sessionId: string, result: SetResult, finalTier: Tier): Promise<Outcome> {
  const now = appClock.now();
  const today = localDateString(now);
  const row = await getProgress(profileId, skillId);
  let next: SkillProgressRow = { ...row, ...afterPracticeSet(row, result, today), currentTier: finalTier };
  if (isReviewDue(next, today) && result.firstTry.filter(Boolean).length / Math.max(1, result.firstTry.length) >= 0.8) {
    next = { ...next, ...afterReview(next, today) };
  }
  const firstOnce = await once(profileId, `practiceDone:${sessionId}`);
  if (firstOnce) await setStars(row, next);
  eventBus.publish({ type: 'practiceSet.completed', profileId, skillId, firstTryRate: result.firstTry.filter(Boolean).length / Math.max(1, result.firstTry.length) });
  const r = await creditSeeds(profileId, credits.roundCompleted(sessionId), now);
  if (firstOnce) await bumpCounter(profileId, 'practiceSetsCompleted');
  return finish(profileId, { seedsAdded: r.applied ? 3 : 0, celebrations: [], starsBefore: row.stars, starsAfter: firstOnce ? next.stars : row.stars }, r.stageBefore, r.stageAfter);
}

export async function completeDailyMix(profileId: string, sessionId: string): Promise<Outcome & { bonus: boolean }> {
  const now = appClock.now();
  const today = localDateString(now);
  eventBus.publish({ type: 'dailyMix.completed', profileId, date: today });
  // +5 bonus for the first Daily Mix each calendar day; the credit id is the date, so a second mix earns nothing extra.
  const r = await creditSeeds(profileId, credits.dailyMixBonus(today), now);
  if (r.applied) await addDailyMixBonusDate(profileId, today);
  if (await once(profileId, `dailyMixDone:${sessionId}`)) await bumpCounter(profileId, 'dailyMixCompleted');
  const out = await finish(profileId, { seedsAdded: r.applied ? 5 : 0, celebrations: [] }, r.stageBefore, r.stageAfter);
  return { ...out, bonus: r.applied };
}

export async function completeGameRound(profileId: string, gameId: GameId, skillId: SkillId, sessionId: string, correctCount: number): Promise<Outcome> {
  const now = appClock.now();
  eventBus.publish({ type: 'gameRound.completed', profileId, gameId, skillId, correctCount });
  const r = await creditSeeds(profileId, credits.roundCompleted(sessionId), now);
  await addCounterMember(profileId, 'gamesPlayed', gameId);
  return finish(profileId, { seedsAdded: r.applied ? 3 : 0, celebrations: [] }, r.stageBefore, r.stageAfter);
}

export async function saveTier(profileId: string, skillId: SkillId, tier: Tier): Promise<void> {
  const row = await getProgress(profileId, skillId);
  if (row.currentTier !== tier) await saveProgress({ ...row, currentTier: tier });
}
