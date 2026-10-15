import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useFmt, useLocale, usePath, useT } from '../app/hooks';
import { useApp } from '../app/store';
import { useActivityStore } from '../app/activityStore';
import { Button } from '../components/Button';
import { ConfirmDialog, Dialog } from '../components/Dialog';
import { GrownUpGate } from '../components/GrownUpGate';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Progress';
import { LanguageSwitch, TopBar } from '../components/TopBar';
import { BREAK_REMINDER_OPTIONS, MAX_PROFILES, NEEDS_HELP_ACCURACY, NEEDS_HELP_MIN_ITEMS, REPORT_ACCURACY_WINDOW_DAYS } from '../domain/constants';
import type { Stage } from '../domain/math/types';
import { localDateString } from '../domain/time';
import { appClock } from '../services/clock';
import { MVP_SKILLS, OPERATIONS, TROPHIES } from '../services/content';
import { formatDate, startOfWeek } from '../services/formatting/date';
import { backupFileName, exportProfile, importBackup, parseBackup, type BackupFile } from '../services/storage/backup';
import type { ProfileRow, SessionRow } from '../services/storage/db';
import { hashPin } from '../services/storage/pin';
import {
  deleteAllData, deleteProfile, getDevice, listProfiles, loadProfileData, responsesFor, saveDevice, sessionsFor, updatePrefs, updateProfile, type ProfileData,
} from '../services/storage/repo';
import { AvatarPicker, NicknamePicker, StagePicker, validateNickname } from './Welcome';

/** Gate guard for every /grown-ups route (FR-30). Passing it lasts until the learner area is re-entered. */
export function GrownUpsLayout() {
  const t = useT();
  const path = usePath();
  const navigate = useNavigate();
  const unlocked = useApp((s) => s.grownUpUnlocked);
  const leave = () => {
    useApp.getState().setGrownUpUnlocked(false);
    navigate(path(useApp.getState().activeProfileId ? '/home' : '/'));
  };
  if (!unlocked) {
    return (
      <div className="page grownups">
        <TopBar end={<LanguageSwitch />} />
        <main className="center-page" id="main">
          <GrownUpGate onPass={() => undefined} onCancel={leave} />
        </main>
      </div>
    );
  }
  const links: Array<[string, string]> = [
    ['/grown-ups', 'grownups.nav.home'],
    ['/grown-ups/profiles', 'grownups.nav.profiles'],
    ['/grown-ups/settings', 'grownups.nav.settings'],
    ['/grown-ups/data', 'grownups.nav.data'],
    ['/grown-ups/privacy', 'grownups.nav.privacy'],
    ['/worksheets', 'grownups.nav.worksheets'],
  ];
  return (
    <div className="page grownups">
      <TopBar start={<Button variant="ghost" size="m" leadingIcon="arrow-back" onClick={leave}>{t('grownups.leave')}</Button>} end={<LanguageSwitch />} />
      <div className="grownups__layout">
        <nav className="grownups__nav" aria-label={t('grownups.nav.label')}>
          {links.map(([to, key]) => (
            <NavLink key={to} to={path(to)} end className="grownups__navlink">{t(key)}</NavLink>
          ))}
        </nav>
        <main id="main" className="grownups__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function useProfiles(): [ProfileRow[] | null, () => void] {
  const [profiles, setProfiles] = useState<ProfileRow[] | null>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    void listProfiles().then(setProfiles);
  }, [v]);
  return [profiles, () => setV((x) => x + 1)];
}

export function GrownUpsHome() {
  const t = useT();
  const path = usePath();
  const [profiles] = useProfiles();
  if (!profiles) return null;
  return (
    <>
      <h1>{t('grownups.title')}</h1>
      <p className="lead">{t('grownups.lead')}</p>
      <ul className="gu-profiles">
        {profiles.map((p) => (
          <li key={p.id} className="gu-profile">
            <Avatar id={p.avatarId} size={48} />
            <span dir="auto" className="gu-profile__name">{p.nickname}</span>
            <Link className="link-btn" to={path(`/grown-ups/report/${p.id}`)}>{t('grownups.viewReport')}</Link>
          </li>
        ))}
      </ul>
      {profiles.length === 0 && <p>{t('grownups.noProfiles')}</p>}
    </>
  );
}

