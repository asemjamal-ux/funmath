import { useT } from '../app/hooks';
import { IconButton } from './Button';

export type Expression = 'happy' | 'thinking' | 'cheer' | 'curious' | 'calm';

/** Fanak the fennec fox (DS §2). Decorative unless `label` is given. Faces the reading direction via CSS. */
export function Mascot({ expression = 'happy', size = 96, label }: { expression?: Expression; size?: number; label?: string }) {
  const mouth =
    expression === 'cheer' ? <path d="M52 78q8 10 16 0z" fill="var(--color-ink)" />
    : expression === 'thinking' ? <path d="M54 80h12" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
    : expression === 'curious' ? <circle cx="60" cy="80" r="3.5" fill="var(--color-ink)" />
    : <path d="M53 77q7 7 14 0" stroke="var(--color-ink)" strokeWidth="3" fill="none" strokeLinecap="round" />;
  const eyes =
    expression === 'calm' ? (
      <>
        <path d="M42 62q5 4 10 0M68 62q5 4 10 0" stroke="var(--color-ink)" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <ellipse className="mascot__eye" cx="47" cy="62" rx="5" ry="6.5" fill="var(--color-ink)" />
        <ellipse className="mascot__eye" cx="73" cy="62" rx="5" ry="6.5" fill="var(--color-ink)" />
        <circle cx="49" cy="59.5" r="1.8" fill="var(--color-white)" />
        <circle cx="75" cy="59.5" r="1.8" fill="var(--color-white)" />
      </>
    );
  return (
    <svg
      className={`mascot mascot--${expression}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <ellipse cx="60" cy="112" rx="30" ry="5" fill="var(--art-shadow)" />
      {/* ears */}
      <path d="M30 52 14 6l36 30z" fill="var(--art-fox)" stroke="var(--color-ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 52 106 6 70 36z" fill="var(--art-fox)" stroke="var(--color-ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 44 21 16l20 18z" fill="var(--art-fox-inner)" />
      <path d="M90 44 99 16 79 34z" fill="var(--art-fox-inner)" />
      {/* body + scarf */}
      <path d="M38 96q22 22 44 0v14H38z" fill="var(--art-fox)" stroke="var(--color-ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 92q24 12 48 0l-2 9q-22 9-44 0z" fill="var(--pop-coral)" stroke="var(--color-ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M74 98l8 14-10-2z" fill="var(--pop-coral)" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinejoin="round" />
      {/* head */}
      <path d="M24 60q0-28 36-28t36 28q0 22-36 32-36-10-36-32z" fill="var(--art-fox)" stroke="var(--color-ink)" strokeWidth="3" />
      <path d="M40 74q20 22 40 0-6 16-20 18-14-2-20-18z" fill="var(--color-white)" opacity="0.85" />
      {eyes}
      <ellipse cx="60" cy="72" rx="5" ry="3.5" fill="var(--color-ink)" />
      {mouth}
      {expression === 'cheer' && <path d="M14 30l6 4m86-4-6 4M60 16v-6" stroke="var(--color-sun)" strokeWidth="4" strokeLinecap="round" />}
      {expression === 'thinking' && <circle cx="100" cy="30" r="5" fill="var(--color-sun)" />}
    </svg>
  );
}

/** Fanak's message; tail points toward Fanak and mirrors in RTL. */
export function SpeechBubble({ children, onSpeak, canSpeak, id }: { children: React.ReactNode; onSpeak?: () => void; canSpeak?: boolean; id?: string }) {
  const t = useT();
  return (
    <div className="bubble" id={id}>
      <div className="bubble__text">{children}</div>
      {onSpeak && canSpeak && <IconButton icon="speaker" label={t('common.listen')} onClick={onSpeak} />}
    </div>
  );
}

export function FanakSays({ expression, children, onSpeak, canSpeak, size = 88 }: { expression?: Expression; children: React.ReactNode; onSpeak?: () => void; canSpeak?: boolean; size?: number }) {
  return (
    <div className="fanak-says">
      <Mascot expression={expression} size={size} />
      <SpeechBubble onSpeak={onSpeak} canSpeak={canSpeak}>{children}</SpeechBubble>
    </div>
  );
}
