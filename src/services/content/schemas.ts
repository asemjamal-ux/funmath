import { z } from 'zod';

const range = z.tuple([z.number().int().min(0), z.number().int().min(0)]);
const blank = z.enum(['a', 'b', 'result']);
const constraint = z.enum(['none', 'noBridgeTen', 'bridgeTen', 'noRegroup', 'regroupOnes', 'regroupExactlyOne', 'regroupAtLeastOne']);
const skillId = z.string().regex(/^(ADD|SUB|MUL|DIV|FRA|DEC|GEO)-\d\d$/);
const gameId = z.enum(['bubble-pop', 'number-line-hop', 'match-pairs', 'bingo', 'number-hunt', 'true-false']);
const format = z.enum(['choice', 'entry', 'column']);
const model = z.enum(['counters', 'tenFrame', 'numberLine', 'baseTen', 'array', 'plates', 'groups', 'form']);
const arith = z.enum(['addition', 'subtraction', 'multiplication', 'division']);
const span = z.tuple([z.number().int().min(1), z.number().int().min(1)]);
const formSchema = z.discriminatedUnion('k', [
  z.object({ k: z.literal('fracName'), n: z.number().int().min(1), d: z.number().int().min(2), shape: z.enum(['bar', 'circle']) }),
  z.object({ k: z.literal('fracOf'), n: z.number().int().min(1), d: z.number().int().min(2), q: z.number().int().min(2) }),
  z.object({ k: z.literal('fracEquiv'), n: z.number().int().min(1), d: z.number().int().min(2), m: z.number().int().min(2), ask: z.enum(['n', 'd']), simplify: z.boolean() }),
  z.object({ k: z.literal('fracAdd'), a: z.number().int().min(1), b: z.number().int().min(1), d: z.number().int().min(2), op: z.enum(['+', '−']) }),
  z.object({ k: z.literal('decFrac'), n: z.number().int().min(1), den: z.union([z.literal(10), z.literal(100)]), ask: z.enum(['dec', 'frac']) }),
  z.object({ k: z.literal('rect'), measure: z.enum(['area', 'perim']), l: z.number().int().min(1), w: z.number().int().min(1), grid: z.boolean() }),
  z.object({ k: z.literal('side'), of: z.enum(['area', 'perim']), l: z.number().int().min(1), w: z.number().int().min(1) }),
]);

export const tierSpecSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('add'), a: range, b: range, sumMin: z.number().int().optional(), sumMax: z.number().int(),
    sumExact: z.number().int().optional(), bMultipleOf: z.number().int().optional(), constraint: constraint.optional(), blank: z.array(blank).min(1),
  }),
  z.object({
    kind: z.literal('sub'), a: range, b: range, bMultipleOf: z.number().int().optional(), constraint: constraint.optional(),
    acrossZeroShare: z.number().min(0).max(1).optional(), blank: z.array(blank).min(1),
  }),
  z.object({ kind: z.literal('family'), c: range, forms: z.array(z.enum(['add_b', 'add_a', 'sub_b'])).min(1) }),
  z.object({ kind: z.literal('mul'), keys: z.array(z.number().int().min(0).max(10)).min(1), other: range, order: z.enum(['keyFirst', 'mixed']), blank: z.array(blank).min(1) }),
  z.object({ kind: z.literal('div'), divisors: z.array(z.number().int().min(1).max(10)).min(1), quotient: range, dividendMax: z.number().int().optional(), blank: z.array(blank).min(1) }),
  // Advanced Worlds (decision 005)
  z.object({ kind: z.literal('fracName'), d: span }),
  z.object({ kind: z.literal('fracOf'), d: span, k: span, nonUnit: z.boolean() }),
  z.object({ kind: z.literal('fracEquiv'), d: span, m: span, ask: z.array(z.enum(['n', 'd'])).min(1), simplify: z.boolean() }),
  z.object({ kind: z.literal('fracAdd'), d: span, ops: z.array(z.enum(['+', '−'])).min(1) }),
  z.object({ kind: z.literal('decFrac'), den: z.union([z.literal(10), z.literal(100)]), n: span, ask: z.array(z.enum(['dec', 'frac'])).min(1) }),
  z.object({ kind: z.literal('decAdd'), a: span, b: span, ops: z.array(z.enum(['+', '−'])).min(1), noRegroup: z.boolean().optional() }),
  z.object({ kind: z.literal('decShift'), a: span, factors: z.array(z.union([z.literal(10), z.literal(100)])).min(1), ops: z.array(z.enum(['×', '÷'])).min(1) }),
  z.object({ kind: z.literal('rect'), measure: z.enum(['area', 'perim']), l: span, w: span, grid: z.boolean() }),
  z.object({ kind: z.literal('side'), of: z.array(z.enum(['area', 'perim'])).min(1), l: span, w: span }),
]);

