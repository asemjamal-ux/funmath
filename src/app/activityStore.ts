import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * In-progress activity state, keyed by route path WITHOUT the locale prefix (agent-instructions §7.7),
 * so switching /en/practice/ADD-04 → /ar/practice/ADD-04 keeps the same item and attempts.
 * Persisted to sessionStorage so a reload resumes the set (answered items are already in IndexedDB).
 */
interface ActivityStore {
  states: Record<string, unknown>;
  put(key: string, state: unknown): void;
  clear(key: string): void;
}

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set, get) => ({
      states: {},
      put(key, state) {
        set({ states: { ...get().states, [key]: state } });
      },
      clear(key) {
        const next = { ...get().states };
        delete next[key];
        set({ states: next });
      },
    }),
    { name: 'oasis.activity', storage: createJSONStorage(() => sessionStorage) },
  ),
);

export function activityKey(pathname: string, profileId: string | null): string {
  return `${profileId ?? 'none'}:${pathname.replace(/^\/(en|ar)(?=\/|$)/, '')}`;
}

/**
 * A finished activity (summary / Ready step) is forgotten once the learner navigates away by any means
 * (back button, a link, a typed URL), so the next visit starts a new set instead of the old summary.
 * A reload or a language switch keeps it: the locale-free route is unchanged.
 */
export function useForgetFinishedActivity(key: string, finished: (state: unknown) => boolean): void {
  const isFinished = useRef(finished);
  isFinished.current = finished;
  useEffect(
    () => () => {
      const profilePrefix = key.slice(0, key.indexOf(':'));
      window.setTimeout(() => {
        if (activityKey(window.location.pathname, profilePrefix) === key) return;
        const store = useActivityStore.getState();
        if (isFinished.current(store.states[key])) store.clear(key);
      }, 0);
    },
    [key],
  );
}
