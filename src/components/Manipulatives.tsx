import { useEffect, useMemo, useRef, useState } from 'react';
import { useFmt, useLocale, useT } from '../app/hooks';
import type { ManipulativeSpec } from '../services/content/schemas';
import { Button } from './Button';
import { MathNumber } from './MathDisplay';

/**
 * Manipulatives (DS §8.4). Every drag interaction has a tap / keyboard alternative ("select, then place"),
 * and each exposes a live text summary for screen readers.
 */
export interface ManipulativeProps {
  spec: ManipulativeSpec;
  /** 'explore' = learner builds it; 'final' = shows the solved state (Worked Example); 'start' = initial state (Hint 2). */
  mode?: 'explore' | 'final' | 'start';
  onDone?: () => void;
}

function Summary({ text }: { text: string }) {
  return (
    <p className="manip__summary" aria-live="polite">
      {text}
    </p>
  );
}

function Counter({ kind = 'a', faded, onClick, label }: { kind?: 'a' | 'b'; faded?: boolean; onClick?: () => void; label?: string }) {
  const cls = `counter counter--${kind}${faded ? ' counter--faded' : ''}`;
  if (onClick) return <button type="button" className={cls} onClick={onClick} aria-label={label} />;
  return <span className={cls} aria-hidden="true" />;
}

/* ---------- Counters ---------- */
function Counters({ spec, mode = 'explore', onDone }: ManipulativeProps) {
  const t = useT();
  const { n } = useFmt();
  const target = spec.op === 'subtraction' ? spec.b : spec.b;
  const [moved, setMoved] = useState(mode === 'final' ? target : 0);
  const done = moved >= target;
  useEffect(() => {
    if (done && mode === 'explore') onDone?.();
  }, [done, mode, onDone]);
  if (spec.op === 'subtraction') {
    const left = spec.a - moved;
    return (
      <div className="manip">
        <div className="manip__row counters-pile">
          {Array.from({ length: spec.a }, (_, i) => {
            const away = i >= spec.a - moved;
            const canTake = mode === 'explore' && !away && !done && i === spec.a - moved - 1;
            return <Counter key={i} faded={away} onClick={canTake ? () => setMoved(moved + 1) : undefined} label={canTake ? t('manip.counters.takeOne') : undefined} />;
          })}
        </div>
        {mode === 'explore' && !done && <Button variant="secondary" size="m" onClick={() => setMoved(moved + 1)}>{t('manip.counters.takeOne')}</Button>}
        <Summary text={t('manip.counters.subSummary', { a: n(spec.a), taken: n(moved), left: n(left) })} />
      </div>
    );
  }
  const total = spec.a + moved;
  return (
    <div className="manip">
      <div className="manip__row">
        <div className="counters-group" aria-label={t('manip.counters.together')} role="group">
          {Array.from({ length: spec.a }, (_, i) => <Counter key={`a${i}`} />)}
          {Array.from({ length: moved }, (_, i) => <Counter key={`m${i}`} kind="b" />)}
        </div>
        {spec.b - moved > 0 && (
          <div className="counters-group counters-group--waiting" role="group" aria-label={t('manip.counters.waiting')}>
            {Array.from({ length: spec.b - moved }, (_, i) => (
              <Counter key={`b${i}`} kind="b" onClick={mode === 'explore' ? () => setMoved(moved + 1) : undefined} label={mode === 'explore' ? t('manip.counters.moveOne') : undefined} />
            ))}
          </div>
        )}
      </div>
      {mode === 'explore' && !done && <Button variant="secondary" size="m" onClick={() => setMoved(spec.b)}>{t('manip.counters.putTogether')}</Button>}
      <Summary text={done ? t('manip.counters.addSummary', { a: n(spec.a), b: n(spec.b), total: n(total) }) : t('manip.counters.addStart', { a: n(spec.a), b: n(spec.b) })} />
    </div>
  );
}

