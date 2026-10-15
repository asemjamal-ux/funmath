import { useEffect, useState } from 'react';
import { IntlProvider, useIntl } from 'react-intl';
import { useLocale } from '../app/hooks';
import { loadLazyMessages, type Messages } from '../services/i18n';

/**
 * Loads the advanced Worlds (fractions, decimals, area & perimeter — decision 005) before rendering pages that use
 * them: the generators, the pictures and their words stay out of the startup bundle (NFR-01).
 */
export function TopicsGate({ need, children }: { need: boolean; children: React.ReactNode }) {
  const locale = useLocale();
  const intl = useIntl();
  const [loaded, setLoaded] = useState<{ locale: string; messages: Messages } | null>(null);
  useEffect(() => {
    if (!need) return;
    let alive = true;
    void Promise.all([loadLazyMessages(locale, 'topics'), import('../features/topics')]).then(([messages]) => {
      if (alive) setLoaded({ locale, messages });
    });
    return () => {
      alive = false;
    };
  }, [need, locale]);
  if (!need) return <>{children}</>;
  if (!loaded || loaded.locale !== locale) return <div className="boot" aria-busy="true" />;
  return (
    <IntlProvider locale={intl.locale} messages={{ ...(intl.messages as Messages), ...loaded.messages }} defaultLocale="en" onError={intl.onError}>
      {children}
    </IntlProvider>
  );
}
