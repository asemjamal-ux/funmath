import { useReducedMotion, useT } from '../app/hooks';
import calm from '../assets/fanak/calm.webp';
import cheer from '../assets/fanak/cheer.webp';
import curious from '../assets/fanak/curious.webp';
import happy from '../assets/fanak/happy.webp';
import happyClip from '../assets/fanak/happy-clip.webp';
import thinking from '../assets/fanak/thinking.webp';
import { IconButton } from './Button';

export type Expression = 'happy' | 'thinking' | 'cheer' | 'curious' | 'calm';

// Rendered pictures of Fanak, one per expression, all framed alike (decision 007). Each file is a strip of frames:
// the picture, then a blink where the eyes are open, then a wave for the happy one. CSS plays them (scenery.css).
const ART: Record<Expression, [src: string, frames: number]> = { happy: [happy, 3], thinking: [thinking, 2], cheer: [cheer, 1], curious: [curious, 2], calm: [calm, 1] };

/**
 * Fanak the fennec fox (DS §2). Decorative unless `label` is given. Faces the reading direction via CSS.
 * `lively` plays the short looping clip where Fanak greets the learner (Home, welcome): he blinks, wiggles his ears
 * and waves. Calm mode and reduced motion keep the still picture.
 */
export function Mascot({ expression = 'happy', size = 96, label, lively }: { expression?: Expression; size?: number; label?: string; lively?: boolean }) {
  const reduced = useReducedMotion();
  const clip = lively && !reduced && expression === 'happy';
  const [src, frames] = ART[expression];
  return (
    <img
      className={`mascot mascot--${expression} mascot--${clip ? 'clip' : `f${frames}`}`}
      src={clip ? happyClip : src}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
    />
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
