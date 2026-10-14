import { useState } from 'react';
import { useApp } from './store';
import { getDevDayOffset, setDevDayOffset } from '../services/clock';
import { PSEUDO_KEY, pseudoEnabled } from '../services/i18n';
import { localDateString } from '../domain/time';
import { appClock } from '../services/clock';
import { saveProgress, getProgress } from '../services/storage/repo';
import { MVP_SKILLS } from '../services/content';
import type { SkillId, Tier } from '../domain/math/types';

/* Dev-only debug panel (agent-instructions §3): clock offset, pseudo-locale, Tier override.
   Excluded from production builds by the import.meta.env.DEV guard in LocaleLayout; strings are developer-facing. */
export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(getDevDayOffset());
  const [skill, setSkill] = useState<SkillId>('ADD-04');
  const profileId = useApp((s) => s.activeProfileId);
  if (!open) {
    return (
      <button type="button" className="debug-toggle" onClick={() => setOpen(true)} aria-label="debug">
        ⚙
      </button>
    );
  }
  const shift = (d: number) => {
    setDevDayOffset(offset + d);
    setOffset(offset + d);
  };
  const setTier = async (tier: Tier) => {
    if (!profileId) return;
    const row = await getProgress(profileId, skill);
    await saveProgress({ ...row, currentTier: tier });
    await useApp.getState().refresh();
  };
  const setStars = async (stars: 0 | 1 | 2 | 3) => {
    if (!profileId) return;
    const row = await getProgress(profileId, skill);
    await saveProgress({ ...row, stars });
    await useApp.getState().refresh();
  };
  return (
    <aside className="debug" lang="en" dir="ltr">
      <button type="button" onClick={() => setOpen(false)}>✕</button>
      <p>{`Clock: ${localDateString(appClock.now())} (offset ${offset}d)`}</p>
      <button type="button" onClick={() => shift(1)}>{'+1 day'}</button>
      <button type="button" onClick={() => shift(-offset)}>{'reset'}</button>
      <label>
        <input
          type="checkbox"
          defaultChecked={pseudoEnabled()}
          onChange={(e) => {
            localStorage.setItem(PSEUDO_KEY, e.target.checked ? '1' : '0');
            location.reload();
          }}
        />
        {' pseudo-locale en-XA'}
      </label>
      <select value={skill} onChange={(e) => setSkill(e.target.value as SkillId)}>
        {MVP_SKILLS.map((s) => <option key={s.id}>{s.id}</option>)}
      </select>
      {([1, 2, 3] as Tier[]).map((tier) => <button key={tier} type="button" onClick={() => void setTier(tier)}>{`Tier ${tier}`}</button>)}
      {([0, 1, 2, 3] as const).map((s) => <button key={s} type="button" onClick={() => void setStars(s)}>{`${s}★`}</button>)}
    </aside>
  );
}