/* ---------------- Report (FR-31) ---------------- */
interface SkillStat {
  attempts: number;
  firstTry: number;
}

export function ReportPage() {
  const t = useT();
  const fmt = useFmt();
  const locale = useLocale();
  const path = usePath();
  const { profileId } = useParams();
  const device = useApp((s) => s.device);
  const [data, setData] = useState<ProfileData | null | undefined>(undefined);
  const [stats, setStats] = useState<Map<string, SkillStat>>(new Map());
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  useEffect(() => {
    if (!profileId) return;
    void (async () => {
      const d = await loadProfileData(profileId);
      setData(d ?? null);
      if (!d) return;
      const since = new Date(appClock.now().getTime() - REPORT_ACCURACY_WINDOW_DAYS * 86_400_000).toISOString();
      const rs = (await responsesFor(profileId)).filter((r) => r.answeredAt >= since && r.activity !== 'lesson');
      const m = new Map<string, SkillStat>();
      for (const r of rs) {
        const s = m.get(r.skillId) ?? { attempts: 0, firstTry: 0 };
        s.attempts++;
        if (r.firstTry) s.firstTry++;
        m.set(r.skillId, s);
      }
      setStats(m);
      setSessions(await sessionsFor(profileId));
    })();
  }, [profileId]);
  const week = useMemo(() => {
    const start = startOfWeek(appClock.now(), locale);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return localDateString(d);
    });
    const minutes = days.map((day) =>
      Math.round(
        sessions
          .filter((s) => localDateString(new Date(s.startedAt)) === day)
          .reduce((sum, s) => sum + Math.max(0, (new Date(s.endedAt ?? s.startedAt).getTime() - new Date(s.startedAt).getTime()) / 60000), 0),
      ),
    );
    return { days, minutes };
  }, [sessions, locale]);
  if (data === undefined) return null;
  if (data === null) return <Navigate to={path('/grown-ups')} replace />;
  const pct = (s?: SkillStat) => (s && s.attempts ? Math.round((s.firstTry / s.attempts) * 100) : null);
  const needsHelp = MVP_SKILLS.filter((s) => {
    const st = stats.get(s.id);
    return st && st.attempts >= NEEDS_HELP_MIN_ITEMS && st.firstTry / st.attempts < NEEDS_HELP_ACCURACY;
  });
  const totalWeek = week.minutes.reduce((a, b) => a + b, 0);
  const maxMin = Math.max(1, ...week.minutes);
  const dateOpts = { locale, numberStyle: fmt.numberStyle, calendar: device?.calendar ?? 'gregory' } as const;
  const weekday = (iso: string) => new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en', { weekday: 'short', calendar: dateOpts.calendar, numberingSystem: fmt.numberStyle }).format(new Date(`${iso}T12:00:00`));
  return (
    <>
      <h1>{t('report.title', { name: data.profile.nickname })}</h1>
      <section className="gu-section">
        <h2>{t('report.needsHelp')}</h2>
        {needsHelp.length ? (
          <ul>{needsHelp.map((s) => <li key={s.id}>{t(s.titleKey)} — {t('report.accuracy', { percent: fmt.n(pct(stats.get(s.id)) ?? 0) })}</li>)}</ul>
        ) : (
          <p>{t('report.noneNeedHelp')}</p>
        )}
      </section>
      <section className="gu-section">
        <h2>{t('report.week', { minutes: fmt.n(totalWeek) })}</h2>
        <div className="mini-chart" aria-hidden="true">
          {week.days.map((d, i) => (
            <div key={d} className="mini-chart__col">
              <span className="mini-chart__bar" style={{ blockSize: `${(100 * (week.minutes[i] ?? 0)) / maxMin}%` }} />
              <span className="mini-chart__label">{weekday(d)}</span>
            </div>
          ))}
        </div>
        <table className="report-table">
          <caption className="visually-hidden">{t('report.weekTable')}</caption>
          <thead><tr><th scope="col">{t('report.day')}</th><th scope="col">{t('report.minutes')}</th></tr></thead>
          <tbody>{week.days.map((d, i) => <tr key={d}><td>{formatDate(d, dateOpts)}</td><td>{fmt.n(week.minutes[i] ?? 0)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="gu-section">
        <h2>{t('report.skills')}</h2>
        <table className="report-table">
          <thead>
            <tr><th scope="col">{t('report.skill')}</th><th scope="col">{t('report.stars')}</th><th scope="col">{t('report.accuracyCol')}</th><th scope="col">{t('report.items')}</th></tr>
          </thead>
          <tbody>
            {OPERATIONS.flatMap((op) => MVP_SKILLS.filter((s) => s.operation === op)).map((s) => {
              const st = stats.get(s.id);
              const p = pct(st);
              return (
                <tr key={s.id}>
                  <td>{t(s.titleKey)} <span className="muted" lang="en" dir="ltr">{s.id}</span></td>
                  <td>{fmt.n(data.progress.get(s.id)?.stars ?? 0)}</td>
                  <td>{p === null ? '—' : t('report.accuracy', { percent: fmt.n(p) })}</td>
                  <td>{fmt.n(st?.attempts ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="gu-section">
        <h2>{t('report.trophies')}</h2>
        {data.trophies.length ? (
          <ul>
            {data.trophies.map((tr) => {
              const def = TROPHIES.find((x) => x.id === tr.trophyId);
              return <li key={tr.trophyId}>{def ? t(def.titleKey) : tr.trophyId} — {formatDate(tr.awardedAt, dateOpts)}</li>;
            })}
          </ul>
        ) : (
          <p>{t('report.noTrophies')}</p>
        )}
      </section>
    </>
  );
}

/* ---------------- Profiles (FR-06) ---------------- */
export function ProfilesPage() {
  const t = useT();
  const path = usePath();
  const navigate = useNavigate();
  const [profiles, reload] = useProfiles();
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('fox');
  const [stage, setStage] = useState<Stage>(1);
  const [deleting, setDeleting] = useState<ProfileRow | null>(null);
  if (!profiles) return null;
  const startEdit = (p: ProfileRow) => {
    setEditing(p);
    setNickname(p.nickname);
    setAvatar(p.avatarId);
    setStage(p.startingStage);
  };
  const save = async () => {
    if (!editing || validateNickname(nickname) !== 'ok') return;
    await updateProfile(editing.id, { nickname: nickname.trim(), avatarId: avatar, startingStage: stage });
    setEditing(null);
    reload();
    await useApp.getState().refresh();
  };
  const remove = async () => {
    if (!deleting) return;
    await deleteProfile(deleting.id);
    if (useApp.getState().activeProfileId === deleting.id) await useApp.getState().setActiveProfile(null);
    setDeleting(null);
    reload();
  };
  return (
    <>
      <h1>{t('profiles.title')}</h1>
      <ul className="gu-profiles">
        {profiles.map((p) => (
          <li key={p.id} className="gu-profile">
            <Avatar id={p.avatarId} size={48} />
            <span dir="auto" className="gu-profile__name">{p.nickname}</span>
            <Button variant="secondary" size="s" onClick={() => startEdit(p)}>{t('profiles.edit')}</Button>
            <Button variant="danger" size="s" leadingIcon="trash" onClick={() => setDeleting(p)}>{t('profiles.delete')}</Button>
          </li>
        ))}
      </ul>
      {profiles.length < MAX_PROFILES ? (
        <Button leadingIcon="plus" size="m" onClick={() => navigate(path('/setup'))}>{t('profiles.add')}</Button>
      ) : (
        <p className="note" role="note">{t('profiles.limit', { max: String(MAX_PROFILES) })}</p>
      )}
      <Dialog
        open={editing !== null}
        title={t('profiles.editTitle')}
        onClose={() => setEditing(null)}
        actions={<><Button variant="secondary" size="m" onClick={() => setEditing(null)}>{t('common.cancel')}</Button><Button size="m" onClick={() => void save()} disabled={validateNickname(nickname) !== 'ok'}>{t('common.save')}</Button></>}
      >
        <NicknamePicker value={nickname} onChange={setNickname} />
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <StagePicker value={stage} onChange={setStage} />
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        danger
        title={t('profiles.deleteTitle', { name: deleting?.nickname ?? '' })}
        body={t('profiles.deleteBody')}
        confirmLabel={t('profiles.delete')}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/* ---------------- Settings (FR-32, FR-33) ---------------- */
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" role="switch" className="toggle" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function SettingsPage() {
  const t = useT();
  const fmt = useFmt();
  const [profiles, reload] = useProfiles();
  const device = useApp((s) => s.device);
  const [selected, setSelected] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  if (!profiles) return null;
  const p = profiles.find((x) => x.id === selected) ?? profiles[0];
  const setPref = async (patch: Partial<ProfileRow['prefs']>) => {
    if (!p) return;
    await updatePrefs(p.id, patch);
    reload();
    await useApp.getState().refresh();
  };
  const setUnlockAll = async (v: boolean) => {
    if (!p) return;
    await updateProfile(p.id, { unlockAll: v });
    reload();
    await useApp.getState().refresh();
  };
  const setDevice = async (patch: Parameters<typeof saveDevice>[0]) => useApp.getState().setDevice(await saveDevice(patch));
  const savePin = async () => {
    if (!/^\d{4}$/.test(pin)) return;
    const h = await hashPin(pin);
    await setDevice({ pinHash: h.hash, pinSalt: h.salt });
    setPin('');
    setPinOpen(false);
  };
  return (
    <>
      <h1>{t('settings.title')}</h1>
      {p && (
        <section className="gu-section">
          <h2>{t('settings.profileSection')}</h2>
          <label className="field__label" htmlFor="settings-profile">{t('settings.chooseProfile')}</label>
          <select id="settings-profile" className="select" value={p.id} onChange={(e) => setSelected(e.target.value)}>
            {profiles.map((x) => <option key={x.id} value={x.id}>{x.nickname}</option>)}
          </select>
          <div className="settings-grid">
            <label className="select-row">
              <span>{t('settings.language')}</span>
              <select className="select" value={p.prefs.locale} onChange={(e) => void setPref({ locale: e.target.value as 'en' | 'ar' })}>
                <option value="en" lang="en">{t('common.lang.en')}</option>
                <option value="ar" lang="ar">{t('common.lang.ar')}</option>
              </select>
            </label>
            <label className="select-row">
              <span>{t('settings.numberStyle')}</span>
              <select className="select" value={p.prefs.numberStyle} onChange={(e) => void setPref({ numberStyle: e.target.value as 'arab' | 'latn', arabicDefaultsApplied: true })}>
                <option value="arab">{t('settings.numberStyle.arab')}</option>
                {/* Shows sample Western digits on purpose (decision 001 #8). */}
                <option value="latn" data-digit-sample>{t('settings.numberStyle.latn')}</option>
              </select>
            </label>
            <label className="select-row">
              <span>{t('settings.mathDirection')}</span>
              <select className="select" value={p.prefs.mathDirection} onChange={(e) => void setPref({ mathDirection: e.target.value as 'rtl' | 'ltr', arabicDefaultsApplied: true })}>
                <option value="rtl">{t('settings.mathDirection.rtl')}</option>
                <option value="ltr">{t('settings.mathDirection.ltr')}</option>
              </select>
            </label>
            <p className="field__note">{t('settings.arabicOnlyNote')}</p>
            <Toggle label={t('settings.narration')} checked={p.prefs.narration} onChange={(v) => void setPref({ narration: v })} />
            <Toggle label={t('settings.sfx')} checked={p.prefs.sfx} onChange={(v) => void setPref({ sfx: v })} />
            <Toggle label={t('settings.music')} checked={p.prefs.music} onChange={(v) => void setPref({ music: v })} />
            <Toggle label={t('settings.calmMode')} checked={p.prefs.calmMode} onChange={(v) => void setPref({ calmMode: v })} />
            <label className="select-row">
              <span>{t('settings.breakReminder')}</span>
              <select className="select" value={p.prefs.breakReminderMinutes} onChange={(e) => void setPref({ breakReminderMinutes: Number(e.target.value) as ProfileRow['prefs']['breakReminderMinutes'] })}>
                {BREAK_REMINDER_OPTIONS.map((m) => <option key={m} value={m}>{m === 0 ? t('settings.off') : t('settings.minutes', { n: fmt.n(m) })}</option>)}
              </select>
            </label>
            <Toggle label={t('settings.unlockAll')} checked={p.unlockAll} onChange={(v) => void setUnlockAll(v)} />
            <Toggle label={t('settings.showEarlier')} checked={p.prefs.showEarlierSkills ?? false} onChange={(v) => void setPref({ showEarlierSkills: v })} />
            <p className="field__note">{t('settings.showEarlierNote')}</p>
          </div>
        </section>
      )}
      <section className="gu-section">
        <h2>{t('settings.deviceSection')}</h2>
        <label className="select-row">
          <span>{t('settings.calendar')}</span>
          <select className="select" value={device?.calendar ?? 'gregory'} onChange={(e) => void setDevice({ calendar: e.target.value as 'gregory' | 'islamic-umalqura' })}>
            <option value="gregory">{t('settings.calendar.gregory')}</option>
            <option value="islamic-umalqura">{t('settings.calendar.hijri')}</option>
          </select>
        </label>
        <div className="select-row">
          <span>{t('settings.pin')}</span>
          <span className="row-actions">
            <Button size="s" variant="secondary" onClick={() => setPinOpen(true)}>{device?.pinHash ? t('settings.pinChange') : t('settings.pinSet')}</Button>
            {device?.pinHash && <Button size="s" variant="ghost" onClick={() => void setDevice({ pinHash: undefined, pinSalt: undefined })}>{t('settings.pinRemove')}</Button>}
          </span>
        </div>
        <Toggle label={t('settings.stats')} checked={device?.statsOptIn ?? false} onChange={(v) => void setDevice({ statsOptIn: v })} />
        <p className="field__note">{t('settings.statsNote')}</p>
      </section>
      <Dialog
        open={pinOpen}
        title={t('settings.pinSet')}
        onClose={() => setPinOpen(false)}
        actions={<><Button size="m" variant="secondary" onClick={() => setPinOpen(false)}>{t('common.cancel')}</Button><Button size="m" disabled={!/^\d{4}$/.test(pin)} onClick={() => void savePin()}>{t('common.save')}</Button></>}
      >
        <label className="field__label" htmlFor="pin">{t('settings.pinLabel')}</label>
        <input id="pin" className="input" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} dir="ltr" />
      </Dialog>
    </>
  );
}

/* ---------------- Data: backup / restore / delete (FR-34) ---------------- */
export function DataPage() {
  const t = useT();
  const locale = useLocale();
  const [profiles, reload] = useProfiles();
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [message, setMessage] = useState('');
  const [deleteAll, setDeleteAll] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const navigate = useNavigate();
  if (!profiles) return null;
  const download = async (p: ProfileRow) => {
    const backup = await exportProfile(p.id, appClock.now());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(p.nickname, localDateString(appClock.now()));
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(t('data.exported'));
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const res = await parseBackup(await file.text());
    if (!res.ok) {
      setMessage(t(`data.importError.${res.reason}`));
      return;
    }
    if (res.exists) setPending(res.backup);
    else await doImport(res.backup);
  };
  const doImport = async (b: BackupFile) => {
    await importBackup(b);
    setPending(null);
    setMessage(t('data.imported'));
    reload();
    await useApp.getState().refresh();
  };
  const word = t('data.deleteAllWord');
  const wipe = async () => {
    await deleteAllData();
    await useApp.getState().setActiveProfile(null);
    useApp.getState().setDevice(await getDevice());
    useActivityStore.setState({ states: {} });
    useApp.getState().setGrownUpUnlocked(false);
    setDeleteAll(false);
    navigate(`/${locale}/`);
  };
  return (
    <>
      <h1>{t('data.title')}</h1>
      <p className="lead">{t('data.lead')}</p>
      <section className="gu-section">
        <h2>{t('data.backup')}</h2>
        <ul className="gu-profiles">
          {profiles.map((p) => (
            <li key={p.id} className="gu-profile">
              <Avatar id={p.avatarId} size={40} />
              <span dir="auto" className="gu-profile__name">{p.nickname}</span>
              <Button size="s" variant="secondary" leadingIcon="download" onClick={() => void download(p)}>{t('data.export')}</Button>
            </li>
          ))}
        </ul>
      </section>
      <section className="gu-section">
        <h2>{t('data.restore')}</h2>
        <label className="file-btn">
          <Icon name="upload" />
          <span>{t('data.import')}</span>
          <input type="file" accept="application/json,.json" className="visually-hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </section>
      <p role="status" className="note">{message}</p>
      <section className="gu-section gu-section--danger">
        <h2>{t('data.deleteAll')}</h2>
        <p>{t('data.deleteAllBody')}</p>
        <Button variant="danger" size="m" leadingIcon="trash" onClick={() => setDeleteAll(true)}>{t('data.deleteAll')}</Button>
      </section>
      <ConfirmDialog
        open={pending !== null}
        title={t('data.overwriteTitle')}
        body={t('data.overwriteBody', { name: pending?.data.profile.nickname ?? '' })}
        confirmLabel={t('data.overwrite')}
        danger
        onConfirm={() => pending && void doImport(pending)}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={deleteAll}
        danger
        title={t('data.deleteAllTitle')}
        confirmLabel={t('data.deleteAll')}
        confirmDisabled={confirmText.trim() !== word}
        onConfirm={() => void wipe()}
        onCancel={() => { setDeleteAll(false); setConfirmText(''); }}
      >
        <p>{t('data.deleteAllConfirm', { word })}</p>
        <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label={t('data.deleteAllConfirm', { word })} autoComplete="off" />
      </ConfirmDialog>
    </>
  );
}

/* ---------------- Privacy (FR-35, FR-36) ---------------- */
export function PrivacyPage() {
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const feedback = 'mailto:feedback@numberoasis.example';
  return (
    <>
      <h1>{t('privacy.title')}</h1>
      {['collect', 'never', 'where', 'delete', 'stats', 'gate'].map((k) => (
        <section key={k} className="gu-section">
          <h2>{t(`privacy.${k}.title`)}</h2>
          <p>{t(`privacy.${k}.body`)}</p>
        </section>
      ))}
      <Button variant="ghost" size="m" onClick={() => setLeaving(true)}>{t('privacy.feedback')}</Button>
      <ConfirmDialog
        open={leaving}
        title={t('privacy.leavingTitle')}
        body={t('privacy.leavingBody')}
        confirmLabel={t('privacy.continue')}
        onConfirm={() => {
          setLeaving(false);
          const a = document.createElement('a');
          a.href = feedback;
          a.rel = 'noopener noreferrer';
          a.target = '_blank';
          a.click();
        }}
        onCancel={() => setLeaving(false)}
      />
    </>
  );
}
