import type { Clock } from '../domain/time';

const OFFSET_KEY = 'oasis.dev.dayOffset';

/** Dev builds can shift the clock by whole days from the debug panel to exercise "different calendar days". */
function offsetDays(): number {
  if (!import.meta.env.DEV) return 0;
  try {
    return Number(localStorage.getItem(OFFSET_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export const appClock: Clock = {
  now: () => new Date(Date.now() + offsetDays() * 86_400_000),
};

export function setDevDayOffset(days: number): void {
  try {
    localStorage.setItem(OFFSET_KEY, String(days));
  } catch {
    // storage unavailable
  }
}

export function getDevDayOffset(): number {
  return offsetDays();
}
