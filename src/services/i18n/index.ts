import type { Locale } from '../formatting/number';

export type Messages = Record<string, string>;

const loaders: Record<Locale, () => Promise<Messages>> = {
  en: async () => mergeNamespaces(import.meta.glob<{ default: Messages }>(['../../locales/en/*.json', '!../../locales/en/_*.json'])),
  ar: async () => mergeNamespaces(import.meta.glob<{ default: Messages }>(['../../locales/ar/*.json', '!../../locales/ar/_*.json'])),
};

async function mergeNamespaces(mods: Record<string, () => Promise<{ default: Messages }>>): Promise<Messages> {
  // sidecar files such as _review.json are not messages; namespaces load in parallel (one round trip, NFR-01)
  const loaded = await Promise.all(Object.entries(mods).filter(([path]) => !path.includes('/_')).map(([, load]) => load()));
  return Object.assign({}, ...loaded.map((m) => m.default)) as Messages;
}

const cache = new Map<string, Promise<Messages>>();

export const PSEUDO_KEY = 'oasis.dev.pseudo';

export function pseudoEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(PSEUDO_KEY) === '1';
  } catch {
    return false;
  }
}

/** en-XA pseudo-locale (dev only): brackets + ~30 % expansion to expose truncation and hard-coded text. */
function pseudo(messages: Messages): Messages {
  const out: Messages = {};
  for (const [k, v] of Object.entries(messages)) {
    // Leave ICU syntax intact: only pad outside braces.
    const pad = '·'.repeat(Math.ceil(v.replace(/\{[^}]*\}/g, '').length * 0.3));
    out[k] = `⟦${v}${pad}⟧`;
  }
  return out;
}

/** Cached per locale (the promise, so a boot-time preload and the layout share one request). */
export function loadMessages(locale: Locale): Promise<Messages> {
  const key = locale === 'en' && pseudoEnabled() ? 'en-XA' : locale;
  let hit = cache.get(key);
  if (!hit) {
    hit = loaders[locale]().then((base) => (key === 'en-XA' ? pseudo(base) : base));
    hit.catch(() => cache.delete(key));
    cache.set(key, hit);
  }
  return hit;
}

const lazyCatalogues = import.meta.glob<{ default: Messages }>('../../locales/*/lazy/*.json');

/** Page-specific namespaces (e.g. worksheets) stay out of the startup bundle (NFR-01). */
export async function loadLazyMessages(locale: Locale, namespace: string): Promise<Messages> {
  const load = lazyCatalogues[`../../locales/${locale}/lazy/${namespace}.json`];
  if (!load) return {};
  const messages = (await load()).default;
  return locale === 'en' && pseudoEnabled() ? pseudo(messages) : messages;
}

export function isLocale(x: string | undefined): x is Locale {
  return x === 'en' || x === 'ar';
}
