import { useFmt, useT } from '../app/hooks';
import { isTopic, type Arith, type Operation, type Topic } from '../domain/math/types';
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

export const OP_SYMBOL: Record<Arith, string> = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };
export const OP_SHORT: Record<Operation, 'add' | 'sub' | 'mul' | 'div' | 'frac' | 'dec' | 'geo'> = {
  addition: 'add', subtraction: 'sub', multiplication: 'mul', division: 'div', fractions: 'frac', decimals: 'dec', geometry: 'geo',
};

/**
 * Advanced-World glyphs drawn rather than typed, so no digit shows in the wrong number style (decision 005):
 * a pie with one part taken, a decimal point between two digit boxes, a ruler-edged rectangle.
 */
export function TopicGlyph({ topic, size = 48 }: { topic: Topic; size?: number }) {
  return (
    <svg className="topic-glyph" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {topic === 'fractions' ? (
        <>
          <circle cx="24" cy="24" r="16" className="topic-glyph__line" />
          <path d="M24 24V8a16 16 0 0 1 16 16z" className="topic-glyph__fill" />
          <path d="M24 8v32M8 24h32" className="topic-glyph__line" />
        </>
      ) : topic === 'decimals' ? (
        <>
          <rect x="5" y="12" width="15" height="24" rx="3" className="topic-glyph__line" />
          <rect x="28" y="12" width="15" height="24" rx="3" className="topic-glyph__line" />
          <circle cx="24" cy="33" r="3.5" className="topic-glyph__dot" />
        </>
      ) : (
        <>
          <rect x="7" y="13" width="34" height="22" rx="2" className="topic-glyph__line" />
          <path d="M7 24h5M18 13v5M30 13v5M36 24h5" className="topic-glyph__line" />
          <path d="M7 35h34" className="topic-glyph__fill-line" />
        </>
      )}
    </svg>
  );
}

/** Operation identity: colour + symbol + shape so it's recognisable without colour (DS §2). */
export function OpBadge({ op, size = 48 }: { op: Operation; size?: number }) {
  const shape =
    op === 'addition' ? <circle cx="24" cy="24" r="21" />
    : op === 'subtraction' ? <rect x="4" y="4" width="40" height="40" rx="8" />
    : op === 'multiplication' ? <path d="M24 3 45 42H3z" />
    : op === 'division' ? <path d="M24 2 43 13v22L24 46 5 35V13z" />
    : op === 'fractions' ? <path d="M24 2l6.5 6.3 9-.9.9 9L46.6 24l-6.3 7.6-.9 9-9-.9L24 46l-6.4-6.3-9 .9-.9-9L1.4 24l6.3-7.6.9-9 9 .9z" />
    : op === 'decimals' ? <path d="M24 2 46 24 24 46 2 24z" />
    : <path d="M15 3h18l12 12v18L33 45H15L3 33V15z" />;
  return (
    <svg className={`op-badge op-${op}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <g className="op-badge__shape">{shape}</g>
      {isTopic(op) ? (
        <g transform="translate(10 10) scale(0.58)"><TopicGlyph topic={op} /></g>
      ) : (
        <text x="24" y={op === 'multiplication' ? 36 : 32} textAnchor="middle" className="op-badge__sym">{OP_SYMBOL[op]}</text>
      )}
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
