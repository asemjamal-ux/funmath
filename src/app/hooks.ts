import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { formatNumber, type Locale, type MathDirection, type NumberStyle } from '../services/formatting/number';
import { isLocale } from '../services/i18n';
import { useApp } from './store';

export function useLocale(): Locale {
  const { locale } = useParams();
  return isLocale(locale) ? locale : 'en';
}

type Values = Record<string, string | number | boolean | null | undefined | Date | ((chunks: React.ReactNode[]) => React.ReactNode)>;

// Settings labels that deliberately show a sample of a specific digit system.
const DIGIT_SAMPLE_KEYS = /^settings\.(numberStyle|mathDirection)\./;

/**
 * Message lookup. Numbers passed as values must be pre-formatted with useFmt().n (N-08); numbers written
 * inside catalogue text (e.g. "Make 10 first") are also routed through the formatting service here, so a
 * screen never mixes digit systems (DS §4.4).
 */
export function useT() {
  const intl = useIntl();
  const { n } = useFmt();
  return useCallback(
    (id: string, values?: Values) => {
      const text = intl.formatMessage({ id }, values as never) as string;
      if (DIGIT_SAMPLE_KEYS.test(id)) return text;
      return text.replace(/\d+(?:,\d{3})*/g, (m) => n(Number(m.replace(/,/g, ''))));
    },
    [intl, n],
  );
}

export interface Fmt {
  locale: Locale;
  numberStyle: NumberStyle;
  mathDirection: MathDirection;
  n: (x: number) => string;
}

/** Number Style and Math Direction apply to the Arabic UI; English always uses Western digits, LTR math. */
export function useFmt(): Fmt {
  const locale = useLocale();
  const prefs = useApp((s) => s.data?.profile.prefs);
  return useMemo(() => {
    const numberStyle: NumberStyle = locale === 'ar' ? (prefs?.numberStyle ?? 'arab') : 'latn';
    const mathDirection: MathDirection = locale === 'ar' ? (prefs?.mathDirection ?? 'rtl') : 'ltr';
    return { locale, numberStyle, mathDirection, n: (x: number) => formatNumber(x, { locale, numberStyle }) };
  }, [locale, prefs?.numberStyle, prefs?.mathDirection]);
}

export function useReducedMotion(): boolean {
  const calm = useApp((s) => s.data?.profile.prefs.calmMode ?? false);
  const media = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return calm || Boolean(media);
}

/** Learner paths are locale-prefixed; this builds one for the current locale. */
export function usePath() {
  const locale = useLocale();
  return useCallback((p: string) => `/${locale}${p.startsWith('/') ? p : `/${p}`}`, [locale]);
}

/** While an activity is mid-item, Trophy/Oasis celebrations wait for its summary screen. */
export function useHoldCelebrations(hold: boolean) {
  useEffect(() => {
    useApp.getState().setHoldCelebrations(hold);
    return () => useApp.getState().setHoldCelebrations(false);
  }, [hold]);
}
