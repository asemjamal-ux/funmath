import { UNLOCK_STARS } from '../constants';
import type { Operation, Skill, SkillId, Stage } from '../math/types';

export interface UnlockInput {
  skills: readonly Skill[]; // MVP skills only
  startingStage: Stage;
  unlockAll: boolean;
  stars: (id: SkillId) => number;
}

/**
 * Skills a learner sees (decision 004): a profile started at a higher Stage goes straight to its own skills, so
 * basics from earlier Stages are hidden unless a grown-up turns "show earlier skills" on. Stage 4–5 profiles see the
 * top MVP Stage, because Stages 4–5 have no MVP skills yet.
 */
export function visibleSkills<S extends { stage: number }>(skills: readonly S[], startingStage: number, showEarlier: boolean): S[] {
  if (showEarlier) return [...skills];
  const topStage = Math.max(...skills.map((s) => s.stage));
  const from = Math.min(startingStage, topStage);
  return skills.filter((s) => s.stage >= from);
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
