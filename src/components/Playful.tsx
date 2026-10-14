import { useEffect, useRef, useState } from 'react';
import { useFmt, useReducedMotion, useT } from '../app/hooks';
import { playSfx } from '../services/audio/audio';
import { Mascot, SpeechBubble } from './Mascot';

/**
 * Fidget tiles around the Home Oasis (redesign 002): tap one to spin it with a soft pop.
 * Purely playful — no scoring, no timers. Numbers go through the formatting service (N-08).
 */
export function FloatingTiles() {
  const t = useT();
  const { n } = useFmt();
  const reduced = useReducedMotion();
  const [spinning, setSpinning] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const tiles = [
    { key: 1, text: n(3), label: t('home.tile.number', { value: n(3) }) },
    { key: 2, text: '+', label: t('home.tile.plus') },
    { key: 3, text: n(7), label: t('home.tile.number', { value: n(7) }) },
    { key: 4, text: `= ${n(10)}`, label: t('home.tile.number', { value: n(10) }) },
  ];
  const spin = (k: number) => {
    playSfx('pop');
    if (reduced) return;
    setSpinning(k);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSpinning(null), 650);
  };
  return (
    <div className="float-tiles">
      {tiles.map((tile) => (
        <button
          key={tile.key}
          type="button"
          className={`float-tile float-tile--${tile.key}${spinning === tile.key ? ' float-tile--spin' : ''}`}
          aria-label={tile.label}
          onClick={() => spin(tile.key)}
        >
          <bdi dir="ltr">{tile.text}</bdi>
        </button>
      ))}
    </div>
  );
}

const CHEERS = 5;

/** Fanak on Home: tap him and he jumps and cheers (a different cheer each tap). */
export function TappableFanak({ children, size = 96 }: { children: React.ReactNode; size?: number }) {
  const t = useT();
  const reduced = useReducedMotion();
  const [jumping, setJumping] = useState(false);
  const [cheer, setCheer] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const tap = () => {
    playSfx('sparkle');
    setCheer((c) => ((c ?? -1) + 1) % CHEERS);
    if (reduced) return;
    setJumping(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJumping(false), 720);
  };
  return (
    <div className="fanak-says">
      <button type="button" className={`fanak-tap${jumping ? ' fanak-tap--jump' : ''}`} onClick={tap} aria-label={t('home.fanak.tap')}>
        <Mascot expression={cheer === null ? 'happy' : 'cheer'} size={size} />
      </button>
      <SpeechBubble>
        {children}
        <span className="fanak-cheer" aria-live="polite">
          {cheer !== null && <strong>{t(`home.fanak.cheer${cheer + 1}`)}</strong>}
        </span>
      </SpeechBubble>
    </div>
  );
}
