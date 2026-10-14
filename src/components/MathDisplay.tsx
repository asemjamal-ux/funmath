import { useFmt, useT } from '../app/hooks';
import { digitAt, digitsOf } from '../domain/math/digits';
import { expressionTokens, spokenLabel } from '../domain/math/present';
import type { Item, MathToken, OperatorSymbol } from '../domain/math/types';
import { OPERATOR_OF } from '../domain/math/types';

/** One number via the formatting service, bidi-isolated so digits keep their order (ARCH §9.5). */
export function MathNumber({ value, className }: { value: number; className?: string }) {
  const fmt = useFmt();
  return (
    <bdi dir="ltr" className={`math-number num-${fmt.numberStyle}${className ? ` ${className}` : ''}`}>
      {fmt.n(value)}
    </bdi>
  );
}

export interface MathExpressionProps {
  tokens: MathToken[];
  label: string;
  size?: 'xl' | 'l' | 'm';
  blankContent?: React.ReactNode;
}

/** Token-based equation; container dir = Math Direction, independent of UI dir. */
export function MathExpression({ tokens, label, size = 'xl', blankContent }: MathExpressionProps) {
  const fmt = useFmt();
  return (
    <div className={`math-expr math-expr--${size} num-${fmt.numberStyle}`} dir={fmt.mathDirection} role="math" aria-label={label}>
      {tokens.map((tok, i) => {
        switch (tok.t) {
          case 'num':
            return <span key={i} aria-hidden="true" className="math-expr__num"><MathNumber value={tok.v} /></span>;
          case 'op':
            return <span key={i} aria-hidden="true" className="math-expr__op">{tok.v}</span>;
          case 'eq':
            return <span key={i} aria-hidden="true" className="math-expr__op">=</span>;
          case 'blank':
            return <span key={i} aria-hidden="true" className="math-expr__blank">{blankContent ?? '?'}</span>;
          default: {
            const never: never = tok;
            return never;
          }
        }
      })}
    </div>
  );
}

/** Spoken label for an item, built from an ICU message with formatted numbers (AX-03). */
export function useSpoken() {
  const t = useT();
  const { n } = useFmt();
  return (item: Item) => {
    const { key, values } = spokenLabel(item);
    return t(key, { a: n(values.a), b: n(values.b), c: n(values.c) });
  };
}

export function ItemExpression({ item, size = 'xl', showAnswer = false, blankContent }: { item: Item; size?: 'xl' | 'l' | 'm'; showAnswer?: boolean; blankContent?: React.ReactNode }) {
  const spoken = useSpoken();
  return <MathExpression tokens={expressionTokens(item, showAnswer)} label={spoken(item)} size={size} blankContent={blankContent} />;
}

export interface VerticalProblemProps {
  a: number;
  b: number;
  op: OperatorSymbol;
  label: string;
  /** Digits entered so far, indexed by place (0 = ones). */
  entry?: (number | null)[];
  columns?: number;
  focusPlace?: number;
  onFocusPlace?: (place: number) => void;
  showPlaceHeaders?: boolean;
  answer?: number;
}

const PLACE_KEYS = ['math.place.ones', 'math.place.tens', 'math.place.hundreds', 'math.place.thousands'];

/** Column layout aligned by place value; operator side follows Math Direction (ARCH §9.5). */
export function VerticalProblem({ a, b, op, label, entry, columns, focusPlace, onFocusPlace, showPlaceHeaders = true, answer }: VerticalProblemProps) {
  const fmt = useFmt();
  const t = useT();
  const cols = columns ?? Math.max(digitsOf(a).length, digitsOf(b).length) + (op === '+' ? 1 : 0);
  const places = Array.from({ length: cols }, (_, i) => cols - 1 - i); // most significant first (visual left)
  const digit = (n: number, p: number) => (p < digitsOf(n).length ? fmt.n(digitAt(n, p)) : '');
  const opCell = <div className="vp__op" aria-hidden="true">{op}</div>;
  const spacer = <div className="vp__op" aria-hidden="true" />;
  const opStart = fmt.mathDirection === 'ltr';
  return (
    <div className={`vp num-${fmt.numberStyle}`} role="group" aria-label={label}>
      {/* Digits are always laid out with ones on the right, in every locale. */}
      <div className="vp__grid" dir="ltr" style={{ gridTemplateColumns: `repeat(${cols + 1}, auto)` }}>
        {showPlaceHeaders && (
          <>
            {opStart && spacer}
            {places.map((p) => (
              <div key={`h${p}`} className="vp__head">{t(PLACE_KEYS[p] ?? PLACE_KEYS[3]!)}</div>
            ))}
            {!opStart && spacer}
          </>
        )}
        {opStart && spacer}
        {places.map((p) => <div key={`a${p}`} className="vp__digit" aria-hidden="true">{digit(a, p)}</div>)}
        {!opStart && spacer}
        {opStart && opCell}
        {places.map((p) => <div key={`b${p}`} className="vp__digit" aria-hidden="true">{digit(b, p)}</div>)}
        {!opStart && opCell}
        <div className="vp__rule" style={{ gridColumn: `1 / span ${cols + 1}` }} />
        {opStart && spacer}
        {places.map((p) =>
          answer !== undefined ? (
            <div key={`r${p}`} className="vp__digit vp__digit--answer" aria-hidden="true">{digit(answer, p)}</div>
          ) : entry ? (
            <button
              key={`e${p}`}
              type="button"
              className={`vp__cell${focusPlace === p ? ' vp__cell--focus' : ''}`}
              aria-label={t('math.column.cell', { place: t(PLACE_KEYS[p] ?? PLACE_KEYS[3]!), value: entry[p] == null ? t('math.column.empty') : fmt.n(entry[p] as number) })}
              aria-current={focusPlace === p ? 'true' : undefined}
              onClick={() => onFocusPlace?.(p)}
            >
              {entry[p] == null ? '' : fmt.n(entry[p] as number)}
            </button>
          ) : (
            <div key={`r${p}`} className="vp__digit" />
          ),
        )}
        {!opStart && spacer}
      </div>
    </div>
  );
}

export function operatorFor(item: Item): OperatorSymbol {
  return OPERATOR_OF[item.operation];
}
