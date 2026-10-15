import type { Rng } from '../rng';
import { installTopics, type TopicImpl } from './topicRegistry';
import type { Form, Item, MathToken, TopicSpec, WorkedStep } from './types';

/*
 * Advanced Worlds for Stages 4–5 (decision 005): fractions, decimals, area & perimeter.
 * Every Item still has exactly one numeric answer, so answering, Stars, games and worksheets work unchanged.
 * Decimal values are always built as integer ÷ 10^k, which gives the same double as the written literal.
 */

const PLACES = 2; // the most decimal places any value here may have

/** Rounds to PLACES decimals so every value equals its written literal (0.1 + 0.2 → 0.3). */
export function norm(x: number): number {
  return Math.round(x * 10 ** PLACES) / 10 ** PLACES;
}

function decimalsOf(x: number): number {
  for (let k = 0; k <= PLACES; k++) if (Math.abs(Math.round(x * 10 ** k) - x * 10 ** k) < 1e-9) return k;
  return PLACES + 1;
}

const between = (rng: Rng, r: [number, number]) => rng.int(r[0], r[1]);

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

type Built = ReturnType<TopicImpl['build']>;

/** Form items keep operands[2] equal to the answer, so fixed lesson items read it like any equation. */
function fromForm(form: Form, answer: number, operation: Built['operation'], operands: Built['operands'], dp?: number): Built {
  return { operation, operands, blank: 'result', answer, form, ...(dp ? { dp } : {}) };
}

export function formAnswer(form: Form): number {
  switch (form.k) {
    case 'fracName':
      return form.n;
    case 'fracOf':
      return (form.q / form.d) * form.n;
    case 'fracEquiv':
      return form.simplify ? (form.ask === 'n' ? form.n : form.d) : form.ask === 'n' ? form.n * form.m : form.d * form.m;
    case 'fracAdd':
      return form.op === '+' ? form.a + form.b : form.a - form.b;
    case 'decFrac':
      return form.ask === 'dec' ? form.n / form.den : form.n;
    case 'rect':
      return form.measure === 'area' ? form.l * form.w : 2 * (form.l + form.w);
    case 'side':
      return form.w;
  }
}

