import { useFmt, useT } from '../../app/hooks';
import type { TopicPictureProps } from '../../components/MathDisplay';
import type { Form } from '../../domain/math/types';

/*
 * Pictures for the advanced Worlds (decision 005). They are decorative for screen readers: every question's
 * accessible label already says what the picture shows. Colours come from tokens via classes in topics.css.
 */

const W = 320;

/** x of part i of `count` equal parts across `width`, starting at the reading side (right in RTL). */
function partX(i: number, count: number, width: number, rtl: boolean, x0 = 0): number {
  const cw = width / count;
  return x0 + (rtl ? width - (i + 1) * cw : i * cw);
}

function Bar({ parts, shaded, second = 0, crossed = 0, label, rtl, y = 0, h = 56 }: { parts: number; shaded: number; second?: number; crossed?: number; label?: (i: number) => string; rtl: boolean; y?: number; h?: number }) {
  const cw = W / parts;
  return (
    <g>
      {Array.from({ length: parts }, (_, i) => {
        const x = partX(i, parts, W, rtl);
        const cls = i < shaded ? 'tp-shade' : i < shaded + second ? 'tp-shade2' : 'tp-empty';
        const cross = crossed > 0 && i >= shaded - crossed && i < shaded;
        return (
          <g key={i}>
            <rect x={x} y={y} width={cw} height={h} className={`tp-cell ${cls}${cross ? ' tp-crossed' : ''}`} />
            {cross && <path d={`M${x + 6} ${y + 6}L${x + cw - 6} ${y + h - 6}M${x + cw - 6} ${y + 6}L${x + 6} ${y + h - 6}`} className="tp-cross" />}
            {label && <text x={x + cw / 2} y={y + h / 2 + 7} textAnchor="middle" className="tp-label">{label(i)}</text>}
          </g>
        );
      })}
      <rect x={0} y={y} width={W} height={h} className="tp-outline" />
    </g>
  );
}

function Pie({ parts, shaded, rtl }: { parts: number; shaded: number; rtl: boolean }) {
  const r = 90;
  const c = 100;
  const pt = (k: number) => {
    // Clockwise from 12 o'clock (anticlockwise in RTL), so shading starts at the reading side.
    const a = ((rtl ? -1 : 1) * 2 * Math.PI * k) / parts - Math.PI / 2;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  };
  return (
    <svg viewBox="0 0 200 200" className="tp-svg tp-svg--pie" aria-hidden="true" focusable="false">
      {Array.from({ length: parts }, (_, i) => {
        const [x1, y1] = pt(i);
        const [x2, y2] = pt(i + 1);
        return <path key={i} d={`M${c} ${c}L${x1} ${y1}A${r} ${r} 0 0 ${rtl ? 0 : 1} ${x2} ${y2}z`} className={`tp-cell ${i < shaded ? 'tp-shade' : 'tp-empty'}`} />;
      })}
      <circle cx={c} cy={c} r={r} className="tp-outline" />
    </svg>
  );
}

function Strips({ n, rtl }: { n: number; rtl: boolean }) {
  const strips = Math.ceil(n / 10);
  const h = 44;
  const gap = 14;
  return (
    <svg viewBox={`0 0 ${W} ${strips * (h + gap) - gap}`} className="tp-svg" aria-hidden="true" focusable="false">
      {Array.from({ length: strips }, (_, s) => (
        <Bar key={s} parts={10} shaded={Math.min(10, n - s * 10)} rtl={rtl} y={s * (h + gap)} h={h} />
      ))}
    </svg>
  );
}

function Hundred({ n, rtl }: { n: number; rtl: boolean }) {
  const cell = 22;
  return (
    <svg viewBox={`0 0 ${cell * 10} ${cell * 10}`} className="tp-svg tp-svg--square" aria-hidden="true" focusable="false">
      {Array.from({ length: 100 }, (_, i) => {
        // Fill column by column (tenths first), from the reading side.
        const col = Math.floor(i / 10);
        const row = i % 10;
        const x = rtl ? (9 - col) * cell : col * cell;
        return <rect key={i} x={x} y={row * cell} width={cell} height={cell} className={`tp-cell tp-cell--thin ${i < n ? 'tp-shade' : 'tp-empty'}`} />;
      })}
      <rect x={0} y={0} width={cell * 10} height={cell * 10} className="tp-outline" />
    </svg>
  );
}

/** `hint` stripes the rows; `counts` (worked example) also writes the running total on each row. */
function GridRect({ l, w, measure, hint, counts }: { l: number; w: number; measure: 'area' | 'perim'; hint: boolean; counts: boolean }) {
  const { n } = useFmt();
  const cell = Math.min(48, Math.floor(320 / Math.max(l, w)));
  const pad = 8;
  const width = l * cell;
  const height = w * cell;
  return (
    <svg viewBox={`${-pad} ${-pad} ${width + 2 * pad} ${height + 2 * pad}`} className={`tp-svg tp-grid tp-grid--${measure}`} style={{ maxInlineSize: `${Math.max(140, width + 2 * pad)}px` }} aria-hidden="true" focusable="false">
      {Array.from({ length: l * w }, (_, i) => {
        const col = i % l;
        const row = Math.floor(i / l);
        return (
          <g key={i}>
            <rect x={col * cell} y={row * cell} width={cell} height={cell} className={`tp-cell tp-cell--thin ${measure === 'area' ? (hint && row % 2 ? 'tp-shade2' : 'tp-shade') : 'tp-empty'}`} />
            {counts && measure === 'area' && col === 0 && cell >= 24 && <text x={cell / 2} y={row * cell + cell / 2 + 6} textAnchor="middle" className="tp-label tp-label--s">{n(l * (row + 1))}</text>}
          </g>
        );
      })}
      <rect x={0} y={0} width={width} height={height} className={measure === 'perim' ? 'tp-edge' : 'tp-outline'} />
    </svg>
  );
}

