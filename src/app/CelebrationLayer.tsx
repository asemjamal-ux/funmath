import { useEffect, useRef } from 'react';
import { useFmt, useReducedMotion, useT } from './hooks';
import { useApp } from './store';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Confetti } from '../components/Feedback';
import { OasisScene } from '../components/OasisScene';
import { TrophyArt } from '../components/TrophyArt';
import { playSfx } from '../services/audio/audio';
import { TROPHIES } from '../services/content';

/** Trophy and Oasis Stage celebrations, one at a time, dismissable in one tap (FR-21, DS §8.6). */
export function CelebrationLayer() {
  const t = useT();
  const { n } = useFmt();
  const reduced = useReducedMotion();
  const current = useApp((s) => (s.holdCelebrations ? undefined : s.celebrations[0]));
  const shift = useApp((s) => s.shiftCelebration);
  const played = useRef<unknown>(null);

  useEffect(() => {
    if (current && played.current !== current) {
      played.current = current;
      playSfx(current.kind === 'trophy' ? 'fanfare' : 'sparkle');
    }
  }, [current]);

  if (!current) return null;
  const trophy = current.kind === 'trophy' ? TROPHIES.find((x) => x.id === current.trophyId) : undefined;
  return (
    <Dialog
      open
      className="celebration"
      title={current.kind === 'trophy' ? t('rewards.trophy.earned') : t('rewards.oasis.grew')}
      onClose={shift}
      actions={<Button onClick={shift}>{t('rewards.yay')}</Button>}
    >
      {!reduced && <Confetti />}
      {current.kind === 'trophy' && trophy ? (
        <div className="celebration__trophy">
          <TrophyArt icon={trophy.icon} earned size={120} />
          <p className="celebration__name">{t(trophy.titleKey)}</p>
        </div>
      ) : current.kind === 'oasis' ? (
        <div className="celebration__oasis">
          <OasisScene stage={current.stage} growing />
          <p>{t('rewards.oasis.stage', { stage: n(current.stage), total: n(10) })}</p>
        </div>
      ) : null}
    </Dialog>
  );
}
