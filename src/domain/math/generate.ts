import { createRng, rngFor, type Rng } from '../rng';
import { additionCarries, digitAt, regroupsAcrossZero, subtractionBorrows } from './digits';
import { makeDistractors } from './distractors';
import { isTopicSpec, topicImpl } from './topicRegistry';
import type { Arith, Blank, Item, ItemFormat, Skill, Tier, TierSpec } from './types';

type Pair = readonly [number, number];
const poolCache = new Map<string, { all: Pair[]; acrossZero: Pair[] }>();

function addOk(spec: Extract<TierSpec, { kind: 'add' }>, a: number, b: number): boolean {
  const s = a + b;
  if (s > spec.sumMax) return false;
  if (spec.sumMin !== undefined && s < spec.sumMin) return false;
  if (spec.sumExact !== undefined && s !== spec.sumExact) return false;
  if (spec.bMultipleOf && b % spec.bMultipleOf !== 0) return false;
  const carries = additionCarries(a, b);
  switch (spec.constraint ?? 'none') {
    case 'none':
      return true;
    case 'noBridgeTen':
    case 'noRegroup':
      return carries === 0;
    case 'bridgeTen':
    case 'regroupOnes':
      return digitAt(a, 0) + digitAt(b, 0) >= 10;
    case 'regroupExactlyOne':
      return carries === 1;
    case 'regroupAtLeastOne':
      return carries >= 1;
  }
}

function subOk(spec: Extract<TierSpec, { kind: 'sub' }>, a: number, b: number): boolean {
  if (b > a) return false; // PRD §6.5 rule 2: result ≥ 0
  if (spec.bMultipleOf && b % spec.bMultipleOf !== 0) return false;
  const borrows = subtractionBorrows(a, b);
  switch (spec.constraint ?? 'none') {
    case 'none':
      return true;
    case 'noBridgeTen':
    case 'noRegroup':
      return borrows === 0;
    case 'bridgeTen':
    case 'regroupOnes':
      return digitAt(a, 0) < digitAt(b, 0);
    case 'regroupExactlyOne':
      return borrows === 1;
    case 'regroupAtLeastOne':
      return borrows >= 1;
  }
}

/** Enumerates every valid (a, b) pair for a tier once; sampling from the pool is exact and unbiased. */
function pool(skill: Skill, tier: Tier): { all: Pair[]; acrossZero: Pair[] } {
  const key = `${skill.id}/${tier}`;
  const cached = poolCache.get(key);
  if (cached) return cached;
  const spec = skill.generator.tiers[String(tier) as '1' | '2' | '3'];
  if (isTopicSpec(spec)) throw new Error(`${key} is an advanced-topic generator`);
  const max = skill.generator.valueMax;
  const all: Pair[] = [];
  const acrossZero: Pair[] = [];
  switch (spec.kind) {
    case 'add':
      for (let a = spec.a[0]; a <= spec.a[1]; a++)
        for (let b = spec.b[0]; b <= spec.b[1]; b++)
          if (addOk(spec, a, b) && a + b <= max) all.push([a, b]);
      break;
    case 'sub':
      for (let a = spec.a[0]; a <= Math.min(spec.a[1], max); a++)
        for (let b = spec.b[0]; b <= spec.b[1]; b++)
          if (subOk(spec, a, b)) {
            all.push([a, b]);
            if (regroupsAcrossZero(a, b)) acrossZero.push([a, b]);
          }
      break;
    case 'family':
      for (let c = spec.c[0]; c <= spec.c[1]; c++) for (let a = 0; a <= c; a++) all.push([c, a]);
      break;
    case 'mul':
      for (const k of spec.keys)
        for (let o = spec.other[0]; o <= spec.other[1]; o++) if (k * o <= max) all.push([k, o]);
      break;
    case 'div':
      for (const d of spec.divisors)
        for (let q = spec.quotient[0]; q <= spec.quotient[1]; q++) {
          const dividend = d * q;
          if (dividend <= max && (spec.dividendMax === undefined || dividend <= spec.dividendMax))
            all.push([d, q]);
        }
      break;
    default: {
      const never: never = spec;
      throw new Error(`Unknown generator kind ${String(never)}`);
    }
  }
  if (all.length === 0) throw new Error(`Empty generator pool for ${key}`);
  const result = { all, acrossZero };
  poolCache.set(key, result);
  return result;
}

function formatFor(skill: Skill, tier: Tier, blank: Blank): ItemFormat {
  const f = skill.formats[String(tier) as '1' | '2' | '3'];
  // Column entry only makes sense when the result is the unknown (PRD §6.4).
  return f === 'column' && blank !== 'result' ? 'entry' : f;
}

function answerFor(operands: [number, number, number], blank: Blank): number {
  return blank === 'a' ? operands[0] : blank === 'b' ? operands[1] : operands[2];
}