function build(spec: TopicSpec, rng: Rng): Built {
  switch (spec.kind) {
    case 'fracName': {
      const d = between(rng, spec.d);
      const n = rng.int(1, d - 1);
      const form: Form = { k: 'fracName', n, d, shape: d <= 8 && rng.next() < 0.5 ? 'circle' : 'bar' };
      return fromForm(form, n, 'division', [n, d, n]);
    }
    case 'fracOf': {
      const d = Math.max(spec.nonUnit ? 3 : 2, between(rng, spec.d));
      const k = between(rng, spec.k);
      const n = spec.nonUnit ? rng.int(2, d - 1) : 1;
      const form: Form = { k: 'fracOf', n, d, q: d * k };
      return fromForm(form, n * k, 'multiplication', [d * k, d, n * k]);
    }
    case 'fracEquiv': {
      const d = between(rng, spec.d);
      const coprime = Array.from({ length: d - 1 }, (_, i) => i + 1).filter((n) => gcd(n, d) === 1);
      const n = rng.pick(coprime);
      const m = between(rng, spec.m);
      const form: Form = { k: 'fracEquiv', n, d, m, ask: rng.pick(spec.ask), simplify: spec.simplify };
      const answer = formAnswer(form);
      return fromForm(form, answer, spec.simplify ? 'division' : 'multiplication', [n, d, answer]);
    }
    case 'fracAdd': {
      const d = between(rng, spec.d);
      const op = rng.pick(spec.ops);
      let a: number;
      let b: number;
      if (op === '+') {
        a = rng.int(1, d - 1);
        b = rng.int(1, d - a);
      } else {
        a = rng.int(2, d);
        b = rng.int(1, a - 1);
      }
      const form: Form = { k: 'fracAdd', a, b, d, op };
      const answer = formAnswer(form);
      return fromForm(form, answer, op === '+' ? 'addition' : 'subtraction', [a, b, answer]);
    }
    case 'decFrac': {
      let n = between(rng, spec.n);
      // A whole number of tenths (20/10) or tenths written as hundredths (50/100) isn't what these Skills teach.
      if (n % 10 === 0) n = n + 1 <= spec.n[1] ? n + 1 : n - 1;
      const ask = rng.pick(spec.ask);
      const form: Form = { k: 'decFrac', n, den: spec.den, ask };
      const answer = formAnswer(form);
      // operands end with the answer, like every form: [n, den, n/den] or [n/den, den, n]
      const operands: Built['operands'] = ask === 'dec' ? [n, spec.den, answer] : [n / spec.den, spec.den, answer];
      return fromForm(form, answer, 'division', operands, ask === 'dec' ? (spec.den === 10 ? 1 : 2) : undefined);
    }
    case 'decAdd': {
      const op = rng.pick(spec.ops);
      let a = 0;
      let b = 0;
      for (let tries = 0; tries < 60; tries++) {
        a = between(rng, spec.a);
        b = between(rng, spec.b);
        if (op === '−' && b > a) [a, b] = [b, a];
        const wholeOnly = a % 10 === 0 && b % 10 === 0;
        const regroups = op === '+' ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10;
        if (!wholeOnly && a !== b && !(spec.noRegroup && regroups)) break;
      }
      const c = op === '+' ? a + b : a - b;
      return { operation: op === '+' ? 'addition' : 'subtraction', operands: [a / 10, b / 10, c / 10], blank: 'result', answer: c / 10, dp: 1 };
    }
    case 'decShift': {
      const f = rng.pick(spec.factors);
      const op = rng.pick(spec.ops);
      let x = between(rng, spec.a);
      if (x % 10 === 0) x += 1; // keep a digit that moves: 3.4 × 10 and 56 ÷ 10, not 30 × 10
      // × starts from tenths (3.4 × 10 = 34); ÷ starts from a whole number (56 ÷ 100 = 0.56), so ≤ 2 decimal places.
      const a = op === '×' ? x / 10 : x;
      const c = op === '×' ? (x * f) / 10 : x / f;
      return { operation: op === '×' ? 'multiplication' : 'division', operands: [a, f, c], blank: 'result', answer: c, dp: Math.max(1, decimalsOf(c), decimalsOf(a)) };
    }
    case 'rect': {
      const form: Form = { k: 'rect', measure: spec.measure, l: between(rng, spec.l), w: between(rng, spec.w), grid: spec.grid };
      const answer = formAnswer(form);
      return fromForm(form, answer, spec.measure === 'area' ? 'multiplication' : 'addition', [form.l, form.w, answer]);
    }
    case 'side': {
      const of = rng.pick(spec.of);
      const form: Form = { k: 'side', of, l: between(rng, spec.l), w: between(rng, spec.w) };
      const total = of === 'area' ? form.l * form.w : 2 * (form.l + form.w);
      return fromForm(form, form.w, of === 'area' ? 'division' : 'subtraction', [total, form.l, form.w]);
    }
  }
}

/* ---------------- Distractors ---------------- */

/** Likely mistakes for each kind of question (PRD §6.5 rule 6), most telling first. */
function mistakes(item: Item): number[] {
  const f = item.form;
  const ans = item.answer;
  if (!f) {
    const [a, b] = item.operands;
    if (item.operation === 'addition' || item.operation === 'subtraction') {
      // Tenths slips: off by a tenth or a whole, or the other operation.
      const other = item.operation === 'addition' ? Math.abs(a - b) : a + b;
      return [ans + 0.1, ans - 0.1, ans + 1, ans - 1, other, ans + 1.1, ans - 0.9];
    }
    // × or ÷ by 10/100: digits moved the wrong way or the wrong number of places.
    // Or adding / taking away the 10 instead of multiplying / dividing.
    const mul = item.operation === 'multiplication';
    return [ans * 10, ans / 10, a, ans * 100, ans / 100, b === 100 ? (mul ? a * 10 : a / 10) : a * 100, mul ? a + b : a - b];
  }
  switch (f.k) {
    case 'fracName':
      return [f.d - f.n, f.d, f.n + 1, f.n - 1, f.n + 2];
    case 'fracOf': {
      const each = f.q / f.d;
      // Unit fractions: the whole, the rest, the denominator, or double; otherwise one group, the whole, the rest.
      return f.n === 1 ? [f.q, f.q - ans, f.d, ans * 2, ans + 1] : [each, f.q, f.q - ans, ans + each, ans - each, f.d];
    }
    case 'fracEquiv': {
      const N = f.n * f.m;
      const D = f.d * f.m;
      if (!f.simplify && f.ask === 'n') return [f.n + (D - f.d), N + f.m, N - f.m, f.n, D - N];
      if (!f.simplify) return [f.d + (N - f.n), D + f.d, D - f.d, N + f.d, f.d * f.n];
      if (f.ask === 'n') return [N - (D - f.d), N, f.n + 1, f.n * 2, f.d - f.n];
      return [D - (N - f.n), D, f.d + 1, f.d * 2, f.d - f.n];
    }
    case 'fracAdd':
      return f.op === '+' ? [f.a * f.b, ans + 1, ans - 1, Math.abs(f.a - f.b), f.d] : [f.a + f.b, ans + 1, ans - 1, f.a, f.d - ans];
    case 'decFrac':
      if (f.ask === 'dec') return f.den === 10 ? [f.n / 100, f.n, ans + 0.1, ans - 0.1, f.n / 10 + 1] : [f.n / 10, f.n, ans + 0.1, ans - 0.01, ans + 0.01];
      return f.den === 10 ? [f.n * 10, f.n + 1, f.n - 1, 10 - f.n] : [f.n * 10, f.n + 10, f.n - 10, 100 - f.n, f.n + 1];
    case 'rect':
      return f.measure === 'area'
        ? [2 * (f.l + f.w), f.l + f.w, ans + f.l, ans - f.w, (f.l + 1) * f.w]
        : [f.l * f.w, f.l + f.w, 2 * f.l + f.w, f.l + 2 * f.w, ans + 2, ans - 2];
    case 'side': {
      const total = f.of === 'area' ? f.l * f.w : 2 * (f.l + f.w);
      return f.of === 'area' ? [total - f.l, ans + 1, ans - 1, f.l, total / 2] : [total - f.l, total / 2, ans + 1, ans - 1, total - 2 * f.l];
    }
  }
}

