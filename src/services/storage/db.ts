import Dexie, { type Table } from 'dexie';
import type { GameId, ItemFormat, SkillId, Stage, Tier } from '../../domain/math/types';
import type { CalendarId, Locale, MathDirection, NumberStyle } from '../formatting/number';

export interface ProfilePrefs {
  locale: Locale;
  numberStyle: NumberStyle;
  mathDirection: MathDirection;
  narration: boolean;
  sfx: boolean;
  music: boolean;
  calmMode: boolean;
  breakReminderMinutes: 0 | 10 | 15 | 20 | 30 | 45;
  /** Set once the Arabic defaults have been applied (ARCH §9.8). */
  arabicDefaultsApplied: boolean;
}

export interface ProfileRow {
  id: string;
  nickname: string;
  avatarId: string;
  startingStage: Stage;
  createdAt: string;
  prefs: ProfilePrefs;
  unlockAll: boolean;
}

export interface SkillProgressRow {
  profileId: string;
  skillId: SkillId;
  stars: 0 | 1 | 2 | 3;
  currentTier: Tier;
  tier3QualifyingDates: string[];
  lessonCompletedAt?: string;
  masteredAt?: string;
  nextReviewAt?: string;
  reviewStep: number;
}

export type Activity = 'lesson' | 'practice' | 'dailyMix' | 'game';

export interface ItemResponseRow {
  id?: number;
  /** Idempotency key: `${sessionId}:${itemIndex}` — a reload never writes the same answer twice. */
  responseKey: string;
  profileId: string;
  skillId: SkillId;
  activity: Activity;
  sessionId: string;
  tier: Tier;
  format: ItemFormat;
  itemSpec: { operation: string; operands: [number, number, number]; blank: string };
  answerGiven: number | null;
  correct: boolean;
  firstTry: boolean;
  hintsUsed: number;
  durationMs: number;
  answeredAt: string; // ISO
}

export interface SessionRow {
  id: string;
  profileId: string;
  activity: Activity;
  skillId?: SkillId;
  gameId?: GameId;
  startedAt: string;
  endedAt?: string;
  itemCount: number;
  firstTryRate?: number;
  completed: boolean;
  activeMs: number;
}

export interface RewardsRow {
  profileId: string;
  seeds: number;
  oasisStage: number;
  dailyMixBonusDates: string[];
}

export interface SeedLedgerRow {
  profileId: string;
  creditId: string;
  amount: number;
  at: string;
}

export interface TrophyAwardRow {
  profileId: string;
  trophyId: string;
  awardedAt: string;
}

export interface CounterRow {
  profileId: string;
  counterId: string;
  value: number;
  /** For set-valued counters (distinct days, games played). */
  members?: string[];
}

export interface DeviceSettingsRow {
  id: 'device';
  lastLocale?: Locale;
  calendar: CalendarId;
  pinHash?: string;
  pinSalt?: string;
  statsOptIn: boolean;
  schemaVersion: number;
}

export const SCHEMA_VERSION = 1;

export class OasisDB extends Dexie {
  profiles!: Table<ProfileRow, string>;
  skillProgress!: Table<SkillProgressRow, [string, string]>;
  itemResponses!: Table<ItemResponseRow, number>;
  sessions!: Table<SessionRow, string>;
  rewards!: Table<RewardsRow, string>;
  seedLedger!: Table<SeedLedgerRow, [string, string]>;
  trophyAwards!: Table<TrophyAwardRow, [string, string]>;
  counters!: Table<CounterRow, [string, string]>;
  deviceSettings!: Table<DeviceSettingsRow, string>;

  constructor(name = 'number-oasis') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      profiles: 'id',
      skillProgress: '[profileId+skillId], profileId',
      itemResponses: '++id, &responseKey, profileId, answeredAt, [profileId+skillId+answeredAt]',
      sessions: 'id, profileId, startedAt',
      rewards: 'profileId',
      seedLedger: '[profileId+creditId], profileId',
      trophyAwards: '[profileId+trophyId], profileId',
      counters: '[profileId+counterId], profileId',
      deviceSettings: 'id',
    });
  }
}

export let db = new OasisDB();

/** Test hook: point repositories at an isolated database. */
export function setDatabase(next: OasisDB): void {
  db = next;
}
