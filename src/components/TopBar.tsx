import { useLocation, useNavigate } from 'react-router-dom';
import { useLocale, useT } from '../app/hooks';
import { useApp } from '../app/store';
import { saveDevice, updatePrefs } from '../services/storage/repo';
import { Icon } from './Icon';
import { useOnline } from './useOnline';

/** Shows the other language's name in its own script; never a flag (DS §8.1, ARCH §9.8). */
export function LanguageSwitch() {
  const locale = useLocale();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const other = locale === 'en' ? 'ar' : 'en';
  const onSwitch = async () => {
    const app = useApp.getState();
    const profile = app.data?.profile;
    app.setDevice(await saveDevice({ lastLocale: other }));
    if (profile) {
      // Arabic defaults apply the first time a profile uses Arabic; afterwards saved values are kept.
      const first = other === 'ar' && !profile.prefs.arabicDefaultsApplied;
      await updatePrefs(profile.id, first ? { locale: other, numberStyle: 'arab', mathDirection: 'rtl', arabicDefaultsApplied: true } : { locale: other });
      await app.refresh();
    }
    const rest = location.pathname.replace(/^\/(en|ar)(?=\/|$)/, '');
    navigate(`/${other}${rest || '/'}${location.search}`, { replace: true });
  };
  return (
    <button type="button" className="lang-switch" onClick={onSwitch} aria-label={t('common.switchLanguage')}>
      <Icon name="globe" />
      <span lang={other}>{t(`common.lang.${other}`)}</span>
    </button>
  );
}

export function OfflineBadge() {
  const online = useOnline();
  const t = useT();
  if (online) return null;
  return (
    <span className="offline-badge" role="status" title={t('common.offline')}>
      <Icon name="cloud-off" />
      <span className="visually-hidden">{t('common.offline')}</span>
    </span>
  );
}

export function TopBar({ start, middle, end }: { start?: React.ReactNode; middle?: React.ReactNode; end?: React.ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar__start">{start}</div>
      <div className="topbar__middle">{middle}</div>
      <div className="topbar__end">
        <OfflineBadge />
        {end}
      </div>
    </header>
  );
}