function distractors(item: Item, want: number, max: number, rng: Rng): number[] {
  const ans = item.answer;
  const step = item.dp ? 10 ** -Math.min(item.dp, decimalsOf(ans) || 1) : 1;
  const chosen: number[] = [];
  const tryAdd = (raw: number) => {
    if (chosen.length >= want || !Number.isFinite(raw) || decimalsOf(raw) > PLACES) return;
    const v = norm(raw);
    if (v < 0 || v > max) return;
    if (!item.dp && !Number.isInteger(v)) return;
    if (Math.abs(v - ans) < 1e-9 || chosen.includes(v)) return;
    chosen.push(v);
  };
  const list = mistakes(item);
  // The first mistake is the most telling; the rest are shuffled so choices don't always look alike.
  tryAdd(list[0] as number);
  for (const m of rng.shuffle(list.slice(1))) tryAdd(m);
  for (let spread = 1; chosen.length < want && spread < 500; spread++) for (const s of rng.shuffle([1, -1])) tryAdd(ans + s * spread * step);
  return chosen;
}

/* ---------------- Presentation ---------------- */

function tokens(item: Item, showAnswer: boolean, fill?: number): MathToken[] {
  const f = item.form as Form;
  const unknown = (v: number): number | null => (showAnswer ? v : fill ?? null);
  const numOrBlank = (v: number): MathToken => {
    const u = unknown(v);
    return u === null ? { t: 'blank' } : { t: 'num', v: u };
  };
  const word = (key: string): MathToken => ({ t: 'word', key: `math.word.${key}` });
  const ans = item.answer;
  switch (f.k) {
    case 'fracName':
      return [{ t: 'frac', n: unknown(f.n), d: f.d }];
    case 'fracOf':
      return [{ t: 'frac', n: f.n, d: f.d }, word('of'), { t: 'num', v: f.q }, { t: 'eq' }, numOrBlank(ans)];
    case 'fracEquiv': {
      const N = f.n * f.m;
      const D = f.d * f.m;
      if (!f.simplify) return [{ t: 'frac', n: f.n, d: f.d }, { t: 'eq' }, f.ask === 'n' ? { t: 'frac', n: unknown(N), d: D } : { t: 'frac', n: N, d: unknown(D) }];
      return [{ t: 'frac', n: N, d: D }, { t: 'eq' }, f.ask === 'n' ? { t: 'frac', n: unknown(f.n), d: f.d } : { t: 'frac', n: f.n, d: unknown(f.d) }];
    }
    case 'fracAdd':
      return [{ t: 'frac', n: f.a, d: f.d }, { t: 'op', v: f.op }, { t: 'frac', n: f.b, d: f.d }, { t: 'eq' }, { t: 'frac', n: unknown(ans), d: f.d }];
    case 'decFrac':
      return f.ask === 'dec'
        ? [{ t: 'frac', n: f.n, d: f.den }, { t: 'eq' }, numOrBlank(ans)]
        : [{ t: 'num', v: f.n / f.den }, { t: 'eq' }, { t: 'frac', n: unknown(ans), d: f.den }];
    case 'rect':
      if (f.measure === 'area')
        return f.grid
          ? [word('area'), { t: 'eq' }, numOrBlank(ans), word('squares')]
          : [word('area'), { t: 'num', v: f.l }, { t: 'op', v: '×' }, { t: 'num', v: f.w }, { t: 'eq' }, numOrBlank(ans), word('sqcm')];
      return [word('perimeter'), { t: 'eq' }, numOrBlank(ans), word(f.grid ? 'units' : 'cm')];
    case 'side':
      return [word('missingSide'), { t: 'eq' }, numOrBlank(ans), word('cm')];
  }
}

