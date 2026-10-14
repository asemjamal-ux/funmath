import { create } from 'zustand';
import { MVP_SKILLS } from '../services/content';
import { isSkillUnlocked, isWorldOpen, type UnlockInput } from '../domain/adaptivity/unlock';
import type { Operation, Skill, SkillId } from '../domain/math/types';
import type { DeviceSettingsRow, ProfileRow } from '../services/storage/db';
import { getDevice, loadProfileData, type ProfileData } from '../services/storage/repo';

const ACTIVE_KEY = 'oasis.activeProfile';

function readActive(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export type Celebration = { kind: 'trophy'; trophyId: string } | { kind: 'oasis'; stage: number };

interface AppState {
  ready: boolean;
  device: DeviceSettingsRow | null;
  activeProfileId: string | null;
  data: ProfileData | null;
  celebrations: Celebration[];
  grownUpUnlocked: boolean;
  /** Milliseconds of active learner time since the last break reminder (F-16). */
  activeMsSinceBreak: number;
  /** Activities hold celebrations until their summary so dialogs never interrupt an answer. */
  holdCelebrations: boolean;
  setHoldCelebrations(v: boolean): void;
  init(): Promise<void>;
  setDevice(d: DeviceSettingsRow): void;
  setActiveProfile(id: string | null): Promise<void>;
  refresh(): Promise<void>;
  pushCelebrations(c: Celebration[]): void;
  shiftCelebration(): void;
  setGrownUpUnlocked(v: boolean): void;
  addActiveMs(ms: number): void;
  resetBreakTimer(): void;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  device: null,
  activeProfileId: null,
  data: null,
  celebrations: [],
  grownUpUnlocked: false,
  activeMsSinceBreak: 0,
  holdCelebrations: false,
  setHoldCelebrations(v) {
    set({ holdCelebrations: v });
  },
  async init() {
    const device = await getDevice();
    const active = readActive();
    const data = active ? await loadProfileData(active) : undefined;
    set({ device, activeProfileId: data ? active : null, data: data ?? null, ready: true });
  },
  setDevice(device) {
    set({ device });
  },
  async setActiveProfile(id) {
    try {
      if (id) sessionStorage.setItem(ACTIVE_KEY, id);
      else sessionStorage.removeItem(ACTIVE_KEY);
    } catch {
      // private mode: active profile lives only in memory
    }
    const data = id ? await loadProfileData(id) : undefined;
    set({ activeProfileId: data ? id : null, data: data ?? null, activeMsSinceBreak: 0 });
  },
  async refresh() {
    const id = get().activeProfileId;
    if (!id) return;
    const data = await loadProfileData(id);
    set({ data: data ?? null, activeProfileId: data ? id : null });
  },
  pushCelebrations(c) {
    if (c.length) set({ celebrations: [...get().celebrations, ...c] });
  },
  shiftCelebration() {
    set({ celebrations: get().celebrations.slice(1) });
  },
  setGrownUpUnlocked(v) {
    set({ grownUpUnlocked: v });
  },
  addActiveMs(ms) {
    set({ activeMsSinceBreak: get().activeMsSinceBreak + ms });
  },
  resetBreakTimer() {
    set({ activeMsSinceBreak: 0 });
  },
}));

export function useProfile(): ProfileRow | null {
  return useApp((s) => s.data?.profile ?? null);
}

export function unlockInputFor(data: ProfileData): UnlockInput {
  return {
    skills: MVP_SKILLS,
    startingStage: data.profile.startingStage,
    unlockAll: data.profile.unlockAll,
    stars: (id: SkillId) => data.progress.get(id)?.stars ?? 0,
  };
}

export function starsOf(data: ProfileData | null, id: SkillId): number {
  return data?.progress.get(id)?.stars ?? 0;
}

export function skillUnlocked(data: ProfileData | null, skill: Skill): boolean {
  return data ? isSkillUnlocked(skill, unlockInputFor(data)) : false;
}

export function worldOpen(data: ProfileData | null, op: Operation): boolean {
  return data ? isWorldOpen(op, unlockInputFor(data)) : false;
}
