export type Locale = 'en' | 'ar';
export type NumberStyle = 'arab' | 'latn';
export type MathDirection = 'rtl' | 'ltr';
export type CalendarId = 'gregory' | 'islamic-umalqura';

export interface FormatOptions {
  locale: Locale;
  numberStyle: NumberStyle;
}

export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-SA' : 'en';
}

const cache = new Map<string, Intl.NumberFormat>();
let min2Supported: boolean | undefined;

function supportsMin2(): boolean {
  if (min2Supported === undefined) {
    try {
      min2Supported = new Intl.NumberFormat('en', { useGrouping: 'min2' } as Intl.NumberFormatOptions).format(1000) === '1000';
    } catch {
      min2Supported = false;
    }
  }
  return min2Supported;
}

/** ARCH §9.3: always pass numberingSystem explicitly; no grouping below 10,000; up to two decimal places. */
export function formatNumber(n: number, opts: FormatOptions): string {
  const min2 = supportsMin2();
  const key = `${opts.locale}|${opts.numberStyle}|${min2 ? 'min2' : n >= 10000 ? 'g' : 'ng'}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(intlLocale(opts.locale), {
      numberingSystem: opts.numberStyle,
      useGrouping: min2 ? 'min2' : n >= 10000,
      // Decimals World values have at most two places (decision 005); whole numbers are unaffected.
      maximumFractionDigits: 2,
    } as Intl.NumberFormatOptions);
    cache.set(key, f);
  }
  return f.format(n);
}

export function defaultNumberStyle(locale: Locale): NumberStyle {
  return locale === 'ar' ? 'arab' : 'latn';
}

export function defaultMathDirection(locale: Locale): MathDirection {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
