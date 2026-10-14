import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { OasisDB, setDatabase, db } from '../src/services/storage/db';
import { createProfile, creditSeeds, defaultPrefs, deleteAllData, deleteProfile, recordItemResponse, awardTrophy } from '../src/services/storage/repo';
import { exportProfile, importBackup, parseBackup } from '../src/services/storage/backup';
import { credits } from '../src/domain/rewards/rewards';

setDatabase(new OasisDB('test-db'));
const now = new Date('2026-10-15T10:00:00');

async function snapshot(pid: string) {
  const out: Record<string, string> = {};
  for (const t of ['skillProgress', 'sessions', 'rewards', 'seedLedger', 'trophyAwards', 'counters'] as const) {
    out[t] = JSON.stringify(((await db.table(t).toArray()) as Array<{ profileId: string }>).filter((x) => x.profileId === pid));
  }
  out.profiles = JSON.stringify(await db.profiles.get(pid));
  out.itemResponses = JSON.stringify((await db.itemResponses.where('profileId').equals(pid).toArray()).map(({ id: _id, ...x }) => x));
  return out;
}

describe('storage', () => {
  it('credits are idempotent and trophies award once', async () => {
    const p = await createProfile({ nickname: 'Kind Owl', avatarId: 'owl', startingStage: 1, prefs: defaultPrefs('en', 1), now });
    const c = credits.itemCorrect('s', 0);
    expect((await creditSeeds(p.id, c, now)).applied).toBe(true);
    expect((await creditSeeds(p.id, c, now)).applied).toBe(false);
    expect((await db.rewards.get(p.id))?.seeds).toBe(1);
    expect(await awardTrophy(p.id, 'TR-01', now)).toBe(true);
    expect(await awardTrophy(p.id, 'TR-01', now)).toBe(false);
  });

  it('export → delete → import restores identical data; tampering is rejected', async () => {
    const p = await createProfile({ nickname: 'Brave Fox', avatarId: 'fox', startingStage: 2, prefs: defaultPrefs('ar', 2), now });
    await creditSeeds(p.id, credits.lessonCompleted('L1'), now);
    await recordItemResponse({
      responseKey: 's1:0', profileId: p.id, skillId: 'ADD-04', activity: 'practice', sessionId: 's1', tier: 2, format: 'choice',
      itemSpec: { operation: 'addition', operands: [8, 5, 13], blank: 'result' }, answerGiven: 13, correct: true, firstTry: true, hintsUsed: 0, durationMs: 1200, answeredAt: now.toISOString(),
    });
    const before = await snapshot(p.id);
    const text = JSON.stringify(await exportProfile(p.id, now));
    expect(text).not.toMatch(/pin/i);
    await deleteProfile(p.id);
    expect(await db.itemResponses.where('profileId').equals(p.id).count()).toBe(0);
    const parsed = await parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await importBackup(parsed.backup);
    expect(await snapshot(p.id)).toEqual(before);
    expect((await parseBackup(text.replace('"seeds":5', '"seeds":50'))).ok).toBe(false);
  });

  it('delete all leaves no learner data', async () => {
    await deleteAllData();
    for (const t of db.tables) expect(await t.count()).toBe(0);
  });
});
