import { intlLocale, type CalendarId, type Locale, type NumberStyle } from './number';

/** Grown-ups Area only (agent-instructions §7.5). */
export function formatDate(iso: string, opts: { locale: Locale; numberStyle: NumberStyle; calendar: CalendarId }): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return new Intl.DateTimeFormat(intlLocale(opts.locale), {
    calendar: opts.calendar,
    numberingSystem: opts.numberStyle,
    dateStyle: 'medium',
  }).format(d);
}

export function formatRelativeDays(days: number, opts: { locale: Locale; numberStyle: NumberStyle }): string {
  return new Intl.RelativeTimeFormat(intlLocale(opts.locale), { numeric: 'auto', numberingSystem: opts.numberStyle } as Intl.RelativeTimeFormatOptions).format(days, 'day');
}

/** ARCH §9.4: "this week" starts on Sunday for en and ar-SA unless Intl reports otherwise. */
export function weekStart(locale: Locale): number {
  try {
    const loc = new Intl.Locale(intlLocale(locale)) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    if (info) return info.firstDay % 7; // Intl uses 1=Mon..7=Sun
  } catch {
    // fall through
  }
  return 0;
}

export function startOfWeek(today: Date, locale: Locale): Date {
  const first = weekStart(locale);
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = (d.getDay() - first + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}