/* ---------- Ten-frame ---------- */
function TenFrame({ spec, mode = 'explore', onDone }: ManipulativeProps) {
  const t = useT();
  const { n } = useFmt();
  const locale = useLocale();
  const isSub = spec.op === 'subtraction';
  const capacity = Math.max(10, Math.ceil(Math.max(spec.a, spec.a + (isSub ? 0 : spec.b)) / 10) * 10);
  const base = spec.a;
  const target = isSub ? base - spec.b : base + spec.b;
  const [filled, setFilled] = useState<boolean[]>(() =>
    Array.from({ length: capacity }, (_, i) => (mode === 'final' ? i < target : i < base)),
  );
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const count = filled.filter(Boolean).length;
  const done = count === target;
  useEffect(() => {
    if (done && mode === 'explore') onDone?.();
  }, [done, mode, onDone]);
  const toggle = (i: number) => {
    if (mode !== 'explore') return;
    const next = [...filled];
    if (!isSub && i < base) return; // the starting counters stay
    if (!next[i] && !isSub && count >= target) return;
    if (next[i] && isSub && count <= target) return;
    if (!next[i] && isSub) return;
    next[i] = !next[i];
    setFilled(next);
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const rtl = locale === 'ar';
    const map: Record<string, number> = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 5, ArrowUp: -5 };
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle(i);
      return;
    }
    const d = map[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const j = Math.min(capacity - 1, Math.max(0, i + d));
    setFocus(j);
    refs.current[j]?.focus();
  };
  const frames = Array.from({ length: capacity / 10 }, (_, f) => f);
  return (
    <div className="manip">
      <div className="manip__row">
        {frames.map((f) => (
          <div key={f} className="tenframe" role="grid" aria-label={t('manip.tenFrame.label')}>
            {Array.from({ length: 10 }, (_, k) => {
              const i = f * 10 + k;
              const kind = i < base ? 'a' : 'b';
              return (
                <button
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="button"
                  role="gridcell"
                  tabIndex={i === focus ? 0 : -1}
                  className={`tenframe__cell${filled[i] ? ` tenframe__cell--on tenframe__cell--${kind}` : ''}`}
                  aria-label={filled[i] ? t('manip.tenFrame.full') : t('manip.tenFrame.empty')}
                  aria-disabled={mode !== 'explore' || undefined}
                  onClick={() => {
                    setFocus(i);
                    toggle(i);
                  }}
                  onKeyDown={(e) => onKey(e, i)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <Summary text={t('manip.tenFrame.summary', { count: n(count), target: n(target) })} />
    </div>
  );
}

/* ---------- Number line ---------- */
export function NumberLineView({
  min, max, marker, start, step = 1, labelEvery = 1, onPick, candidates, hops,
}: {
  min: number; max: number; marker?: number; start?: number; step?: number; labelEvery?: number;
  onPick?: (v: number) => void; candidates?: number[]; hops?: Array<[number, number]>;
}) {
  const fmt = useFmt();
  const t = useT();
  const ticks = useMemo(() => {
    if (candidates) return [...new Set([min, max, ...candidates])].sort((x, y) => x - y);
    const out: number[] = [];
    for (let v = min; v <= max; v += step) out.push(v);
    return out;
  }, [min, max, step, candidates]);
  const pos = (v: number) => ((v - min) / Math.max(1, max - min)) * 100;
  return (
    <div className={`numline num-${fmt.numberStyle}`} dir={fmt.mathDirection}>
      <div className="numline__track" />
      {hops?.map(([from, to], i) => (
        <span key={i} className="numline__hop" style={{ insetInlineStart: `${pos(Math.min(from, to))}%`, inlineSize: `${Math.abs(pos(to) - pos(from))}%` }} aria-hidden="true" />
      ))}
      {ticks.map((v) => {
        const pickable = onPick && (!candidates || candidates.includes(v));
        const labelled = candidates ? true : (v - min) % (labelEvery * step) === 0 || v === marker || v === start;
        const content = (
          <>
            <span className="numline__mark" aria-hidden="true" />
            {labelled && <span className="numline__label"><MathNumber value={v} /></span>}
          </>
        );
        return pickable ? (
          <button
            key={v}
            type="button"
            className={`numline__tick numline__tick--pick${v === marker ? ' numline__tick--marker' : ''}`}
            style={{ insetInlineStart: `${pos(v)}%` }}
            onClick={() => onPick?.(v)}
            aria-label={t('manip.numberLine.tick', { value: fmt.n(v) })}
            aria-pressed={v === marker}
          >
            {content}
          </button>
        ) : (
          <span key={v} className={`numline__tick${v === marker ? ' numline__tick--marker' : ''}${v === start ? ' numline__tick--start' : ''}`} style={{ insetInlineStart: `${pos(v)}%` }}>
            {content}
          </span>
        );
      })}
      {marker !== undefined && <span className="numline__fanak" style={{ insetInlineStart: `${pos(marker)}%` }} aria-hidden="true">🦊</span>}
    </div>
  );
}

function NumberLineModel({ spec, mode = 'explore', onDone }: ManipulativeProps) {
  const t = useT();
  const fmt = useFmt();
  const locale = useLocale();
  const sign = spec.op === 'subtraction' ? -1 : 1;
  const target = spec.a + sign * spec.b;
  const [marker, setMarker] = useState(mode === 'final' ? target : spec.a);
  const done = marker === target;
  useEffect(() => {
    if (done && mode === 'explore') onDone?.();
  }, [done, mode, onDone]);
  const max = 20;
  const onKey = (e: React.KeyboardEvent) => {
    if (mode !== 'explore') return;
    // Arrow keys move along the line visually: in an rtl number line, the left arrow goes up.
    const visualLeftIsUp = fmt.mathDirection === 'rtl';
    let d = 0;
    if (e.key === 'ArrowRight') d = visualLeftIsUp ? -1 : 1;
    if (e.key === 'ArrowLeft') d = visualLeftIsUp ? 1 : -1;
    if (d === 0) return;
    e.preventDefault();
    setMarker((m) => Math.min(max, Math.max(0, m + d)));
  };
  void locale;
  return (
    <div className="manip">
      <div tabIndex={mode === 'explore' ? 0 : -1} onKeyDown={onKey} className="numline-focus" role="slider" aria-valuemin={0} aria-valuemax={max} aria-valuenow={marker} aria-valuetext={fmt.n(marker)} aria-label={t('manip.numberLine.label')}>
        <NumberLineView min={0} max={max} marker={marker} start={spec.a} onPick={mode === 'explore' ? setMarker : undefined} hops={marker !== spec.a ? [[spec.a, marker]] : undefined} />
      </div>
      {mode === 'explore' && !done && (
        <div className="manip__controls">
          <Button variant="secondary" size="m" onClick={() => setMarker((m) => Math.min(max, Math.max(0, m + sign)))}>{t(sign > 0 ? 'manip.numberLine.hopUp' : 'manip.numberLine.hopDown')}</Button>
        </div>
      )}
      <Summary text={t('manip.numberLine.summary', { start: fmt.n(spec.a), at: fmt.n(marker) })} />
    </div>
  );
}

/* ---------- Base-ten blocks ---------- */
function Blocks({ hundreds, tens, ones, kind = 'a' }: { hundreds: number; tens: number; ones: number; kind?: 'a' | 'b' }) {
  return (
    <div className={`blocks blocks--${kind}`} aria-hidden="true">
      {Array.from({ length: hundreds }, (_, i) => <span key={`h${i}`} className="block block--flat" />)}
      {Array.from({ length: tens }, (_, i) => <span key={`t${i}`} className="block block--rod" />)}
      <span className="blocks__ones">{Array.from({ length: ones }, (_, i) => <span key={`o${i}`} className="block block--unit" />)}</span>
    </div>
  );
}

const split = (x: number) => ({ hundreds: Math.floor(x / 100), tens: Math.floor((x % 100) / 10), ones: x % 10 });

function BaseTenBlocks({ spec, mode = 'explore', onDone }: ManipulativeProps) {
  const t = useT();
  const { n } = useFmt();
  const isSub = spec.op === 'subtraction';
  const a = split(spec.a);
  const b = split(spec.b);
  type Phase = 'start' | 'combined' | 'traded' | 'done';
  const [phase, setPhase] = useState<Phase>(mode === 'final' ? 'done' : 'start');
  const [pile, setPile] = useState(() => (mode === 'final' ? (isSub ? split(spec.a - spec.b) : split(spec.a + spec.b)) : a));
  useEffect(() => {
    if (phase === 'done' && mode === 'explore') onDone?.();
  }, [phase, mode, onDone]);
  const normalise = (p: { hundreds: number; tens: number; ones: number }) => p;

  if (isSub) {
    const needOnes = pile.ones < b.ones && phase === 'start';
    const needTens = !needOnes && pile.tens < b.tens && phase !== 'done';
    return (
      <div className="manip">
        <div className="manip__row"><Blocks {...pile} /></div>
        <div className="manip__controls">
          {mode === 'explore' && needOnes && (
            <Button variant="secondary" size="m" onClick={() => {
              if (pile.tens > 0) setPile({ ...pile, tens: pile.tens - 1, ones: pile.ones + 10 });
              else setPile({ hundreds: pile.hundreds - 1, tens: 9, ones: pile.ones + 10 });
            }}>{t('manip.blocks.tradeTen')}</Button>
          )}
          {mode === 'explore' && needTens && (
            <Button variant="secondary" size="m" onClick={() => setPile({ ...pile, hundreds: pile.hundreds - 1, tens: pile.tens + 10 })}>{t('manip.blocks.tradeHundred')}</Button>
          )}
          {mode === 'explore' && !needOnes && !needTens && phase !== 'done' && (
            <Button variant="secondary" size="m" onClick={() => {
              setPile(normalise({ hundreds: pile.hundreds - b.hundreds, tens: pile.tens - b.tens, ones: pile.ones - b.ones }));
              setPhase('done');
            }}>{t('manip.blocks.takeAway', { b: n(spec.b) })}</Button>
          )}
        </div>
        <Summary text={t('manip.blocks.summary', { h: n(pile.hundreds), t: n(pile.tens), o: n(pile.ones) })} />
      </div>
    );
  }

  const combined = { hundreds: a.hundreds + b.hundreds, tens: a.tens + b.tens, ones: a.ones + b.ones };
  return (
    <div className="manip">
      <div className="manip__row">
        {phase === 'start' ? (
          <>
            <Blocks {...a} />
            <span className="manip__op" aria-hidden="true">+</span>
            <Blocks {...b} kind="b" />
          </>
        ) : (
          <Blocks {...pile} />
        )}
      </div>
      <div className="manip__controls">
        {mode === 'explore' && phase === 'start' && (
          <Button variant="secondary" size="m" onClick={() => { setPile(combined); setPhase(combined.ones >= 10 || combined.tens >= 10 ? 'combined' : 'done'); }}>
            {t('manip.blocks.putTogether')}
          </Button>
        )}
        {mode === 'explore' && phase === 'combined' && pile.ones >= 10 && (
          <Button variant="secondary" size="m" onClick={() => { const next = { ...pile, tens: pile.tens + 1, ones: pile.ones - 10 }; setPile(next); if (next.tens < 10) setPhase('done'); }}>
            {t('manip.blocks.tradeOnes')}
          </Button>
        )}
        {mode === 'explore' && phase === 'combined' && pile.ones < 10 && pile.tens >= 10 && (
          <Button variant="secondary" size="m" onClick={() => { setPile({ ...pile, hundreds: pile.hundreds + 1, tens: pile.tens - 10 }); setPhase('done'); }}>
            {t('manip.blocks.tradeTens')}
          </Button>
        )}
      </div>
      <Summary text={t('manip.blocks.summary', { h: n(pile.hundreds), t: n(pile.tens), o: n(pile.ones) })} />
    </div>
  );
}

/* ---------- Array grid ---------- */
function ArrayGrid({ spec, mode = 'explore', onDone }: ManipulativeProps) {
  const t = useT();
  const { n } = useFmt();
  const [rows, setRows] = useState(mode === 'final' ? spec.a : mode === 'start' ? spec.a : 1);
  const [cols, setCols] = useState(mode === 'final' ? spec.b : mode === 'start' ? spec.b : 1);
  const [rotated, setRotated] = useState(false);
  const done = (rows === spec.a && cols === spec.b) || (rows === spec.b && cols === spec.a);
  useEffect(() => {
    if (done && mode === 'explore') onDone?.();
  }, [done, mode, onDone]);
  const r = rotated ? cols : rows;
  const c = rotated ? rows : cols;
  return (
    <div className="manip">
      <div className="array" style={{ gridTemplateColumns: `repeat(${Math.max(1, c)}, auto)` }} aria-hidden="true">
        {Array.from({ length: r * c }, (_, i) => <span key={i} className="counter counter--a" />)}
      </div>
      {mode === 'explore' && (
        <div className="manip__controls">
          <Button variant="secondary" size="m" disabled={rows >= 10} onClick={() => setRows(rows + 1)}>{t('manip.array.addRow')}</Button>
          <Button variant="secondary" size="m" disabled={cols >= 10} onClick={() => setCols(cols + 1)}>{t('manip.array.addColumn')}</Button>
          <Button variant="secondary" size="m" disabled={rows <= 1} onClick={() => setRows(rows - 1)}>{t('manip.array.removeRow')}</Button>
          <Button variant="secondary" size="m" disabled={cols <= 1} onClick={() => setCols(cols - 1)}>{t('manip.array.removeColumn')}</Button>
          <Button variant="secondary" size="m" leadingIcon="rotate" onClick={() => setRotated(!rotated)}>{t('manip.array.rotate')}</Button>
        </div>
      )}
      <Summary text={t('manip.array.summary', { rows: n(r), cols: n(c), total: n(r * c) })} />
    </div>
  );
}

/* ---------- Sharing plates ---------- */
function SharingPlates({ spec, mode = 'explore', onDone }: ManipulativeProps) {
  const t = useT();
  const { n } = useFmt();
  const plates = Math.max(1, spec.b);
  const [onPlates, setOnPlates] = useState<number[]>(() => Array.from({ length: plates }, () => (mode === 'final' ? spec.a / plates : 0)));
  const [selected, setSelected] = useState(false);
  const placed = onPlates.reduce((s, x) => s + x, 0);
  const left = spec.a - placed;
  const done = left === 0;
  useEffect(() => {
    if (done && mode === 'explore') onDone?.();
  }, [done, mode, onDone]);
  const place = (p: number) => {
    if (!selected || left <= 0) return;
    setOnPlates(onPlates.map((x, i) => (i === p ? x + 1 : x)));
    setSelected(false);
  };
  const deal = () => {
    if (left <= 0) return;
    const give = Math.min(plates, left);
    setOnPlates(onPlates.map((x, i) => (i < give ? x + 1 : x)));
    setSelected(false);
  };
  return (
    <div className="manip">
      <div className="manip__row">
        <button
          type="button"
          className={`plates-pile${selected ? ' plates-pile--selected' : ''}`}
          disabled={mode !== 'explore' || left === 0}
          aria-pressed={selected}
          aria-label={t('manip.plates.pick', { left: n(left) })}
          onClick={() => setSelected(!selected)}
        >
          {Array.from({ length: left }, (_, i) => <span key={i} className="counter counter--b" aria-hidden="true" />)}
        </button>
      </div>
      <div className="manip__row plates">
        {onPlates.map((x, i) => (
          <button key={i} type="button" className="plate" disabled={mode !== 'explore' || !selected} onClick={() => place(i)} aria-label={t('manip.plates.plate', { index: n(i + 1), count: n(x) })}>
            {Array.from({ length: x }, (_, k) => <span key={k} className="counter counter--b" aria-hidden="true" />)}
          </button>
        ))}
      </div>
      {mode === 'explore' && !done && <Button variant="secondary" size="m" onClick={deal}>{t('manip.plates.deal')}</Button>}
      <Summary text={done ? t('manip.plates.summaryDone', { a: n(spec.a), b: n(plates), each: n(spec.a / plates) }) : t('manip.plates.summary', { left: n(left) })} />
    </div>
  );
}

/* ---------- Equal groups ---------- */
function Groups({ spec, mode = 'explore', onDone }: ManipulativeProps) {
  const t = useT();
  const { n } = useFmt();
  const isDiv = spec.op === 'division';
  const size = isDiv ? Math.max(1, spec.b) : spec.b;
  const totalGroups = isDiv ? spec.a / size : spec.a;
  const [groups, setGroups] = useState(mode === 'final' ? totalGroups : 0);
  const done = groups >= totalGroups;
  useEffect(() => {
    if (done && mode === 'explore') onDone?.();
  }, [done, mode, onDone]);
  const loose = isDiv ? spec.a - groups * size : 0;
  return (
    <div className="manip">
      <div className="manip__row groups">
        {Array.from({ length: groups }, (_, g) => (
          <div key={g} className="group-ring" aria-hidden="true">
            {Array.from({ length: size }, (_, i) => <span key={i} className="counter counter--a" />)}
          </div>
        ))}
        {loose > 0 && <div className="group-loose" aria-hidden="true">{Array.from({ length: loose }, (_, i) => <span key={i} className="counter counter--b" />)}</div>}
      </div>
      {mode === 'explore' && !done && (
        <Button variant="secondary" size="m" onClick={() => setGroups(groups + 1)}>{t(isDiv ? 'manip.groups.makeGroup' : 'manip.groups.addGroup', { size: n(size) })}</Button>
      )}
      <Summary text={t(isDiv ? 'manip.groups.divSummary' : 'manip.groups.mulSummary', { groups: n(groups), size: n(size), total: n(groups * size), left: n(loose) })} />
    </div>
  );
}

export function Manipulative(props: ManipulativeProps) {
  switch (props.spec.kind) {
    case 'counters':
      return <Counters {...props} />;
    case 'tenFrame':
      return <TenFrame {...props} />;
    case 'numberLine':
      return <NumberLineModel {...props} />;
    case 'baseTen':
      return <BaseTenBlocks {...props} />;
    case 'array':
      return <ArrayGrid {...props} />;
    case 'plates':
      return <SharingPlates {...props} />;
    case 'groups':
      return <Groups {...props} />;
    default: {
      const never: never = props.spec.kind;
      return never;
    }
  }
}

/** Whether a model can visualise these numbers clearly (used for hints / worked examples). */
export function modelFits(spec: ManipulativeSpec): boolean {
  switch (spec.kind) {
    case 'counters':
      return spec.a <= 10 && spec.b <= 10;
    case 'tenFrame':
      return spec.a + spec.b <= 20 && spec.a <= 20;
    case 'numberLine':
      return spec.a <= 20 && spec.a + (spec.op === 'subtraction' ? 0 : spec.b) <= 20;
    case 'baseTen':
      return spec.a <= 999 && spec.b <= 999;
    case 'array':
      return spec.a >= 1 && spec.b >= 1 && spec.a <= 10 && spec.b <= 10;
    case 'plates':
      return spec.b >= 1 && spec.a <= 30 && spec.a % spec.b === 0;
    case 'groups':
      return spec.op === 'division' ? spec.b >= 1 && spec.a <= 50 && spec.a % spec.b === 0 : spec.a <= 10 && spec.b <= 10;
  }
}
