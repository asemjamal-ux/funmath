import { useNavigate } from 'react-router-dom';
import { usePath, useT } from '../app/hooks';
import { useApp } from '../app/store';
import { Button } from '../components/Button';
import { Mascot } from '../components/Mascot';
import { LanguageSwitch, TopBar } from '../components/TopBar';

export function AboutPage() {
  const t = useT();
  const path = usePath();
  const navigate = useNavigate();
  return (
    <div className="page">
      <TopBar start={<Button variant="ghost" size="m" leadingIcon="arrow-back" onClick={() => navigate(path('/'))}>{t('common.back')}</Button>} end={<LanguageSwitch />} />
      <main id="main" className="prose">
        <h1>{t('about.title')}</h1>
        <p>{t('about.body1')}</p>
        <p>{t('about.body2')}</p>
        <p>{t('about.body3')}</p>
      </main>
    </div>
  );
}

export function NotFoundPage() {
  const t = useT();
  const path = usePath();
  const navigate = useNavigate();
  const active = useApp((s) => s.activeProfileId);
  return (
    <main className="center-page" id="main">
      <Mascot expression="curious" size={140} />
      <h1>{t('notFound.title')}</h1>
      <Button leadingIcon="home" onClick={() => navigate(path(active ? '/home' : '/'))}>{t('common.backToOasis')}</Button>
    </main>
  );
}
