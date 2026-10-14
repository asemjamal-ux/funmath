import { checkAnswer } from './check';
import { distractorCount } from './distractors';
import type { Item, Skill } from './types';

/** Returns a list of PRD §6.5 violations for an item (empty = valid). Used by tests and dev-build assertions. */
export function itemViolations(item: Item, skill: Skill): string[] {
  const v: string[] = [];
  const [a, b, c] = item.operands;
  const max = skill.generator.valueMax;
  const values = [a, b, c, item.answer, ...(item.choices ?? [])];
  if (values.some((x) => !Number.isInteger(x) || x < 0)) v.push('P-01 non-integer or negative value');
  if (values.some((x) => x > max)) v.push('P-02 value exceeds catalogue range');
  const truth =
    item.operation === 'addition' ? a + b === c
    : item.operation === 'subtraction' ? a - b === c
    : item.operation === 'multiplication' ? a * b === c
    : b !== 0 && a % b === 0 && a / b === c;
  if (!truth) v.push('P-03 equation is false');
  const expected = item.blank === 'a' ? a : item.blank === 'b' ? b : c;
  if (expected !== item.answer) v.push('P-03 answer mismatch');
  if (item.operation === 'division' && b === 0) v.push('P-05 divisor is zero');
  if (item.operation === 'multiplication' && (a > 10 || b > 10)) v.push('P-06 factor outside 0–10');
  if (item.choices) {
    const choices = item.choices;
    if (choices.filter((x) => x === item.answer).length !== 1) v.push('P-07 answer must appear exactly once');
    const distractors = choices.filter((x) => x !== item.answer);
    if (new Set(distractors).size !== distractors.length) v.push('P-07 duplicate distractors');
    if (distractors.length !== distractorCount(skill)) v.push('P-07 wrong number of distractors');
    if (distractors.filter((x) => Math.abs(x - item.answer) === 1).length > 1) v.push('P-07 more than one off-by-one');
    if (distractors.some((x) => checkAnswer(item, x))) v.push('P-09 checker accepts a distractor');
  }
  return v;
}
