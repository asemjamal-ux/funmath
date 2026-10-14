import { useEffect, useRef, useState } from 'react';
import { useFmt, useT } from '../app/hooks';
import { useApp } from '../app/store';
import { GATE_COOLDOWN_MS, GATE_HOLD_MS, GATE_MAX_ATTEMPTS } from '../domain/constants';
import { verifyPin } from '../services/storage/pin';
import { NumberPad } from './Answering';
import { Button } from './Button';

const COOLDOWN_KEY = 'oasis.gate.cooldownUntil';

function cooldownUntil(): number {
  try {
    return Number(sessionStorage.getItem(COOLDOWN_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function randomDigits(): number[] {
  const buf = crypto.getRandomValues(new Uint8Array(3));
  return [...buf].map((x) => x % 10);
}

/**
 * Grown-up Gate (FR-30): press-and-hold 2 s, then three digits whose names are shown as words
 * (or the optional PIN). Three wrong answers → 30 s cooldown with neutral copy. A deterrent, not security.
 */
export function GrownUpGate({ onPass, onCancel }: { onPass: () => void; onCancel?: () => void }) {
  const t = useT();
  const fmt = useFmt();
  const device = useApp((s) => s.device);
  const usePin = Boolean(device?.pinHash && device.pinSalt);
  const [phase, setPhase] = useState<'hold' | 'challenge'>('hold');
  const [progress, setProgress] = useState(0);
  const [digits, setDigits] = useState(randomDigits);
  const [entry, setEntry] = useState('');
  const [fails, setFails] = useState(0);
  const [until, setUntil] = useState(cooldownUntil);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState('');
  const raf = useRef<number | undefined>(undefined);
  const start = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => heading.current?.focus(), [phase]);
  useEffect(() => {
    if (until <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [until]);
  useEffect(() => () => window.clearInterval(raf.current), []);

  const coolingDown = until > now;
  const secondsLeft = Math.ceil((until - now) / 1000);

  const beginHold = () => {
    if (coolingDown) return;
    if (raf.current !== undefined) return;
    start.current = Date.now();
    raf.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start.current) / GATE_HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        window.clearInterval(raf.current);
        raf.current = undefined;
        setPhase('challenge');
        setProgress(0);
      }
    }, 50);
  };
  const endHold = () => {
    window.clearInterval(raf.current);
    raf.current = undefined;
    if (phase === 'hold') setProgress(0);
  };

  const need = usePin ? 4 : 3;
  const submit = async (value: string) => {
    const ok = usePin && device?.pinHash && device.pinSalt ? await verifyPin(value, device.pinHash, device.pinSalt) : value === digits.join('');
    if (ok) {
      useApp.getState().setGrownUpUnlocked(true);
      onPass();
      return;
    }
    const f = fails + 1;
    setEntry('');
    if (f >= GATE_MAX_ATTEMPTS) {
      const u = Date.now() + GATE_COOLDOWN_MS;
      try {
        sessionStorage.setItem(COOLDOWN_KEY, String(u));
      } catch {
        // in-memory only
      }
      setUntil(u);
      setNow(Date.now());
      setFails(0);
      setPhase('hold');
      setDigits(randomDigits());
      setMessage('');
    } else {
      setFails(f);
      setDigits(randomDigits());
      setMessage(t('gate.notMatched'));
    }
  };

  const onDigit = (d: number) => {
    if (entry.length >= need) return;
    const next = entry + String(d);
    setEntry(next);
    if (next.length === need) void submit(next);
  };

  return (
    <section className="gate" aria-labelledby="gate-title">
      <h1 id="gate-title" tabIndex={-1} ref={heading} className="gate__title">{t('gate.title')}</h1>
      {coolingDown ? (
        <p className="gate__note" role="status">{t('gate.cooldown', { seconds: fmt.n(secondsLeft) })}</p>
      ) : phase === 'hold' ? (
        <>
          <p className="gate__note">{t('gate.holdInstruction')}</p>
          <button
            type="button"
            className="gate__hold"
            onPointerDown={beginHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                e.preventDefault();
                beginHold();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') endHold();
            }}
            onContextMenu={(e) => e.preventDefault()}
            aria-describedby="gate-hold-progress"
          >
            <svg viewBox="0 0 100 100" className="gate__ring" aria-hidden="true">
              <circle cx="50" cy="50" r="44" className="gate__ring-track" />
              <circle cx="50" cy="50" r="44" className="gate__ring-fill" style={{ strokeDashoffset: 276.5 * (1 - progress) }} />
            </svg>
            <span>{t('gate.hold')}</span>
          </button>
          <span id="gate-hold-progress" className="visually-hidden">{t('gate.holdProgress', { percent: fmt.n(Math.round(progress * 100)) })}</span>
        </>
      ) : (
        <>
          <p className="gate__note">{usePin ? t('gate.enterPin') : t('gate.enterDigits')}</p>
          {!usePin && <p className="gate__words" aria-live="polite">{digits.map((d) => t(`gate.digit.${d}`)).join(t('gate.wordSeparator'))}</p>}
          <div className="gate__entry" aria-live="polite" dir="ltr">
            {Array.from({ length: need }, (_, i) => (
              <span key={i} className="gate__slot">{entry[i] !== undefined ? (usePin ? '•' : fmt.n(Number(entry[i]))) : ''}</span>
            ))}
          </div>
          {message && <p className="gate__msg" role="status">{message}</p>}
          <NumberPad onDigit={onDigit} onBackspace={() => setEntry(entry.slice(0, -1))} onSubmit={() => entry.length === need && void submit(entry)} submitDisabled={entry.length !== need} />
        </>
      )}
      {onCancel && <Button variant="ghost" size="m" onClick={onCancel}>{t('common.cancel')}</Button>}
    </section>
  );
}
