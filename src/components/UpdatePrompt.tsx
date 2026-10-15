import { useEffect, useState } from 'react';
import { useT } from '../app/hooks';
import { Button } from './Button';

let needRefresh = false;
let applyUpdate: (() => void) | null = null;
const listeners = new Set<() => void>();
const UPDATE_CHECK_MS = 60 * 60 * 1000;

function markReady(): void {
  if (needRefresh) return;
  needRefresh = true;
  listeners.forEach((l) => l());
}

/**
 * Registers the service worker and watches for a new version (ARCH §10). It reads the registration directly instead
 * of relying on workbox-window's events, which missed a version that was already waiting when the page loaded, so
 * learners could stay on an old build indefinitely. The prompt is shown only on Learner Home, never mid-activity.
 */
export async function registerServiceWorker(): Promise<void> {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return; // offline-first is an enhancement; the app still works without it
  }
  applyUpdate = () => {
    const waiting = reg.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });
  };
  // A waiting worker only means "update" when an older one controls this page (not on the very first install).
  const check = () => {
    if (reg.waiting && navigator.serviceWorker.controller) markReady();
  };
  check();
  reg.addEventListener('updatefound', () => {
    const sw = reg.installing;
    sw?.addEventListener('statechange', () => {
      if (sw.state === 'installed') check();
    });
  });
  window.setInterval(() => void reg.update().catch(() => undefined), UPDATE_CHECK_MS);
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
  if (!needRefresh || !applyUpdate) return null;
  return (
    <div className="update-prompt" role="status">
      <span>{t('home.updateReady')}</span>
      <Button size="m" onClick={() => applyUpdate?.()}>{t('home.updateNow')}</Button>
    </div>
  );
}
