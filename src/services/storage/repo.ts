import { ITEM_RESPONSE_RETENTION_DAYS } from '../../domain/constants';
import type { SkillId, Stage, Tier } from '../../domain/math/types';
import { applyCredit, oasisStageFor, type SeedCredit } from '../../domain/rewards/rewards';
import { defaultMathDirection, defaultNumberStyle, type Locale } from '../formatting/number';
import {
  db,
  SCHEMA_VERSION,
  type CounterRow,
  type DeviceSettingsRow,
  type ItemResponseRow,
  type ProfilePrefs,
  type ProfileRow,
  type RewardsRow,
  type SessionRow,
  type SkillProgressRow,
  type TrophyAwardRow,
} from './db';

const DEFAULT_DEVICE: DeviceSettingsRow = { id: 'device', calendar: 'gregory', statsOptIn: false, schemaVersion: SCHEMA_VERSION };

export async function getDevice(): Promise<DeviceSettingsRow> {
  return (await db.deviceSettings.get('device')) ?? DEFAULT_DEVICE;
}

export async function saveDevice(patch: Partial<Omit<DeviceSettingsRow, 'id'>>): Promise<DeviceSettingsRow> {
  const next = { ...(await getDevice()), ...patch, id: 'device' as const };
  await db.deviceSettings.put(next);
  return next;
}

export function listProfiles(): Promise<ProfileRow[]> {
  return db.profiles.orderBy('id').toArray().then((rows) => rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
}

export function defaultPrefs(locale: Locale, stage: Stage): ProfilePrefs {
  return {
    locale,
    numberStyle: defaultNumberStyle(locale),
    mathDirection: defaultMathDirection(locale),
    narration: stage <= 2,
    sfx: true,
    music: false,
    calmMode: false,
    breakReminderMinutes: 20,
    arabicDefaultsApplied: locale === 'ar',
  };
}

export async function createProfile(input: { nickname: string; avatarId: string; startingStage: Stage; prefs: ProfilePrefs; now: Date }): Promise<ProfileRow> {
  const row: ProfileRow = {
    id: crypto.randomUUID(),
    nickname: input.nickname,
    avatarId: input.avatarId,
    startingStage: input.startingStage,
    createdAt: input.now.toISOString(),
    prefs: input.prefs,
    unlockAll: false,
  };
  await db.transaction('rw', db.profiles, db.rewards, async () => {
    await db.profiles.add(row);
    await db.rewards.put({ profileId: row.id, seeds: 0, oasisStage: 1, dailyMixBonusDates: [] });
  });
  // ARCH §5.3: ask for persistent storage after profile creation.
  try {
    await navigator.storage?.persist?.();
  } catch {
    // not supported — backup advice is shown in the Grown-ups Area
  }
  return row;
}

export async function updateProfile(id: string, patch: Partial<Omit<ProfileRow, 'id'>>): Promise<void> {
  await db.profiles.update(id, patch);
}

export async function updatePrefs(id: string, patch: Partial<ProfilePrefs>): Promise<void> {
  const p = await db.profiles.get(id);
  if (!p) return;
  await db.profiles.put({ ...p, prefs: { ...p.prefs, ...patch } });
}

const PROFILE_TABLES = () => [db.profiles, db.skillProgress, db.itemResponses, db.sessions, db.rewards, db.seedLedger, db.trophyAwards, db.counters];

/** CS-11: deletion is immediate and complete for that profile. */
export async function deleteProfile(id: string): Promise<void> {
  await db.transaction('rw', PROFILE_TABLES(), async () => {
    await db.profiles.delete(id);
    await db.rewards.delete(id);
    await db.skillProgress.where('profileId').equals(id).delete();
    await db.itemResponses.where('profileId').equals(id).delete();
    await db.sessions.where('profileId').equals(id).delete();
    await db.seedLedger.where('profileId').equals(id).delete();
    await db.trophyAwards.where('profileId').equals(id).delete();
    await db.counters.where('profileId').equals(id).delete();
  });
}

export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', [...PROFILE_TABLES(), db.deviceSettings], async () => {
    await Promise.all([...PROFILE_TABLES(), db.deviceSettings].map((t) => t.clear()));
  });
}

export interface ProfileData {
  profile: ProfileRow;
  progress: Map<SkillId, SkillProgressRow>;
  rewards: RewardsRow;
  trophies: TrophyAwardRow[];
  counters: Map<string, CounterRow>;
}

export async function loadProfileData(profileId: string): Promise<ProfileData | undefined> {
  const profile = await db.profiles.get(profileId);
  if (!profile) return undefined;
  const [progress, rewards, trophies, counters] = await Promise.all([
    db.skillProgress.where('profileId').equals(profileId).toArray(),
    db.rewards.get(profileId),
    db.trophyAwards.where('profileId').equals(profileId).toArray(),
    db.counters.where('profileId').equals(profileId).toArray(),
  ]);
  return {
    profile,
    progress: new Map(progress.map((p) => [p.skillId, p])),
    rewards: rewards ?? { profileId, seeds: 0, oasisStage: 1, dailyMixBonusDates: [] },
    trophies,
    counters: new Map(counters.map((c) => [c.counterId, c])),
  };
}

