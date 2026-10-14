import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useFmt, useLocale, usePath, useT } from '../app/hooks';
import { useApp } from '../app/store';
import { Button } from '../components/Button';
import { GrownUpGate } from '../components/GrownUpGate';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { Avatar, AVATAR_IDS } from '../components/Progress';
import { LanguageSwitch, TopBar } from '../components/TopBar';
import { MAX_PROFILES, NICKNAME_MAX_LENGTH } from '../domain/constants';
import type { Stage } from '../domain/math/types';
import { appClock } from '../services/clock';
import type { Locale } from '../services/formatting/number';
import type { ProfileRow } from '../services/storage/db';
import { createProfile, defaultPrefs, getDevice, listProfiles, saveDevice } from '../services/storage/repo';

/** `/` → saved locale → navigator.languages → en (ARCH §9.1). */
export function RootRedirect() {
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    void getDevice().then((d) => {
      const nav = (navigator.languages ?? [navigator.language]).find(Boolean) ?? 'en';
      const locale: Locale = d.lastLocale ?? (nav.toLowerCase().startsWith('ar') ? 'ar' : 'en');
      setTarget(`/${locale}/`);
    });
  }, []);
  return target ? <Navigate to={target} replace /> : <div className="boot" aria-busy="true" />;
}

/** Bilingual first-run welcome: two equal buttons, nothing else required (FR-01). */
function BilingualWelcome() {
  const t = useT();
  const navigate = useNavigate();
  const choose = async (locale: Locale) => {
    useApp.getState().setDevice(await saveDevice({ lastLocale: locale }));
    navigate(`/${locale}/setup`);
  };
  return (
    <main className="welcome" id="main">
      <Mascot expression="happy" size={160} />
      <h1 className="welcome__title">
        <span lang="en" dir="ltr">{t('welcome.title.en')}</span>
        <span lang="ar" dir="rtl">{t('welcome.title.ar')}</span>
      </h1>
      <div className="welcome__langs">
        <button type="button" className="welcome__lang" lang="en" onClick={() => void choose('en')}>{t('common.lang.en')}</button>
        <button type="button" className="welcome__lang" lang="ar" onClick={() => void choose('ar')}>{t('common.lang.ar')}</button>
      </div>
    </main>
  );
}

