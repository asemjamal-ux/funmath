// The advanced Worlds' generators install themselves on import (decision 005).
import '../src/domain/math/topics';
import '../src/services/content/topicGenerators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MVP_SKILLS, getSkill } from '../src/services/content';
import { generateItem, isTrivialFact, sameItem } from '../src/domain/math/generate';
import { checkAnswer, parseDigits } from '../src/domain/math/check';
import { itemViolations } from '../src/domain/math/validate';
import { isTopicItem } from '../src/domain/math/topicRegistry';
import { workedExample } from '../src/domain/math/present';
import { additionCarries, regroupsAcrossZero, subtractionBorrows, digitAt } from '../src/domain/math/digits';
import { nextSetItem, similarItem, MAX_TRIVIAL_FACTS_PER_SET } from '../src/domain/math/practiceSet';
import type { Item, Skill, Tier } from '../src/domain/math/types';

// 1,000 runs per Skill × Tier on every run; set PROPERTY_RUNS=10000 for the nightly gate (agent-instructions §12.1).
const RUNS = Number((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.PROPERTY_RUNS ?? 1000);
const TIERS: Tier[] = [1, 2, 3];
const toEastern = (n: number) => String(n).replace(/\d/g, (d) => String.fromCodePoint(0x0660 + Number(d)));
const toPersian = (n: number) => String(n).replace(/\d/g, (d) => String.fromCodePoint(0x06f0 + Number(d)));

function forAllItems(skill: Skill, tier: Tier, check: (item: Item) => void) {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 0xffffffff }), fc.integer({ min: 0, max: 50 }), (seed, index) => {
      check(generateItem(skill, tier, seed, index));
    }),
    { numRuns: RUNS },
  );
}

describe('math engine invariants P-01..P-11', () => {
  it('has 38 MVP skills (26 arithmetic + 12 advanced, decision 005)', () => expect(MVP_SKILLS).toHaveLength(38));

  for (const skill of MVP_SKILLS) {
    for (const tier of TIERS) {
      it(`${skill.id} tier ${tier}`, () => {
        forAllItems(skill, tier, (item) => {
          expect(itemViolations(item, skill)).toEqual([]);
          const [a, b, c] = item.operands;
          const arithmetic = !isTopicItem(item); // advanced-World operands are records, checked by itemViolations
          // P-04 regrouping rules
          if (arithmetic && item.operation === 'subtraction') expect(c).toBeGreaterThanOrEqual(0);
          const spec = skill.generator.tiers[String(tier) as '1'];
          if ('constraint' in spec && item.blank === 'result') {
            if (spec.constraint === 'noRegroup' || spec.constraint === 'noBridgeTen') {
              expect(item.operation === 'addition' ? additionCarries(a, b) : subtractionBorrows(a, b)).toBe(0);
            }
            if (tier === 3 && (skill.id === 'ADD-06' || skill.id === 'SUB-06' || skill.id === 'ADD-07' || skill.id === 'SUB-07')) {
              expect(item.operation === 'addition' ? additionCarries(a, b) : subtractionBorrows(a, b)).toBeGreaterThanOrEqual(1);
            }
          }
          // P-05
          if (arithmetic && item.operation === 'division') {
            expect(b).not.toBe(0);
            expect(a % b).toBe(0);
            if (a === 0) expect(['DIV-03', 'DIV-04', 'DIV-05', 'DIV-06']).toContain(skill.id);
          }
          // P-09 digit forms
          expect(checkAnswer(item, String(item.answer))).toBe(true);
          expect(checkAnswer(item, toEastern(item.answer))).toBe(true);
          expect(checkAnswer(item, toPersian(item.answer))).toBe(true);
          // P-11
          const steps = workedExample(item);
          expect(steps[steps.length - 1]?.value).toBe(item.answer);
        });
      });
    }
  }

  it('P-10 determinism: same (seed, index) → identical item', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MVP_SKILLS), fc.constantFrom<Tier>(1, 2, 3), fc.nat(), fc.nat(40), (skill, tier, seed, index) => {
        expect(generateItem(skill, tier, seed, index)).toEqual(generateItem(skill, tier, seed, index));
      }),
      { numRuns: RUNS },
    );
  });

  it('P-04 SUB-07 tier 3 regroups across zero in ≥ 20 % of items', () => {
    const skill = getSkill('SUB-07')!;
    let across = 0;
    const n = Math.max(RUNS, 2000);
    for (let i = 0; i < n; i++) {
      const it = generateItem(skill, 3, i * 7919, i);
      if (regroupsAcrossZero(it.operands[0], it.operands[1])) across++;
    }
    expect(across / n).toBeGreaterThanOrEqual(0.2);
  });

  it('P-06 / P-08 set-level rules: ≤ 2 trivial facts, no repeats, re-queues differ', () => {
    for (const id of ['MUL-02', 'MUL-03', 'MUL-04', 'MUL-05', 'MUL-06', 'ADD-01', 'SUB-01', 'ADD-03']) {
      const skill = getSkill(id)!;
      for (let seed = 0; seed < 200; seed++) {
        const items: Item[] = [];
        for (let i = 0; i < 12; i++) items.push(nextSetItem(skill, ((i % 3) + 1) as Tier, seed, i, items));
        if (skill.operation === 'multiplication') expect(items.filter(isTrivialFact).length).toBeLessThanOrEqual(MAX_TRIVIAL_FACTS_PER_SET);
        for (let i = 1; i < items.length; i++) expect(sameItem(items[i - 1]!, items[i]!)).toBe(false);
        const sim = similarItem(skill, items[0]!, seed, 99, items);
        expect(sameItem(sim, items[0]!)).toBe(false);
        expect(sim.operation).toBe(items[0]!.operation);
      }
    }
  });
});