export function emptyProgress(profileId: string, skillId: SkillId): SkillProgressRow {
  return { profileId, skillId, stars: 0, currentTier: 1, tier3QualifyingDates: [], reviewStep: 0 };
}

export async function getProgress(profileId: string, skillId: SkillId): Promise<SkillProgressRow> {
  return (await db.skillProgress.get([profileId, skillId])) ?? emptyProgress(profileId, skillId);
}

export async function saveProgress(row: SkillProgressRow): Promise<void> {
  await db.skillProgress.put(row);
}

export async function setCurrentTier(profileId: string, skillId: SkillId, tier: Tier): Promise<void> {
  const row = await getProgress(profileId, skillId);
  await db.skillProgress.put({ ...row, currentTier: tier });
}

/** Write-through of one answered item (NFR-05). Re-recording the same responseKey is ignored. */
export async function recordItemResponse(row: Omit<ItemResponseRow, 'id'>): Promise<boolean> {
  const existing = await db.itemResponses.where('responseKey').equals(row.responseKey).first();
  if (existing) return false;
  await db.itemResponses.add(row);
  return true;
}

export function responsesFor(profileId: string): Promise<ItemResponseRow[]> {
  return db.itemResponses.where('profileId').equals(profileId).toArray();
}

export async function pruneOldResponses(now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - ITEM_RESPONSE_RETENTION_DAYS * 86_400_000).toISOString();
  await db.itemResponses.where('answeredAt').below(cutoff).delete();
}

export async function upsertSession(row: SessionRow): Promise<void> {
  await db.sessions.put(row);
}

export function getSession(id: string): Promise<SessionRow | undefined> {
  return db.sessions.get(id);
}

export function sessionsFor(profileId: string): Promise<SessionRow[]> {
  return db.sessions.where('profileId').equals(profileId).toArray();
}

export interface CreditResult {
  seeds: number;
  applied: boolean;
  stageBefore: number;
  stageAfter: number;
}

/** Idempotent Seed credit (ARCH §8): the ledger key [profileId, creditId] prevents double awards. */
export async function creditSeeds(profileId: string, credit: SeedCredit, now: Date): Promise<CreditResult> {
  return db.transaction('rw', db.rewards, db.seedLedger, async () => {
    const rewards = (await db.rewards.get(profileId)) ?? { profileId, seeds: 0, oasisStage: 1, dailyMixBonusDates: [] };
    const exists = await db.seedLedger.get([profileId, credit.id]);
    const ledger = new Set(exists ? [credit.id] : []);
    const { seeds, applied } = applyCredit(rewards.seeds, ledger, credit);
    const stageBefore = rewards.oasisStage;
    const stageAfter = Math.max(stageBefore, oasisStageFor(seeds));
    if (applied) {
      await db.seedLedger.put({ profileId, creditId: credit.id, amount: credit.amount, at: now.toISOString() });
      await db.rewards.put({ ...rewards, seeds, oasisStage: stageAfter });
    }
    return { seeds, applied, stageBefore, stageAfter };
  });
}

export async function addDailyMixBonusDate(profileId: string, date: string): Promise<void> {
  const r = await db.rewards.get(profileId);
  if (!r) return;
  const dates = [...new Set([...r.dailyMixBonusDates, date])].slice(-30);
  await db.rewards.put({ ...r, dailyMixBonusDates: dates });
}

export async function bumpCounter(profileId: string, counterId: string, by = 1): Promise<number> {
  return db.transaction('rw', db.counters, async () => {
    const row = (await db.counters.get([profileId, counterId])) ?? { profileId, counterId, value: 0 };
    const next = { ...row, value: row.value + by };
    await db.counters.put(next);
    return next.value;
  });
}

/** Set-valued counters (distinct practice days, distinct games): value = number of distinct members. */
export async function addCounterMember(profileId: string, counterId: string, member: string): Promise<number> {
  return db.transaction('rw', db.counters, async () => {
    const row = (await db.counters.get([profileId, counterId])) ?? { profileId, counterId, value: 0, members: [] };
    const members = [...new Set([...(row.members ?? []), member])];
    await db.counters.put({ ...row, members, value: members.length });
    return members.length;
  });
}

export async function awardTrophy(profileId: string, trophyId: string, now: Date): Promise<boolean> {
  return db.transaction('rw', db.trophyAwards, async () => {
    if (await db.trophyAwards.get([profileId, trophyId])) return false;
    await db.trophyAwards.add({ profileId, trophyId, awardedAt: now.toISOString() });
    return true;
  });
}
