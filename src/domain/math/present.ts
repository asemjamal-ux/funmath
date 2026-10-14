import { digitAt, digitsOf } from './digits';
import { OPERATOR_OF, type Item, type MathToken, type WorkedStep } from './types';

/** Token list for MathExpression (ARCH §9.5): a ∘ b = c with the unknown as a blank. */
export function expressionTokens(item: Item, showAnswer = false): MathToken[] {
  const [a, b, c] = item.operands;
  const num = (v: number, isBlank: boolean): MathToken => (isBlank && !showAnswer ? { t: 'blank' } : { t: 'num', v });
  return [
    num(a, item.blank === 'a'),
    { t: 'op', v: OPERATOR_OF[item.operation] },
    num(b, item.blank === 'b'),
    { t: 'eq' },
    num(c, item.blank === 'result'),
  ];
}

const OP_KEY = { addition: 'add', subtraction: 'sub', multiplication: 'mul', division: 'div' } as const;

/** ICU message key + numeric values for the accessible spoken label (AX-03). */
export function spokenLabel(item: Item): { key: string; values: { a: number; b: number; c: number } } {
  const [a, b, c] = item.operands;
  return { key: `math.spoken.${OP_KEY[item.operation]}.${item.blank}`, values: { a, b, c } };
}

/** Step-by-step solution; the last step's value always equals item.answer (P-11). */
export function workedExample(item: Item): WorkedStep[] {
  const [a, b, c] = item.operands;
  const steps: WorkedStep[] = [];
  if (item.blank !== 'result') {
    if (item.operation === 'addition') {
      const known = item.blank === 'a' ? b : a;
      steps.push({ key: 'math.worked.missingAdd', values: { known, total: c } });
      steps.push({ key: 'math.worked.thinkSub', values: { total: c, known, part: item.answer }, value: item.answer });
    } else if (item.operation === 'subtraction') {
      steps.push({ key: 'math.worked.missingSub', values: { whole: a, left: c } });
      steps.push({ key: 'math.worked.thinkSub', values: { total: a, known: c, part: item.answer }, value: item.answer });
    } else if (item.operation === 'multiplication') {
      const known = item.blank === 'a' ? b : a;
      steps.push({ key: 'math.worked.missingMul', values: { known, product: c } });
      steps.push({ key: 'math.worked.thinkDiv', values: { product: c, known, factor: item.answer }, value: item.answer });
    } else {
      steps.push({ key: 'math.worked.missingDivisor', values: { dividend: a, quotient: c } });
      steps.push({ key: 'math.worked.thinkMul', values: { quotient: c, divisor: item.answer, dividend: a }, value: item.answer });
    }
    steps.push({ key: 'math.worked.answer', values: { answer: item.answer }, value: item.answer });
    return steps;
  }

  switch (item.operation) {
    case 'addition': {
      if (c <= 20 && a < 20 && b < 20) {
        steps.push({ key: 'math.worked.addStart', values: { a } });
        const toTen = 10 - (a % 10);
        if (a < 10 && a + b > 10 && toTen > 0) {
          steps.push({ key: 'math.worked.makeTen', values: { a, toTen, ten: 10 }, value: 10 });
          steps.push({ key: 'math.worked.addRest', values: { rest: b - toTen, ten: 10, sum: c }, value: c });
        } else {
          steps.push({ key: 'math.worked.countOn', values: { a, b, sum: c }, sequence: range(a + 1, c), value: c });
        }
      } else {
        columnSteps(a, b, 'add', steps);
      }
      break;
    }
    case 'subtraction': {
      if (a <= 20) {
        steps.push({ key: 'math.worked.subStart', values: { a } });
        const back = a % 10;
        if (a > 10 && b > back && back > 0) {
          steps.push({ key: 'math.worked.backToTen', values: { back, ten: a - back }, value: a - back });
          steps.push({ key: 'math.worked.subRest', values: { rest: b - back, ten: a - back, diff: c }, value: c });
        } else {
          steps.push({ key: 'math.worked.countBack', values: { a, b, diff: c }, sequence: range(c, a - 1).reverse(), value: c });
        }
      } else {
        columnSteps(a, b, 'sub', steps);
      }
      break;
    }
    case 'multiplication': {
      steps.push({ key: 'math.worked.groupsOf', values: { a, b } });
      if (a === 0 || b === 0) steps.push({ key: 'math.worked.zeroRule', values: { a, b }, value: 0 });
      else steps.push({ key: 'math.worked.skipCount', values: { b, a, product: c }, sequence: Array.from({ length: a }, (_, i) => (i + 1) * b), value: c });
      break;
    }
    case 'division': {
      steps.push({ key: 'math.worked.shareInto', values: { a, b } });
      steps.push({ key: 'math.worked.thinkMul', values: { quotient: c, divisor: b, dividend: a }, value: c });
      break;
    }
  }
  steps.push({ key: 'math.worked.answer', values: { answer: item.answer }, value: item.answer });
  return steps;
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

const PLACE_KEYS = ['ones', 'tens', 'hundreds', 'thousands'] as const;

function columnSteps(a: number, b: number, op: 'add' | 'sub', steps: WorkedStep[]): void {
  const places = Math.max(digitsOf(a).length, digitsOf(b).length);
  let carry = 0;
  for (let p = 0; p < places; p++) {
    const x = digitAt(a, p);
    const y = digitAt(b, p);
    const place = PLACE_KEYS[p] ?? 'thousands';
    if (op === 'add') {
      const s = x + y + carry;
      steps.push({
        key: s >= 10 ? `math.worked.col.addCarry.${place}` : `math.worked.col.add.${place}`,
        values: { x, y, carry, sum: s, digit: s % 10 },
        value: s % 10,
      });
      carry = s >= 10 ? 1 : 0;
    } else {
      let top = x - carry;
      if (top < y) {
        steps.push({ key: `math.worked.col.borrow.${place}`, values: { x: top, top: top + 10, y, diff: top + 10 - y }, value: top + 10 - y });
        carry = 1;
        top += 10;
      } else {
        steps.push({ key: `math.worked.col.sub.${place}`, values: { x: top, y, diff: top - y }, value: top - y });
        carry = 0;
      }
    }
  }
  if (op === 'add' && carry) steps.push({ key: 'math.worked.col.carryOut', values: { carry: 1 }, value: 1 });
}