export const skillSchema = z.object({
  id: skillId,
  operation: z.enum(['addition', 'subtraction', 'multiplication', 'division', 'fractions', 'decimals', 'geometry']),
  stage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  order: z.number().int().min(1),
  prerequisites: z.array(skillId),
  scope: z.enum(['mvp', 'future']),
  titleKey: z.string(),
  model,
  lessonId: z.string(),
  games: z.array(gameId),
  formats: z.object({ '1': format, '2': format, '3': format }),
  generator: z.object({
    valueMax: z.number().int().positive(),
    tiers: z.object({ '1': tierSpecSchema, '2': tierSpecSchema, '3': tierSpecSchema }),
  }),
});

export const manipulativeSchema = z.object({
  kind: model.exclude(['form']),
  op: arith,
  a: z.number().int().min(0),
  b: z.number().int().min(0),
});

export const fixedItemSchema = z.object({
  operation: arith,
  // Decimals World operands may have up to two decimal places (decision 005).
  operands: z.tuple([z.number().min(0), z.number().min(0), z.number().min(0)]),
  blank,
  choices: z.array(z.number().min(0)).min(3).max(4),
  form: formSchema.optional(),
  dp: z.number().int().min(1).max(2).optional(),
});

export const lessonStepSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('hook'), textKey: z.string(), audioKey: z.string(), illustration: z.string() }),
  z.object({ kind: z.literal('model'), textKey: z.string(), audioKey: z.string(), model: manipulativeSchema.optional(), form: formSchema.optional() }),
  z.object({ kind: z.literal('guided'), textKey: z.string(), audioKey: z.string(), item: fixedItemSchema }),
  z.object({ kind: z.literal('keyIdea'), textKey: z.string(), audioKey: z.string(), expression: fixedItemSchema.omit({ choices: true }).optional() }),
  z.object({ kind: z.literal('ready'), textKey: z.string(), audioKey: z.string() }),
]);

export const lessonSchema = z.object({
  id: z.string(),
  skillId,
  steps: z.array(lessonStepSchema).min(4).max(7),
});

export const trophySchema = z.object({
  id: z.string().regex(/^TR-\d\d$/),
  titleKey: z.string(),
  hintKey: z.string(),
  icon: z.string(),
  rule: z.discriminatedUnion('type', [
    z.object({ type: z.literal('counterAtLeast'), counter: z.enum(['lessonsCompleted', 'correctAfterHint', 'practiceSetsCompleted', 'dailyMixCompleted', 'distinctPracticeDays']), value: z.number().int().positive() }),
    z.object({ type: z.literal('anySkillAtStars'), stars: z.number().int().min(1).max(3) }),
    z.object({ type: z.literal('skillAtStars'), skill: skillId, stars: z.number().int().min(1).max(3) }),
    z.object({ type: z.literal('allSkillsAtStars'), skills: z.array(skillId).min(1), stars: z.number().int().min(1).max(3) }),
    z.object({ type: z.literal('allMvpSkillsAtStars'), stars: z.number().int().min(1).max(3) }),
    z.object({ type: z.literal('oasisStageAtLeast'), value: z.number().int().min(1).max(10) }),
    z.object({ type: z.literal('distinctGamesPlayed'), value: z.number().int().min(1) }),
  ]),
});

export type Lesson = z.infer<typeof lessonSchema>;
export type LessonStep = z.infer<typeof lessonStepSchema>;
export type FixedItem = z.infer<typeof fixedItemSchema>;
export type ManipulativeSpec = z.infer<typeof manipulativeSchema>;
