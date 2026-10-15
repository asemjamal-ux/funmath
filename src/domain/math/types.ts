/** The arithmetic in an equation (an Item's operation). */
export type Arith = 'addition' | 'subtraction' | 'multiplication' | 'division';
/** Advanced Worlds for Stages 4–5 (decision 005). */
export type Topic = 'fractions' | 'decimals' | 'geometry';
/** A World: one per arithmetic operation plus the advanced topics. A Skill's `operation` names its World. */
export type Operation = Arith | Topic;
export type OperatorSymbol = '+' | '−' | '×' | '÷';
export type SkillId = `${'ADD' | 'SUB' | 'MUL' | 'DIV' | 'FRA' | 'DEC' | 'GEO'}-${string}`;
export type Tier = 1 | 2 | 3;
export type Stage = 1 | 2 | 3 | 4 | 5;
export type ItemFormat = 'choice' | 'entry' | 'column';
/** Position of the unknown: operand a, operand b, or the result. */
export type Blank = 'a' | 'b' | 'result';
/** `form`: the Item's own picture (fraction shapes, decimal grids, rectangles) is the model (decision 005). */
export type ModelKind = 'counters' | 'tenFrame' | 'numberLine' | 'baseTen' | 'array' | 'plates' | 'groups' | 'form';
export type GameId = 'bubble-pop' | 'number-line-hop' | 'match-pairs' | 'bingo' | 'number-hunt' | 'true-false';

export type Constraint =
  | 'none'
  | 'noBridgeTen'
  | 'bridgeTen'
  | 'noRegroup'
  | 'regroupOnes'
  | 'regroupExactlyOne'
  | 'regroupAtLeastOne';

export type TierSpec =
  | {
      kind: 'add';
      a: [number, number];
      b: [number, number];
      sumMin?: number;
      sumMax: number;
      sumExact?: number;
      bMultipleOf?: number;
      constraint?: Constraint;
      blank: Blank[];
    }
  | {
      kind: 'sub';
      a: [number, number];
      b: [number, number];
      bMultipleOf?: number;
      constraint?: Constraint;
      /** Share of items forced to regroup across a zero tens digit (P-04, SUB-07 Tier 3). */
      acrossZeroShare?: number;
      blank: Blank[];
    }
  | { kind: 'family'; c: [number, number]; forms: Array<'add_b' | 'add_a' | 'sub_b'> }
  | { kind: 'mul'; keys: number[]; other: [number, number]; order: 'keyFirst' | 'mixed'; blank: Blank[] }
  | { kind: 'div'; divisors: number[]; quotient: [number, number]; dividendMax?: number; blank: Blank[] }
  | TopicSpec;

/** Generators for the advanced Worlds (decision 005); ranges are inclusive. */
export type TopicSpec =
  /** A shape cut into d equal parts, some shaded: ? / d. */
  | { kind: 'fracName'; d: [number, number] }
  /** n/d of q, with q a multiple of d (q = d × k). Unit fractions only unless `nonUnit`. */
  | { kind: 'fracOf'; d: [number, number]; k: [number, number]; nonUnit: boolean }
  /** n/d = ?/(d·m) (or the denominator); `simplify` asks the other way round. */
  | { kind: 'fracEquiv'; d: [number, number]; m: [number, number]; ask: Array<'n' | 'd'>; simplify: boolean }
  /** a/d ± b/d = ?/d with a proper (or whole) result. */
  | { kind: 'fracAdd'; d: [number, number]; ops: Array<'+' | '−'> }
  /** Tenths / hundredths: n/den as a decimal, or a decimal as ?/den. */
  | { kind: 'decFrac'; den: 10 | 100; n: [number, number]; ask: Array<'dec' | 'frac'> }
  /** Decimal + / − with one decimal place; a, b in tenths. `noRegroup` keeps tenths from carrying/borrowing. */
  | { kind: 'decAdd'; a: [number, number]; b: [number, number]; ops: Array<'+' | '−'>; noRegroup?: boolean }
  /** × or ÷ by 10 / 100: × takes a in tenths (34 → 3.4), ÷ takes a as a whole number. */
  | { kind: 'decShift'; a: [number, number]; factors: Array<10 | 100>; ops: Array<'×' | '÷'> }
  /** Area or perimeter of an l × w rectangle, on a square grid or with labelled sides. */
  | { kind: 'rect'; measure: 'area' | 'perim'; l: [number, number]; w: [number, number]; grid: boolean }
  /** A missing side from the area or perimeter and one side. */
  | { kind: 'side'; of: Array<'area' | 'perim'>; l: [number, number]; w: [number, number] };