function spoken(item: Item): { key: string; values: Record<string, number> } {
  const f = item.form as Form;
  switch (f.k) {
    case 'fracName':
      return { key: 'math.form.fracName', values: { n: f.n, d: f.d } };
    case 'fracOf':
      return { key: 'math.form.fracOf', values: { n: f.n, d: f.d, q: f.q } };
    case 'fracEquiv': {
      const [n, d, N, D] = f.simplify ? [f.n * f.m, f.d * f.m, f.n, f.d] : [f.n, f.d, f.n * f.m, f.d * f.m];
      return { key: `math.form.fracEquiv.${f.ask}`, values: { n: n as number, d: d as number, N: N as number, D: D as number } };
    }
    case 'fracAdd':
      return { key: f.op === '+' ? 'math.form.fracAdd' : 'math.form.fracSub', values: { a: f.a, b: f.b, d: f.d } };
    case 'decFrac':
      return { key: `math.form.decFrac.${f.ask}`, values: { n: f.n, d: f.den, x: f.n / f.den } };
    case 'rect':
      return { key: `math.form.${f.measure}.${f.grid ? 'grid' : 'sides'}`, values: { l: f.l, w: f.w } };
    case 'side':
      return { key: `math.form.side.${f.of}`, values: { l: f.l, total: f.of === 'area' ? f.l * f.w : 2 * (f.l + f.w) } };
  }
}

