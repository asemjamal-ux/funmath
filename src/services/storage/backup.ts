import { z } from 'zod';
import { db, SCHEMA_VERSION } from './db';

/** ARCH §5.3 / §11: one profile's rows + schemaVersion + checksum. No PIN, no device settings. */
export interface BackupFile {
  app: 'number-oasis';
  schemaVersion: number;
  exportedAt: string;
  checksum: string;
  data: BackupData;
}

const backupDataSchema = z.object({
  profile: z.object({
    id: z.string().uuid(),
    nickname: z.string().max(12),
    avatarId: z.string(),
    startingStage: z.number().int().min(1).max(5),
    createdAt: z.string(),
    unlockAll: z.boolean(),
    prefs: z.object({
      locale: z.enum(['en', 'ar']),
      numberStyle: z.enum(['arab', 'latn']),
      mathDirection: z.enum(['rtl', 'ltr']),
      narration: z.boolean(),
      sfx: z.boolean(),
      music: z.boolean(),
      calmMode: z.boolean(),
      breakReminderMinutes: z.union([z.literal(0), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(45)]),
      arabicDefaultsApplied: z.boolean(),
      showEarlierSkills: z.boolean().optional(),
    }),
  }),
  skillProgress: z.array(z.record(z.string(), z.unknown())),
  itemResponses: z.array(z.record(z.string(), z.unknown())),
  sessions: z.array(z.record(z.string(), z.unknown())),
  rewards: z.record(z.string(), z.unknown()).nullable(),
  seedLedger: z.array(z.record(z.string(), z.unknown())),
  trophyAwards: z.array(z.record(z.string(), z.unknown())),
  counters: z.array(z.record(z.string(), z.unknown())),
});

export type BackupData = z.infer<typeof backupDataSchema>;

const backupSchema = z.object({
  app: z.literal('number-oasis'),
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  checksum: z.string(),
  data: backupDataSchema,
});

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Canonical JSON (sorted keys) so the checksum is stable across engines. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().filter((k) => obj[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function exportProfile(profileId: string, now: Date): Promise<BackupFile> {
  const profile = await db.profiles.get(profileId);
  if (!profile) throw new Error('profile not found');
  const by = <T>(t: { where(i: string): { equals(v: string): { toArray(): Promise<T[]> } } }) => t.where('profileId').equals(profileId).toArray();
  const data = {
    profile,
    skillProgress: await by(db.skillProgress),
    itemResponses: (await db.itemResponses.where('profileId').equals(profileId).toArray()).map((r) => {
      const copy: Record<string, unknown> = { ...r };
      delete copy.id;
      return copy;
    }),
    sessions: await by(db.sessions),
    rewards: (await db.rewards.get(profileId)) ?? null,
    seedLedger: await by(db.seedLedger),
    trophyAwards: await by(db.trophyAwards),
    counters: await by(db.counters),
  } as unknown as BackupData;
  return { app: 'number-oasis', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), checksum: await sha256(canonical(data)), data };
}

export function backupFileName(nickname: string, date: string): string {
  const safe = nickname.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 12) || 'profile';
  return `number-oasis-backup-${safe}-${date}.json`;
}

export type ParseResult = { ok: true; backup: BackupFile; exists: boolean } | { ok: false; reason: 'invalid' | 'checksum' | 'version' };

export async function parseBackup(text: string): Promise<ParseResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: 'invalid' };
  if (parsed.data.schemaVersion > SCHEMA_VERSION) return { ok: false, reason: 'version' };
  if ((await sha256(canonical(parsed.data.data))) !== parsed.data.checksum) return { ok: false, reason: 'checksum' };
  const exists = (await db.profiles.get(parsed.data.data.profile.id)) !== undefined;
  // Keep the original object (Zod re-orders keys) so a round trip restores byte-identical rows.
  return { ok: true, backup: raw as BackupFile, exists };
}

/** Replaces that profile's rows with the backup's rows (caller asks before overwriting). */
export async function importBackup(backup: BackupFile): Promise<void> {
  const d = backup.data;
  const id = d.profile.id;
  const tables = [db.profiles, db.skillProgress, db.itemResponses, db.sessions, db.rewards, db.seedLedger, db.trophyAwards, db.counters];
  await db.transaction('rw', tables, async () => {
    await db.profiles.delete(id);
    await db.rewards.delete(id);
    for (const t of [db.skillProgress, db.itemResponses, db.sessions, db.seedLedger, db.trophyAwards, db.counters]) {
      await t.where('profileId').equals(id).delete();
    }
    await db.profiles.put(d.profile as never);
    if (d.rewards) await db.rewards.put(d.rewards as never);
    await db.skillProgress.bulkPut(d.skillProgress as never[]);
    await db.itemResponses.bulkAdd(d.itemResponses as never[]);
    await db.sessions.bulkPut(d.sessions as never[]);
    await db.seedLedger.bulkPut(d.seedLedger as never[]);
    await db.trophyAwards.bulkPut(d.trophyAwards as never[]);
    await db.counters.bulkPut(d.counters as never[]);
  });
}