/** What an advanced Item shows (decision 005). Every answer is still a single number. */
export type Form =
  | { k: 'fracName'; n: number; d: number; shape: 'bar' | 'circle' }
  | { k: 'fracOf'; n: number; d: number; q: number }
  | { k: 'fracEquiv'; n: number; d: number; m: number; ask: 'n' | 'd'; simplify: boolean }
  | { k: 'fracAdd'; a: number; b: number; d: number; op: '+' | '−' }
  | { k: 'decFrac'; n: number; den: 10 | 100; ask: 'dec' | 'frac' }
  | { k: 'rect'; measure: 'area' | 'perim'; l: number; w: number; grid: boolean }
  | { k: 'side'; of: 'area' | 'perim'; l: number; w: number };

export interface GeneratorSpec {
  /** Hard catalogue limit for every operand, answer and choice (PRD §6.2, §6.5 rule 8). */
  valueMax: number;
  tiers: Record<'1' | '2' | '3', TierSpec>;
}

export interface Skill {
  id: SkillId;
  operation: Operation;
  stage: Stage;
  order: number;
  prerequisites: SkillId[];
  scope: 'mvp' | 'future';
  titleKey: string;
  generator: GeneratorSpec;
  formats: Record<'1' | '2' | '3', ItemFormat>;
  model: ModelKind;
  lessonId: string;
  games: GameId[];
}

export interface Item {
  skillId: SkillId;
  tier: Tier;
  format: ItemFormat;
  operation: Arith;
  /** [a, b, result] — the full true equation a ∘ b = result. */
  operands: [number, number, number];
  blank: Blank;
  answer: number;
  choices?: number[];
  seed: number;
  index: number;
  /** Advanced Worlds: what the question shows; operands then hold its numbers for records only (decision 005). */
  form?: Form;
  /** Decimal places in the numbers (decimals World); answers may then be typed with a decimal point. */
  dp?: number;
}

export type MathToken =
  | { t: 'num'; v: number }
  | { t: 'op'; v: OperatorSymbol }
  | { t: 'eq' }
  | { t: 'blank' }
  /** A stacked fraction; null marks the unknown part. */
  | { t: 'frac'; n: number | null; d: number | null }
  /** A word from the catalogue (math.word.*), e.g. "of", "Area". */
  | { t: 'word'; key: string };

export interface WorkedStep {
  /** i18n key under `math.worked.*`. */
  key: string;
  values: Record<string, number>;
  /** Numeric value produced by this step (the last step's value is the answer). */
  value?: number;
  /** Optional sequence (e.g. skip counting) rendered as a list of numbers. */
  sequence?: number[];
}

export const OPERATOR_OF: Record<Arith, OperatorSymbol> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

export const OPERATION_PREFIX: Record<Operation, 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'FRA' | 'DEC' | 'GEO'> = {
  addition: 'ADD',
  subtraction: 'SUB',
  multiplication: 'MUL',
  division: 'DIV',
  fractions: 'FRA',
  decimals: 'DEC',
  geometry: 'GEO',
};

export const TOPICS: readonly Topic[] = ['fractions', 'decimals', 'geometry'];

export function isTopic(op: Operation): op is Topic {
  return (TOPICS as readonly string[]).includes(op);
}
