import { useEffect, useRef } from 'react';
import { useFmt, useLocale, useT, type Fmt } from '../app/hooks';
import { parseDigits } from '../domain/math/check';
import { Icon } from './Icon';
import { MathNumber } from './MathDisplay';

export type ChoiceState = 'default' | 'correct' | 'tryAgain';

export interface ChoiceGroupProps {
  choices: number[];
  states: Record<number, ChoiceState>;
  onChoose: (value: number) => void;
  label: string;
  large?: boolean;
  disabled?: boolean;
}

/** AnswerChoice tiles with radiogroup semantics; arrow keys follow visual order in both directions. */
export function ChoiceGroup({ choices, states, onChoose, label, large, disabled }: ChoiceGroupProps) {
  const locale = useLocale();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, delta: number) => {
    const n = choices.length;
    for (let step = 1; step <= n; step++) {
      const idx = (from + delta * step + n * n) % n;
      const el = refs.current[idx];
      if (el) {
        el.focus();
        return;
      }
    }
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const rtl = locale === 'ar';
    if (e.key === 'ArrowRight') move(i, rtl ? -1 : 1);
    else if (e.key === 'ArrowLeft') move(i, rtl ? 1 : -1);
    else if (e.key === 'ArrowDown') move(i, 1);
    else if (e.key === 'ArrowUp') move(i, -1);
    else return;
    e.preventDefault();
  };
  return (
    <div role="radiogroup" aria-label={label} className={`choices${large ? ' choices--large' : ''}`}>
      {choices.map((c, i) => {
        const st = states[c] ?? 'default';
        const inactive = st === 'tryAgain' || disabled;
        return (
          <button
            key={c}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={st === 'correct'}
            aria-disabled={inactive || undefined}
            tabIndex={i === 0 ? 0 : -1}
            className={`choice choice--${st}${String(c).length > 3 ? ' choice--long' : ''}`}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => {
              if (!inactive) onChoose(c);
            }}
          >
            <MathNumber value={c} />
            {st === 'correct' && <Icon name="check" className="choice__badge" />}
            {st === 'tryAgain' && <Icon name="lightbulb" className="choice__badge" />}
          </button>
        );
      })}
    </div>
  );
}

/** A typed answer for display; a decimal still being typed ("3.") keeps its point (decimals World). */
export function formatEntry(value: string, fmt: Fmt): string {
  const [whole = '', frac] = value.split('.');
  if (frac === undefined) return fmt.n(Number(whole));
  const point = fmt.n(1.5).replace(/[^.,\u066b]/g, '') || '.';
  return fmt.n(Number(whole || '0')) + point + [...frac].map((d) => fmt.n(Number(d))).join('');
}

export interface NumberPadProps {
  onDigit: (d: number) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  /** Adds a decimal-point key (decimals World); the pad gains a row. */
  onPoint?: () => void;
  large?: boolean;
  disabled?: boolean;
  submitDisabled?: boolean;
  /** Physical keyboard input is mirrored to the pad while active. */
  captureKeyboard?: boolean;
}

/** 3 × 4 pad, never mirrored (DS §8.2); digits shown in the active Number Style. */
export function NumberPad({ onDigit, onBackspace, onSubmit, onPoint, large, disabled, submitDisabled, captureKeyboard = true }: NumberPadProps) {
  const t = useT();
  const fmt = useFmt();
  const handlers = useRef({ onDigit, onBackspace, onSubmit, onPoint, disabled, submitDisabled });
  handlers.current = { onDigit, onBackspace, onSubmit, onPoint, disabled, submitDisabled };

  useEffect(() => {
    if (!captureKeyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const h = handlers.current;
      if (h.disabled || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const d = parseDigits(e.key);
      if (d !== null && e.key.length === 1) {
        e.preventDefault();
        h.onDigit(d);
      } else if (h.onPoint && (e.key === '.' || e.key === ',' || e.key === '\u066b')) {
        e.preventDefault();
        h.onPoint();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        h.onBackspace();
      } else if (e.key === 'Enter' && !h.submitDisabled && !(target && target.tagName === 'BUTTON')) {
        e.preventDefault();
        h.onSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [captureKeyboard]);

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return (
    <div className={`numpad${large ? ' numpad--large' : ''}${onPoint ? ' numpad--decimal' : ''} num-${fmt.numberStyle}`} dir="ltr" role="group" aria-label={t('answer.pad.label')}>
      {keys.map((k) => (
        <button key={k} type="button" className="numpad__key" disabled={disabled} onClick={() => onDigit(k)} aria-label={fmt.n(k)}>
          {fmt.n(k)}
        </button>
      ))}
      <button type="button" className="numpad__key numpad__key--fn" disabled={disabled} onClick={onBackspace} aria-label={t('answer.pad.backspace')}>
        <Icon name="backspace" size={32} />
      </button>
      <button type="button" className="numpad__key" disabled={disabled} onClick={() => onDigit(0)} aria-label={fmt.n(0)}>
        {fmt.n(0)}
      </button>
      {onPoint && (
        <button type="button" className="numpad__key numpad__key--fn" disabled={disabled} onClick={onPoint} aria-label={t('answer.pad.point')}>
          <span aria-hidden="true">{formatEntry('0.', fmt).slice(-1)}</span>
        </button>
      )}
      <button type="button" className="numpad__key numpad__key--ok" disabled={disabled || submitDisabled} onClick={onSubmit} aria-label={t('answer.pad.check')}>
        <Icon name="check" size={32} />
      </button>
    </div>
  );
}

/** Shows the typed answer; announces the current value politely (DS §8.2). */
export function AnswerField({ value, state = 'default' }: { value: string; state?: ChoiceState }) {
  const t = useT();
  const fmt = useFmt();
  const n = value === '' ? null : Number(value);
  const typing = value.includes('.');
  return (
    <div className={`answer-field answer-field--${state} num-${fmt.numberStyle}`}>
      <span className="visually-hidden" aria-live="polite">
        {n === null ? t('answer.field.empty') : t('answer.field.value', { value: typing ? formatEntry(value, fmt) : fmt.n(n) })}
      </span>
      <span aria-hidden="true" className="answer-field__value">
        {n !== null && (typing ? <bdi dir="ltr" className={`math-number num-${fmt.numberStyle}`}>{formatEntry(value, fmt)}</bdi> : <MathNumber value={n} />)}
        {state === 'default' && <span className="answer-field__caret" />}
      </span>
    </div>
  );
}

export const MAX_ENTRY_DIGITS = 6;
