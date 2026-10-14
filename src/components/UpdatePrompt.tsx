import { useEffect, useState } from 'react';
import { useT } from '../app/hooks';
import { Button } from './Button';

type Updater = (reload?: boolean) => Promise<void>;
let needRefresh = false;
let updater: Updater | null = null;
const listeners = new Set<() => void>();

/** Registers the service worker once; the update prompt is shown only on Learner Home, never mid-activity (ARCH §10). */
export async function registerServiceWorker(): Promise<void> {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  const { registerSW } = await import('virtual:pwa-register');
  updater = registerSW({
    onNeedRefresh() {
      needRefresh = true;
      listeners.forEach((l) => l());
    },
  });
}

export function UpdatePrompt() {
  const t = useT();
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  if (!needRefresh || !updater) return null;
  return (
    <div className="update-prompt" role="status">
      <span>{t('home.updateReady')}</span>
      <Button size="m" onClick={() => void updater?.(true)}>{t('home.updateNow')}</Button>
    </div>
  );
}