describe('example edge cases', () => {
  const mk = (skillId: string, operation: Item['operation'], operands: [number, number, number]): Item => ({
    skillId: skillId as Item['skillId'], tier: 1, format: 'entry', operation, operands, blank: 'result', answer: operands[2], seed: 0, index: 0,
  });
  it.each([
    ['ADD-01', 'addition', [0, 0, 0]],
    ['SUB-02', 'subtraction', [10, 10, 0]],
    ['MUL-03', 'multiplication', [0, 7, 0]],
    ['MUL-03', 'multiplication', [7, 0, 0]],
    ['DIV-03', 'division', [0, 5, 0]],
    ['SUB-06', 'subtraction', [100, 1, 99]],
    ['ADD-07', 'addition', [500, 499, 999]],
    ['SUB-07', 'subtraction', [302, 158, 144]],
    ['MUL-03', 'multiplication', [10, 10, 100]],
    ['DIV-06', 'division', [90, 9, 10]],
  ] as const)('%s %s %j', (id, op, operands) => {
    const item = mk(id, op, [...operands]);
    expect(itemViolations(item, getSkill(id)!)).toEqual([]);
    expect(workedExample(item).at(-1)?.value).toBe(item.answer);
    expect(checkAnswer(item, toEastern(item.answer))).toBe(true);
  });
  it('302 − 158 regroups across zero', () => {
    expect(regroupsAcrossZero(302, 158)).toBe(true);
    expect(subtractionBorrows(302, 158)).toBe(2);
    expect(digitAt(302, 1)).toBe(0);
  });
  it('parseDigits normalises digit systems and separators', () => {
    expect(parseDigits('٣٤٥')).toBe(345);
    expect(parseDigits('۱۲')).toBe(12);
    expect(parseDigits(' 12,000 ')).toBe(12000);
    expect(parseDigits('١٢٬٠٠٠')).toBe(12000);
    expect(parseDigits('12a')).toBeNull();
    expect(parseDigits('')).toBeNull();
  });
});
