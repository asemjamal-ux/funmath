import { useT } from '../app/hooks';
import { Icon } from './Icon';

/** Slides in above the answer area; announced politely. Never red, never "wrong" (DS §3.3, §8.6). */
export function FeedbackBanner({ kind, message }: { kind: 'correct' | 'tryAgain' | null; message?: string }) {
  const t = useT();
  return (
    <div className="feedback-slot" aria-live="polite" role="status">
      {kind && (
        <div className={`feedback feedback--${kind}`}>
          <Icon name={kind === 'correct' ? 'check' : 'lightbulb'} size={32} />
          <span>{message ?? t(kind === 'correct' ? 'practice.feedback.correct' : 'practice.feedback.tryAgain')}</span>
        </div>
      )}
    </div>
  );
}

export function Confetti() {
  // ≤ 40 soft, slow particles; hidden entirely under reduced motion via CSS (DS §11.2).
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} className={`confetti__p confetti__p--${i % 4}`} style={{ insetInlineStart: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 60}ms` }} />
      ))}
    </div>
  );
}
