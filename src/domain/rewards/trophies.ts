import type { SkillId } from '../math/types';

export type CounterId = 'lessonsCompleted' | 'correctAfterHint' | 'practiceSetsCompleted' | 'dailyMixCompleted' | 'distinctPracticeDays';

export type TrophyRule =
  | { type: 'counterAtLeast'; counter: CounterId; value: number }
  | { type: 'anySkillAtStars'; stars: number }
  | { type: 'skillAtStars'; skill: SkillId; stars: number }
  | { type: 'allSkillsAtStars'; skills: SkillId[]; stars: number }
  | { type: 'allMvpSkillsAtStars'; stars: number }
  | { type: 'oasisStageAtLeast'; value: number }
  | { type: 'distinctGamesPlayed'; value: number };

export interface TrophyDefinition {
  id: `TR-${string}`;
  titleKey: string;
  hintKey: string;
  icon: string;
  rule: TrophyRule;
}

export interface TrophySnapshot {
  counters: Partial<Record<CounterId, number>>;
  stars: ReadonlyMap<SkillId, number>;
  mvpSkills: readonly SkillId[];
  oasisStage: number;
  gamesPlayed: number;
}

export function ruleSatisfied(rule: TrophyRule, s: TrophySnapshot): boolean {
  const starsOf = (id: SkillId): number => s.stars.get(id) ?? 0;
  switch (rule.type) {
    case 'counterAtLeast':
      return (s.counters[rule.counter] ?? 0) >= rule.value;
    case 'anySkillAtStars':
      return s.mvpSkills.some((id) => starsOf(id) >= rule.stars);
    case 'skillAtStars':
      return starsOf(rule.skill) >= rule.stars;
    case 'allSkillsAtStars':
      return rule.skills.every((id) => starsOf(id) >= rule.stars);
    case 'allMvpSkillsAtStars':
      return s.mvpSkills.length > 0 && s.mvpSkills.every((id) => starsOf(id) >= rule.stars);
    case 'oasisStageAtLeast':
      return s.oasisStage >= rule.value;
    case 'distinctGamesPlayed':
      return s.gamesPlayed >= rule.value;
    default: {
      const never: never = rule;
      return never;
    }
  }
}

/** Trophies newly earned; already-awarded ids are never returned again (FR-23). */
export function newlyEarnedTrophies(defs: readonly TrophyDefinition[], snapshot: TrophySnapshot, awarded: ReadonlySet<string>): TrophyDefinition[] {
  return defs.filter((d) => !awarded.has(d.id) && ruleSatisfied(d.rule, snapshot));
}
