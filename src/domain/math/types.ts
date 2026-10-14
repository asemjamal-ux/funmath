export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';
export type OperatorSymbol = '+' | '−' | '×' | '÷';
export type SkillId = `${'ADD' | 'SUB' | 'MUL' | 'DIV'}-${string}`;
export type Tier = 1 | 2 | 3;
export type Stage = 1 | 2 | 3 | 4 | 5;
export type ItemFormat = 'choice' | 'entry' | 'column';
/** Position of the unknown: operand a, operand b, or the result. */
export type Blank = 'a' | 'b' | 'result';
export type ModelKind = 'counters' | 'tenFrame' | 'numberLine' | 'baseTen' | 'array' | 'plates' | 'groups';
export type GameId = 'bubble-pop' | 'number-line-hop' | 'match-pairs';

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
  | { kind: 'div'; divisors: number[]; quotient: [number, number]; dividendMax?: number; blank: Blank[] };

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
  operation: Operation;
  /** [a, b, result] — the full true equation a ∘ b = result. */
  operands: [number, number, number];
  blank: Blank;
  answer: number;
  choices?: number[];
  seed: number;
  index: number;
}

export type MathToken =
  | { t: 'num'; v: number }
  | { t: 'op'; v: OperatorSymbol }
  | { t: 'eq' }
  | { t: 'blank' };

export interface WorkedStep {
  /** i18n key under `math.worked.*`. */
  key: string;
  values: Record<string, number>;
  /** Numeric value produced by this step (the last step's value is the answer). */
  value?: number;
  /** Optional sequence (e.g. skip counting) rendered as a list of numbers. */
  sequence?: number[];
}

export const OPERATOR_OF: Record<Operation, OperatorSymbol> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

export const OPERATION_PREFIX: Record<Operation, 'ADD' | 'SUB' | 'MUL' | 'DIV'> = {
  addition: 'ADD',
  subtraction: 'SUB',
  multiplication: 'MUL',
  division: 'DIV',
};
