import { useCallback, useRef, useState } from 'react';
import type { GameId, Item, Skill } from '../../domain/math/types';
import { appClock } from '../../services/clock';
import { upsertSession } from '../../services/storage/repo';
import { completeGameRound, recordAnswered } from '../rewards/engine';

/** Shared round bookkeeping: per-item write-through, Seeds, and the round-completed credit. */
export function useGameRound(profileId: string, gameId: GameId, skill: Skill) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const startedAt = useRef(appClock.now().toISOString());
  const startedSession = useRef(false);
  const itemStart = useRef(Date.now());
  const [seeds, setSeeds] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const ensureSession = useCallback(async (count: number, completed = false) => {
    startedSession.current = true;
    await upsertSession({
      id: sessionId, profileId, activity: 'game', skillId: skill.id, gameId, startedAt: startedAt.current,
      endedAt: completed ? appClock.now().toISOString() : undefined, itemCount: count, completed, activeMs: 0,
    });
  }, [sessionId, profileId, skill.id, gameId]);

  const answered = useCallback(async (itemIndex: number, item: Item, answerGiven: number, correct: boolean, firstTry: boolean) => {
    const out = await recordAnswered({
      profileId, activity: 'game', sessionId, itemIndex, item, answerGiven, correct, firstTry,
      hintsUsed: 0, hadHint: false, durationMs: Date.now() - itemStart.current,
    });
    itemStart.current = Date.now();
    if (out.seedsAdded) setSeeds((s) => s + out.seedsAdded);
    if (correct) setCorrectCount((c) => c + 1);
    await ensureSession(itemIndex + 1);
  }, [profileId, sessionId, ensureSession]);

  const finish = useCallback(async (count: number, correct: number) => {
    await ensureSession(count, true);
    const out = await completeGameRound(profileId, gameId, skill.id, sessionId, correct);
    setSeeds((s) => s + out.seedsAdded);
  }, [ensureSession, profileId, gameId, skill.id, sessionId]);

  return { sessionId, seeds, correctCount, answered, finish };
}