function worked(item: Item): WorkedStep[] {
  const ans = item.answer;
  const steps: WorkedStep[] = [];
  const f = item.form;
  const [a, b, c] = item.operands;
  if (!f) {
    if (item.operation === 'addition' || item.operation === 'subtraction') {
      const [A, B, C] = [Math.round(a * 10), Math.round(b * 10), Math.round(c * 10)];
      steps.push({ key: 'math.wk.decAdd.tenths', values: { a, A, b, B } });
      steps.push({ key: item.operation === 'addition' ? 'math.wk.decAdd.add' : 'math.wk.decAdd.sub', values: { A, B, C } });
      steps.push({ key: 'math.wk.decAdd.back', values: { C, c }, value: c });
    } else {
      const places = b === 100 ? 2 : 1;
      steps.push({ key: item.operation === 'multiplication' ? 'math.wk.shift.mul' : 'math.wk.shift.div', values: { f: b, places } });
      steps.push({ key: item.operation === 'multiplication' ? 'math.wk.shift.mulResult' : 'math.wk.shift.divResult', values: { a, f: b, c }, value: c });
    }
  } else {
    switch (f.k) {
      case 'fracName':
        steps.push({ key: 'math.wk.fracName.parts', values: { d: f.d } });
        steps.push({ key: 'math.wk.fracName.shaded', values: { n: f.n, d: f.d }, value: f.n });
        break;
      case 'fracOf': {
        const each = f.q / f.d;
        steps.push({ key: 'math.wk.fracOf.split', values: { q: f.q, d: f.d, each }, value: each });
        if (f.n > 1) steps.push({ key: 'math.wk.fracOf.take', values: { n: f.n, each, ans }, value: ans });
        break;
      }
      case 'fracEquiv': {
        const N = f.n * f.m;
        const D = f.d * f.m;
        if (!f.simplify && f.ask === 'n') {
          steps.push({ key: 'math.wk.equiv.mulDen', values: { d: f.d, m: f.m, D } });
          steps.push({ key: 'math.wk.equiv.mulNum', values: { n: f.n, m: f.m, N }, value: N });
        } else if (!f.simplify) {
          steps.push({ key: 'math.wk.equiv.mulNum1', values: { n: f.n, m: f.m, N } });
          steps.push({ key: 'math.wk.equiv.mulDen2', values: { d: f.d, m: f.m, D }, value: D });
        } else if (f.ask === 'n') {
          steps.push({ key: 'math.wk.equiv.divDen', values: { D, d: f.d, m: f.m } });
          steps.push({ key: 'math.wk.equiv.divNum', values: { N, m: f.m, n: f.n }, value: f.n });
        } else {
          steps.push({ key: 'math.wk.equiv.divNum1', values: { N, n: f.n, m: f.m } });
          steps.push({ key: 'math.wk.equiv.divDen2', values: { D, m: f.m, d: f.d }, value: f.d });
        }
        break;
      }
      case 'fracAdd':
        steps.push({ key: 'math.wk.fracAdd.same', values: { d: f.d } });
        steps.push({ key: f.op === '+' ? 'math.wk.fracAdd.add' : 'math.wk.fracAdd.sub', values: { a: f.a, b: f.b, c: ans }, value: ans });
        break;
      case 'decFrac': {
        const name = f.den === 10 ? 'tenths' : 'hundredths';
        steps.push({ key: `math.wk.dec.${name}`, values: { n: f.n, x: f.n / f.den } });
        steps.push({ key: f.ask === 'dec' ? 'math.wk.dec.isDec' : 'math.wk.dec.isFrac', values: { n: f.n, d: f.den, x: f.n / f.den }, value: ans });
        break;
      }
      case 'rect':
        if (f.measure === 'area') {
          steps.push({ key: f.grid ? 'math.wk.area.rows' : 'math.wk.area.formula', values: { l: f.l, w: f.w } });
          steps.push({ key: 'math.wk.area.mul', values: { l: f.l, w: f.w, A: ans }, value: ans });
        } else {
          steps.push({ key: 'math.wk.perim.around', values: {} });
          steps.push({ key: 'math.wk.perim.add', values: { l: f.l, w: f.w, P: ans }, value: ans });
        }
        break;
      case 'side':
        if (f.of === 'area') {
          steps.push({ key: 'math.wk.side.area', values: { l: f.l, A: f.l * f.w } });
          steps.push({ key: 'math.wk.side.areaDiv', values: { A: f.l * f.w, l: f.l, w: f.w }, value: f.w });
        } else {
          const P = 2 * (f.l + f.w);
          steps.push({ key: 'math.wk.side.half', values: { P, h: P / 2 } });
          steps.push({ key: 'math.wk.side.halfSub', values: { h: P / 2, l: f.l, w: f.w }, value: f.w });
        }
        break;
    }
  }
  steps.push({ key: 'math.worked.answer', values: { answer: ans }, value: ans });
  return steps;
}

/* ---------------- Checks (tests and dev builds) ---------------- */

function violations(item: Item): string[] {
  const v: string[] = [];
  const f = item.form;
  if (!f) {
    const [a, b, c] = item.operands;
    const truth = item.operation === 'addition' ? a + b : item.operation === 'subtraction' ? a - b : item.operation === 'multiplication' ? a * b : a / b;
    if (Math.abs(norm(truth) - c) > 1e-9) v.push('P-03 equation is false');
    if (c !== item.answer) v.push('P-03 answer mismatch');
    if ((item.operation === 'multiplication' || item.operation === 'division') && b !== 10 && b !== 100) v.push('decShift factor must be 10 or 100');
    if (decimalsOf(c) > PLACES || decimalsOf(a) > PLACES) v.push('P-01 more than two decimal places');
    return v;
  }
  if (Math.abs(formAnswer(f) - item.answer) > 1e-9) v.push('P-03 answer mismatch');
  switch (f.k) {
    case 'fracName':
      if (f.n < 1 || f.n >= f.d) v.push('fracName needs 0 < n < d');
      break;
    case 'fracOf':
      if (f.q % f.d !== 0 || f.n >= f.d) v.push('fracOf needs a proper fraction of a multiple of d');
      break;
    case 'fracEquiv':
      if (f.m < 2 || f.n >= f.d) v.push('fracEquiv needs m ≥ 2 and a proper fraction');
      break;
    case 'fracAdd':
      if (item.answer < 1 || item.answer > f.d) v.push('fracAdd result must be between 1/d and 1');
      break;
    case 'decFrac':
      if (f.n % 10 === 0) v.push('decFrac n must not be a multiple of 10');
      break;
    case 'rect':
    case 'side':
      if (f.l < 1 || f.w < 1) v.push('sides must be at least 1');
      break;
  }
  return v;
}

export const topicsImplementation: TopicImpl = { build, distractors, tokens, spoken, worked, violations };
installTopics(topicsImplementation);
