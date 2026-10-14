import skillsJson from '../../content/skills.json';
import trophiesJson from '../../content/trophies.json';
import lessonsJson from '../../content/lessons.json';
import type { GameId, Operation, Skill, SkillId } from '../../domain/math/types';
import type { TrophyDefinition } from '../../domain/rewards/trophies';
import type { Lesson } from './schemas';

// Content is validated with Zod at build (scripts/validate-content.ts), so the runtime bundle doesn't ship Zod;
// dev builds re-validate to catch edits made while the dev server runs.
export const SKILLS: readonly Skill[] = skillsJson as Skill[];
export const MVP_SKILLS: readonly Skill[] = SKILLS.filter((s) => s.scope === 'mvp');
export const TROPHIES: readonly TrophyDefinition[] = trophiesJson as TrophyDefinition[];
export const LESSONS: readonly Lesson[] = lessonsJson as Lesson[];

if (import.meta.env.DEV) {
  void import('./schemas').then(async ({ lessonSchema, skillSchema, trophySchema }) => {
    const { z } = await import('zod');
    z.array(skillSchema).parse(skillsJson);
    z.array(lessonSchema).parse(lessonsJson);
    z.array(trophySchema).parse(trophiesJson);
  });
}

export const OPERATIONS: readonly Operation[] = ['addition', 'subtraction', 'multiplication', 'division'];
export const GAMES: readonly GameId[] = ['bubble-pop', 'number-line-hop', 'match-pairs'];

const byId = new Map(SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): Skill | undefined {
  return byId.get(id as SkillId);
}

export function skillsOf(op: Operation): Skill[] {
  return MVP_SKILLS.filter((s) => s.operation === op).sort((a, b) => a.order - b.order);
}

export function lessonFor(skillId: SkillId): Lesson | undefined {
  return LESSONS.find((l) => l.skillId === skillId);
}

export function isOperation(x: string | undefined): x is Operation {
  return x !== undefined && (OPERATIONS as readonly string[]).includes(x);
}

export function isGameId(x: string | undefined): x is GameId {
  return x !== undefined && (GAMES as readonly string[]).includes(x);
}