export function WelcomePage() {
  const t = useT();
  const path = usePath();
  const navigate = useNavigate();
  const device = useApp((s) => s.device);
  const [profiles, setProfiles] = useState<ProfileRow[] | null>(null);
  useEffect(() => {
    void listProfiles().then(setProfiles);
  }, []);
  if (!profiles) return <div className="boot" aria-busy="true" />;
  if (profiles.length === 0 && !device?.lastLocale) return <BilingualWelcome />;
  if (profiles.length === 0) return <Navigate to={`/${device?.lastLocale ?? 'en'}/setup`} replace />;

  const pick = async (p: ProfileRow) => {
    await useApp.getState().setActiveProfile(p.id);
    navigate(path('/home'));
  };
  return (
    <div className="page">
      <TopBar end={<LanguageSwitch />} />
      <main className="picker" id="main">
        <Mascot expression="happy" size={120} />
        <h1>{t('picker.title')}</h1>
        <ul className="picker__list">
          {profiles.map((p) => (
            <li key={p.id}>
              <button type="button" className="profile-card" onClick={() => void pick(p)}>
                <Avatar id={p.avatarId} size={88} />
                <span className="profile-card__name" dir="auto">{p.nickname}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="picker__footer">
          <Link className="link-btn" to={path('/grown-ups')}>
            <Icon name="shield" />
            {t('picker.grownUps')}
          </Link>
          <Link className="link-btn" to={path('/about')}>{t('picker.about')}</Link>
        </div>
      </main>
    </div>
  );
}

const NICKNAME_WORDS: Record<Locale, { adj: string[]; noun: string[]; join: (a: string, n: string) => string }> = {
  en: {
    adj: ['Brave', 'Happy', 'Clever', 'Kind', 'Swift', 'Calm', 'Bright', 'Jolly'],
    noun: ['Falcon', 'Camel', 'Gecko', 'Oryx', 'Owl', 'Fox', 'Turtle', 'Dove'],
    join: (a, n) => `${a} ${n}`,
  },
  ar: {
    adj: ['شجاع', 'سعيد', 'ذكي', 'لطيف', 'سريع', 'هادئ', 'لامع', 'مرح'],
    noun: ['صقر', 'جمل', 'وعل', 'بوم', 'ثعلب', 'غزال', 'نسر', 'حصان'],
    join: (a, n) => `${n} ${a}`,
  },
};

/** CS-02 / agent-instructions §11: max 12 chars, trimmed, no URLs or emails. */
export function validateNickname(raw: string): 'ok' | 'empty' | 'tooLong' | 'noLinks' {
  const v = raw.trim();
  if (!v) return 'empty';
  if ([...v].length > NICKNAME_MAX_LENGTH) return 'tooLong';
  if (/http|www|@|\.\p{L}/iu.test(v)) return 'noLinks';
  return 'ok';
}

export function NicknamePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  const locale = useLocale();
  const [seed, setSeed] = useState(0);
  const suggestions = useMemo(() => {
    const w = NICKNAME_WORDS[locale];
    const out = new Set<string>();
    const rnd = crypto.getRandomValues(new Uint8Array(16));
    for (let i = 0; out.size < 3 && i < 8; i++) out.add(w.join(w.adj[(rnd[i] ?? 0) % w.adj.length] as string, w.noun[(rnd[i + 8] ?? 0) % w.noun.length] as string));
    return [...out];
    // seed forces a new shuffle
  }, [locale, seed]);
  const status = validateNickname(value);
  return (
    <fieldset className="field">
      <legend>{t('setup.nickname.label')}</legend>
      <div className="chips">
        {suggestions.map((s) => (
          <button key={s} type="button" className={`chip${value === s ? ' chip--on' : ''}`} aria-pressed={value === s} onClick={() => onChange(s)}>{s}</button>
        ))}
        <button type="button" className="chip" onClick={() => setSeed(seed + 1)}>
          <Icon name="shuffle" />
          {t('setup.nickname.shuffle')}
        </button>
      </div>
      <label className="field__label" htmlFor="nickname">{t('setup.nickname.type')}</label>
      <input
        id="nickname"
        className="input"
        value={value}
        maxLength={NICKNAME_MAX_LENGTH}
        autoComplete="off"
        spellCheck={false}
        dir="auto"
        aria-describedby="nickname-note nickname-error"
        onChange={(e) => onChange(e.target.value)}
      />
      <p id="nickname-note" className="field__note">{t('setup.nickname.privacy')}</p>
      <p id="nickname-error" className="field__error" role="status">
        {value !== '' && status !== 'ok' ? t(`setup.nickname.error.${status}`) : ''}
      </p>
    </fieldset>
  );
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const locale = useLocale();
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const rtl = locale === 'ar';
    const d = e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : e.key === 'ArrowDown' ? 4 : e.key === 'ArrowUp' ? -4 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + AVATAR_IDS.length) % AVATAR_IDS.length;
    onChange(AVATAR_IDS[j] as string);
    refs.current[j]?.focus();
  };
  return (
    <fieldset className="field">
      <legend>{t('setup.avatar.label')}</legend>
      <div className="avatar-grid" role="radiogroup" aria-label={t('setup.avatar.label')}>
        {AVATAR_IDS.map((id, i) => (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === id}
            tabIndex={value === id || (!value && i === 0) ? 0 : -1}
            className={`avatar-option${value === id ? ' avatar-option--on' : ''}`}
            onClick={() => onChange(id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <Avatar id={id} size={56} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function StagePicker({ value, onChange }: { value: Stage; onChange: (s: Stage) => void }) {
  const t = useT();
  const { n } = useFmt();
  return (
    <fieldset className="field">
      <legend>{t('setup.stage.label')}</legend>
      <div className="radio-list">
        {([1, 2, 3, 4, 5] as Stage[]).map((s) => (
          <label key={s} className={`radio-row${value === s ? ' radio-row--on' : ''}`}>
            <input type="radio" name="stage" checked={value === s} onChange={() => onChange(s)} />
            <span>
              <strong>{t('setup.stage.option', { stage: n(s) })}</strong> {t(`setup.stage.desc.${s}`)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** First-run profile creation behind the Grown-up Gate (FR-02, FR-03). */
export function SetupPage() {
  const t = useT();
  const locale = useLocale();
  const path = usePath();
  const navigate = useNavigate();
  const unlocked = useApp((s) => s.grownUpUnlocked);
  const [count, setCount] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('fox');
  const [stage, setStage] = useState<Stage>(1);
  const [numberStyle, setNumberStyle] = useState<'arab' | 'latn'>('arab');
  const [mathDirection, setMathDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void listProfiles().then((p) => setCount(p.length));
  }, []);
  if (count === null) return <div className="boot" aria-busy="true" />;
  if (!unlocked) {
    return (
      <div className="page">
        <TopBar end={<LanguageSwitch />} />
        <main className="center-page" id="main">
          <GrownUpGate onPass={() => undefined} onCancel={count > 0 ? () => navigate(path('/')) : undefined} />
        </main>
      </div>
    );
  }
  if (count >= MAX_PROFILES) return <Navigate to={path('/grown-ups/profiles')} replace />;

  const valid = validateNickname(nickname) === 'ok';
  const create = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const prefs = { ...defaultPrefs(locale, stage), ...(locale === 'ar' ? { numberStyle, mathDirection } : {}) };
    const p = await createProfile({ nickname: nickname.trim(), avatarId: avatar, startingStage: stage, prefs, now: appClock.now() });
    useApp.getState().setDevice(await saveDevice({ lastLocale: locale }));
    await useApp.getState().setActiveProfile(p.id);
    useApp.getState().setGrownUpUnlocked(false);
    navigate(path('/home'));
  };
  return (
    <div className="page">
      <TopBar end={<LanguageSwitch />} />
      <main className="form-page" id="main">
        <h1>{t('setup.title')}</h1>
        <p className="lead">{t('setup.lead')}</p>
        <NicknamePicker value={nickname} onChange={setNickname} />
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <StagePicker value={stage} onChange={setStage} />
        {locale === 'ar' && (
          <fieldset className="field">
            <legend>{t('setup.arabic.label')}</legend>
            <p className="field__note">{t('setup.arabic.note')}</p>
            <div className="radio-list">
              <label className={`radio-row${numberStyle === 'arab' ? ' radio-row--on' : ''}`}><input type="radio" name="ns" checked={numberStyle === 'arab'} onChange={() => setNumberStyle('arab')} />{t('settings.numberStyle.arab')}</label>
              <label className={`radio-row${numberStyle === 'latn' ? ' radio-row--on' : ''}`} data-digit-sample><input type="radio" name="ns" checked={numberStyle === 'latn'} onChange={() => setNumberStyle('latn')} />{t('settings.numberStyle.latn')}</label>
              <label className={`radio-row${mathDirection === 'rtl' ? ' radio-row--on' : ''}`}><input type="radio" name="md" checked={mathDirection === 'rtl'} onChange={() => setMathDirection('rtl')} />{t('settings.mathDirection.rtl')}</label>
              <label className={`radio-row${mathDirection === 'ltr' ? ' radio-row--on' : ''}`}><input type="radio" name="md" checked={mathDirection === 'ltr'} onChange={() => setMathDirection('ltr')} />{t('settings.mathDirection.ltr')}</label>
            </div>
          </fieldset>
        )}
        <Button onClick={() => void create()} disabled={!valid || saving} trailingIcon="arrow-forward">{t('setup.create')}</Button>
      </main>
    </div>
  );
}
