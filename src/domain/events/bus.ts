import type { GameId, SkillId, Tier } from '../math/types';

/** ARCH §4.1 domain events (no personal data in payloads). */
export type DomainEvent =
  | { type: 'lesson.completed'; profileId: string; skillId: SkillId; guidedCorrect: number; sessionId: string }
  | {
      type: 'item.answered';
      profileId: string;
      skillId: SkillId;
      activity: 'lesson' | 'practice' | 'dailyMix' | 'game';
      tier: Tier;
      correct: boolean;
      firstTry: boolean;
      hintsUsed: number;
      durationMs: number;
    }
  | { type: 'practiceSet.completed'; profileId: string; skillId: SkillId; firstTryRate: number }
  | { type: 'dailyMix.completed'; profileId: string; date: string }
  | { type: 'gameRound.completed'; profileId: string; gameId: GameId; skillId: SkillId; correctCount: number }
  | { type: 'stars.changed'; profileId: string; skillId: SkillId; from: number; to: number }
  | { type: 'trophy.awarded'; profileId: string; trophyId: string }
  | { type: 'oasisStage.reached'; profileId: string; stage: number };

type Handler = (e: DomainEvent) => void;

export function createEventBus() {
  const handlers = new Set<Handler>();
  return {
    subscribe(h: Handler): () => void {
      handlers.add(h);
      return () => handlers.delete(h);
    },
    publish(e: DomainEvent): void {
      for (const h of handlers) h(e);
    },
  };
}

export const eventBus = createEventBus();
