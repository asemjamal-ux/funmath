import { UNLOCK_STARS } from '../constants';
import { isTopic, type Operation, type Skill, type SkillId, type Stage } from '../math/types';

export interface UnlockInput {
  skills: readonly Skill[]; // MVP skills only
  startingStage: Stage;
  unlockAll: boolean;
  stars: (id: SkillId) => number;
}

/** The advanced Worlds (fractions, decimals, area & perimeter) belong to Stages 4–5 (decision 005). */
export const ADVANCED_FROM_STAGE = 4;

/**
 * Skills a learner sees (decisions 004, 005): a profile started at a higher Stage goes straight to its own skills, so
 * basics from earlier Stages are hidden unless a grown-up turns "show earlier skills" on. Within each World the
 * cut-off is capped at that World's top Stage, so Stage 4–5 learners keep the Stage 3 arithmetic facts. The advanced
 * Worlds appear only from Stage 4, or when a grown-up unlocks everything.
 */
export function visibleSkills<S extends { stage: number; operation: Operation }>(
  skills: readonly S[],
  startingStage: number,
  showEarlier: boolean,
  unlockAll = false,
): S[] {
  const top = new Map<Operation, number>();
  for (const s of skills) top.set(s.operation, Math.max(top.get(s.operation) ?? 0, s.stage));
  return skills.filter((s) => {
    if (isTopic(s.operation) && startingStage < ADVANCED_FROM_STAGE && !unlockAll) return false;
    if (showEarlier) return true;
    return s.stage >= Math.min(startingStage, top.get(s.operation) ?? s.stage);
  });
}

/** PRD §6.9 World unlock rules. */
export function isWorldOpen(op: Operation, input: UnlockInput): boolean {
  if (input.unlockAll) return true;
  switch (op) {
    case 'addition':
    case 'subtraction':
      return true;
    case 'multiplication':
      return input.stars('ADD-05') >= UNLOCK_STARS || input.startingStage >= 2;
    case 'division':
      return input.stars('MUL-02') >= UNLOCK_STARS || input.startingStage >= 3;
    case 'fractions':
    case 'decimals':
    case 'geometry':
      return input.startingStage >= ADVANCED_FROM_STAGE;
  }
}

/** PRD §6.9 Skill unlock rules within an open World. */
export function isSkillUnlocked(skill: Skill, input: UnlockInput): boolean {
  if (input.unlockAll) return true;
  if (!isWorldOpen(skill.operation, input)) return false;
  if (input.stars(skill.id) > 0) return true;
  const world = input.skills.filter((s) => s.operation === skill.operation).sort((a, b) => a.order - b.order);
  const idx = world.findIndex((s) => s.id === skill.id);
  if (idx <= 0) return true;
  if (skill.stage < input.startingStage) return true;
  // First Skill of the chosen starting Stage in each open World.
  const firstOfStage = world.find((s) => s.stage === input.startingStage);
  if (firstOfStage?.id === skill.id) return true;
  const prev = world[idx - 1];
  return prev !== undefined && input.stars(prev.id) >= UNLOCK_STARS;
}
