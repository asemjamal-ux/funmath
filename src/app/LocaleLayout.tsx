import { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { audioPrefs } from '../services/audio/audio';
import { dirOf, intlLocale, type Locale } from '../services/formatting/number';
import { isLocale, loadMessages, pseudoEnabled, type Messages } from '../services/i18n';
import { CelebrationLayer } from './CelebrationLayer';
import { DebugPanel } from './DebugPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { useReducedMotion } from './hooks';
import { useApp } from './store';

function DocumentAttributes({ locale }: { locale: Locale }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === 'en' && pseudoEnabled() ? 'rtl' : dirOf(locale);
    html.dataset.motion = reduced ? 'reduced' : 'full';
    document.getElementById('app-manifest')?.setAttribute('href', `/${locale}/manifest.webmanifest`);
    document.title = locale === 'ar' ? 'واحة الأرقام' : 'Number Oasis';
  }, [locale, reduced]);
  return null;
}

function AudioPrefsSync() {
  const prefs = useApp((s) => s.data?.profile.prefs);
  useEffect(() => {
    audioPrefs.narration = prefs?.narration ?? true;
    audioPrefs.sfx = prefs?.sfx ?? true;
    audioPrefs.music = prefs?.music ?? false;
  }, [prefs?.narration, prefs?.sfx, prefs?.music]);
  return null;
}

/** Moves focus to the page h1 on route change (agent-instructions §10). */
function RouteFocus() {
  const location = useLocation();
  useEffect(() => {
    const h1 = document.querySelector<HTMLElement>('main h1, h1');
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: false });
    }
  }, [location.pathname]);
  return null;
}

export function LocaleLayout() {
  const { locale } = useParams();
  const ready = useApp((s) => s.ready);
  // Keep the previous catalogue on screen while the next one loads, so activities never unmount mid-switch.
  const [loaded, setLoaded] = useState<{ locale: Locale; messages: Messages } | null>(null);

  useEffect(() => {
    if (!isLocale(locale)) return;
    let alive = true;
    void loadMessages(locale).then((messages) => {
      if (alive) setLoaded({ locale, messages });
    });
    return () => {
      alive = false;
    };
  }, [locale]);

  if (!isLocale(locale)) return <Navigate to="/en/" replace />;
  if (!loaded || !ready) return <div className="boot" aria-busy="true" />;

  return (
    <IntlProvider locale={intlLocale(loaded.locale)} messages={loaded.messages} defaultLocale="en" onError={import.meta.env.DEV ? undefined : () => undefined}>
      <DocumentAttributes locale={loaded.locale} />
      <AudioPrefsSync />
      <RouteFocus />
      <ErrorBoundary>
        <Outlet />
        <CelebrationLayer />
      </ErrorBoundary>
      {import.meta.env.DEV && <DebugPanel />}
    </IntlProvider>
  );
}
