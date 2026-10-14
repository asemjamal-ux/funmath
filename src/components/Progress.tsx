import { useFmt, useT } from '../app/hooks';
import type { Operation } from '../domain/math/types';
import { Icon } from './Icon';
import { MathNumber } from './MathDisplay';

export type DotState = 'upcoming' | 'current' | 'correct' | 'incorrect';

/** One dot per Item; fills from inline-start (DS §8.5). */
export function ProgressDots({ states, current, total }: { states: DotState[]; current: number; total: number }) {
  const t = useT();
  const { n } = useFmt();
  return (
    <div className="dots" role="img" aria-label={t('practice.progress', { current: n(current + 1), total: n(total) })}>
      {states.map((s, i) => (
        <span key={i} className={`dot dot--${s}`}>
          {s === 'correct' && <Icon name="check" />}
        </span>
      ))}
    </div>
  );
}

export function StarRating({ stars, size = 24 }: { stars: number; size?: 24 | 32 | 48 }) {
  const t = useT();
  const { n } = useFmt();
  return (
    <span className="stars" role="img" aria-label={t('common.starsOf', { count: stars, n: n(stars), total: n(3) })}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="star" size={size} filled={i <= stars} className={i <= stars ? 'star star--on' : 'star'} />
      ))}
    </span>
  );
}

export function SeedCounter({ seeds, bump }: { seeds: number; bump?: number }) {
  const t = useT();
  const { n } = useFmt();
  return (
    <span className="seeds" aria-label={t('common.seedsCount', { count: seeds, n: n(seeds) })} role="img">
      <Icon name="seed" />
      <MathNumber value={seeds} />
      {bump ? <span className="seeds__bump" aria-hidden="true">+{n(bump)}</span> : null}
    </span>
  );
}

export const OP_SYMBOL: Record<Operation, string> = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };
export const OP_SHORT: Record<Operation, 'add' | 'sub' | 'mul' | 'div'> = { addition: 'add', subtraction: 'sub', multiplication: 'mul', division: 'div' };

/** Operation identity: colour + symbol + shape so it's recognisable without colour (DS §2). */
export function OpBadge({ op, size = 48 }: { op: Operation; size?: number }) {
  const shape =
    op === 'addition' ? <circle cx="24" cy="24" r="21" />
    : op === 'subtraction' ? <rect x="4" y="4" width="40" height="40" rx="8" />
    : op === 'multiplication' ? <path d="M24 3 45 42H3z" />
    : <path d="M24 2 43 13v22L24 46 5 35V13z" />;
  return (
    <svg className={`op-badge op-${op}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <g className="op-badge__shape">{shape}</g>
      <text x="24" y={op === 'multiplication' ? 36 : 32} textAnchor="middle" className="op-badge__sym">{OP_SYMBOL[op]}</text>
    </svg>
  );
}

const AVATARS: Record<string, string> = {
  fox: '🦊', camel: '🐪', owl: '🦉', turtle: '🐢', dolphin: '🐬', lion: '🦁',
  elephant: '🐘', rabbit: '🐰', cat: '🐱', giraffe: '🦒', penguin: '🐧', parrot: '🦜',
};
export const AVATAR_IDS = Object.keys(AVATARS);

export function Avatar({ id, size = 64 }: { id: string; size?: number }) {
  const t = useT();
  return (
    <span className={`avatar avatar--${id}`} role="img" aria-label={t(`avatar.${id}`)} style={{ inlineSize: size, blockSize: size, fontSize: size * 0.55 }}>
      {AVATARS[id] ?? AVATARS.fox}
    </span>
  );
}