function SideRect({ l, w, unknownW, inner, showAnswer }: { l: number; w: number; unknownW: boolean; inner?: string; showAnswer: boolean }) {
  const t = useT();
  const { n } = useFmt();
  // Proportional rectangle inside a 300 × 170 box, never thinner than 44.
  const scale = Math.min(240 / l, 130 / w);
  const width = Math.max(60, l * scale);
  const height = Math.max(44, w * scale);
  const x0 = 40;
  const y0 = 12;
  const side = unknownW && !showAnswer ? '?' : n(w);
  return (
    <svg viewBox={`0 0 ${x0 + width + 70} ${y0 + height + 44}`} className="tp-svg tp-svg--rect" aria-hidden="true" focusable="false">
      <rect x={x0} y={y0} width={width} height={height} className="tp-cell tp-shade" />
      <rect x={x0} y={y0} width={width} height={height} className="tp-outline" />
      <text x={x0 + width / 2} y={y0 + height + 32} textAnchor="middle" className="tp-label">{t('math.unit.cmN', { n: n(l) })}</text>
      <text x={x0 + width + 10} y={y0 + height / 2 + 7} textAnchor="start" className={`tp-label${unknownW && !showAnswer ? ' tp-label--ask' : ''}`}>{t('math.unit.cmN', { n: side })}</text>
      {inner && <text x={x0 + width / 2} y={y0 + height / 2 + 7} textAnchor="middle" className="tp-label tp-label--s">{inner}</text>}
    </svg>
  );
}

function Picture({ form, showAnswer, hint }: { form: Form; showAnswer: boolean; hint: boolean }) {
  const t = useT();
  const fmt = useFmt();
  const { n } = fmt;
  const rtl = fmt.mathDirection === 'rtl';
  const helping = hint || showAnswer;
  switch (form.k) {
    case 'fracName':
      return form.shape === 'circle' ? (
        <Pie parts={form.d} shaded={form.n} rtl={rtl} />
      ) : (
        <svg viewBox={`0 0 ${W} 56`} className="tp-svg" aria-hidden="true" focusable="false"><Bar parts={form.d} shaded={form.n} rtl={rtl} /></svg>
      );
    case 'fracOf': {
      if (!helping) return null;
      const each = form.q / form.d;
      return (
        <svg viewBox={`0 0 ${W} 92`} className="tp-svg" aria-hidden="true" focusable="false">
          <text x={W / 2} y={22} textAnchor="middle" className="tp-label">{n(form.q)}</text>
          <Bar parts={form.d} shaded={form.n} rtl={rtl} y={34} label={showAnswer ? () => n(each) : undefined} />
        </svg>
      );
    }
    case 'fracEquiv': {
      if (!helping) return null;
      const [top, topShade, bottom, bottomShade] = form.simplify ? [form.d * form.m, form.n * form.m, form.d, form.n] : [form.d, form.n, form.d * form.m, form.n * form.m];
      return (
        <svg viewBox={`0 0 ${W} 112`} className="tp-svg" aria-hidden="true" focusable="false">
          <Bar parts={top} shaded={topShade} rtl={rtl} h={48} />
          <Bar parts={bottom} shaded={bottomShade} rtl={rtl} y={64} h={48} />
        </svg>
      );
    }
    case 'fracAdd':
      if (!helping) return null;
      return (
        <svg viewBox={`0 0 ${W} 56`} className="tp-svg" aria-hidden="true" focusable="false">
          {form.op === '+' ? <Bar parts={form.d} shaded={form.a} second={form.b} rtl={rtl} /> : <Bar parts={form.d} shaded={form.a} crossed={form.b} rtl={rtl} />}
        </svg>
      );
    case 'decFrac':
      return form.den === 10 ? <Strips n={form.n} rtl={rtl} /> : <Hundred n={form.n} rtl={rtl} />;
    case 'rect':
      return form.grid ? (
        <GridRect l={form.l} w={form.w} measure={form.measure} hint={helping} counts={showAnswer} />
      ) : (
        <SideRect l={form.l} w={form.w} unknownW={false} showAnswer={showAnswer} />
      );
    case 'side': {
      const inner = form.of === 'area' ? t('math.unit.areaIs', { n: n(form.l * form.w) }) : t('math.unit.perimIs', { n: n(2 * (form.l + form.w)) });
      return <SideRect l={form.l} w={form.w} unknownW inner={inner} showAnswer={showAnswer} />;
    }
  }
}

/** Fraction-of, equivalence and adding pictures would show the answer, so they appear only in hints and answers. */
function hasPicture(form: Form, helping: boolean): boolean {
  return helping || !(form.k === 'fracOf' || form.k === 'fracEquiv' || form.k === 'fracAdd');
}

export function TopicPicture({ item, showAnswer = false, hint = false, size = 'xl' }: TopicPictureProps) {
  if (!item.form || !hasPicture(item.form, hint || showAnswer)) return null;
  const pic = <Picture form={item.form} showAnswer={showAnswer} hint={hint} />;
  return <div className={`topic-picture topic-picture--${size} topic-picture--${item.form.k}`}>{pic}</div>;
}