/** A blank on a factor/divisor must still have exactly one solution (PRD §6.5 rule 5). */
function blankIsUnique(skill: Skill, operands: [number, number, number], blank: Blank): boolean {
  const [a, b, c] = operands;
  if (blank === 'result') return true;
  if (skill.operation === 'multiplication') return blank === 'a' ? b !== 0 : a !== 0;
  if (skill.operation === 'division') return blank === 'b' ? c !== 0 : true;
  return true;
}

export interface GenerateOptions {
  /** Force a presentation format (Games always use multiple choice). */
  format?: ItemFormat;
  /** Reject candidate items (used for set-level rules: no repeats, ×0/×1 cap, similar re-queue). */
  reject?: (item: Item) => boolean;
}

function buildCandidate(skill: Skill, tier: Tier, rng: Rng, seed: number, index: number, opts: GenerateOptions): Item {
  const spec = skill.generator.tiers[String(tier) as '1' | '2' | '3'];
  if (isTopicSpec(spec)) {
    // Advanced Worlds (decision 005): the topic module builds the question; every answer is still one number.
    const built = topicImpl().build(spec, rng);
    const f = opts.format ?? skill.formats[String(tier) as '1' | '2' | '3'];
    const item: Item = { skillId: skill.id, tier, format: f === 'column' ? 'entry' : f, ...built, seed, index };
    item.choices = rng.shuffle([item.answer, ...makeDistractors(item, skill, rng)]);
    return item;
  }
  const { all, acrossZero } = pool(skill, tier);
  let operation = skill.operation as Arith;
  let operands: [number, number, number];
  let blank: Blank;
  switch (spec.kind) {
    case 'add': {
      const [a, b] = rng.pick(all);
      operands = [a, b, a + b];
      blank = rng.pick(spec.blank);
      break;
    }
    case 'sub': {
      const useZero = spec.acrossZeroShare !== undefined && acrossZero.length > 0 && rng.next() < spec.acrossZeroShare;
      const [a, b] = rng.pick(useZero ? acrossZero : all);
      operands = [a, b, a - b];
      blank = rng.pick(spec.blank);
      break;
    }
    case 'family': {
      const [c, a] = rng.pick(all);
      const form = rng.pick(spec.forms);
      if (form === 'sub_b') {
        operation = 'subtraction';
        operands = [c, c - a, a];
        blank = 'b';
      } else {
        operation = 'addition';
        operands = [a, c - a, c];
        blank = form === 'add_a' ? 'a' : 'b';
      }
      break;
    }
    case 'mul': {
      const [k, o] = rng.pick(all);
      const swap = spec.order === 'mixed' && rng.next() < 0.5;
      const a = swap ? o : k;
      const b = swap ? k : o;
      operands = [a, b, a * b];
      blank = rng.pick(spec.blank);
      break;
    }
    case 'div': {
      const [d, q] = rng.pick(all);
      operands = [d * q, d, q];
      blank = rng.pick(spec.blank);
      break;
    }
  }
  if (!blankIsUnique(skill, operands, blank)) blank = 'result';
  const answer = answerFor(operands, blank);
  const item: Item = {
    skillId: skill.id,
    tier,
    format: opts.format ?? formatFor(skill, tier, blank),
    operation,
    operands,
    blank,
    answer,
    seed,
    index,
  };
  item.choices = rng.shuffle([answer, ...makeDistractors(item, skill, rng)]);
  return item;
}

/** Deterministic: the same (skill, tier, seed, index, options) always yields the same Item (P-10). */
export function generateItem(skill: Skill, tier: Tier, seed: number, index: number, opts: GenerateOptions = {}): Item {
  let last: Item | undefined;
  for (let attempt = 0; attempt < 60; attempt++) {
    const item = buildCandidate(skill, tier, rngFor(seed, index, attempt), seed, index, opts);
    if (!opts.reject || !opts.reject(item)) return item;
    last = item;
  }
  // Pools are small for some Tiers; a final deterministic scan guarantees a valid non-rejected item if one exists.
  const rng = createRng(seed ^ index);
  for (let attempt = 0; attempt < 400; attempt++) {
    const item = buildCandidate(skill, tier, rng, seed, index, opts);
    if (!opts.reject || !opts.reject(item)) return item;
  }
  return last as Item;
}

export function sameItem(x: Item, y: Item): boolean {
  return (
    x.operation === y.operation &&
    x.blank === y.blank &&
    x.operands[0] === y.operands[0] &&
    x.operands[1] === y.operands[1] &&
    x.operands[2] === y.operands[2] &&
    JSON.stringify(x.form) === JSON.stringify(y.form)
  );
}

/** ×0 / ×1 facts count against the per-set cap (P-06). */
export function isTrivialFact(item: Item): boolean {
  return item.operation === 'multiplication' && !item.form && !item.dp && (item.operands[0] <= 1 || item.operands[1] <= 1);
}
