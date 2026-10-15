// Build-time content validation (agent-instructions §6.4): invalid content fails the build.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { lessonSchema, skillSchema, trophySchema } from '../src/services/content/schemas.ts';

const root = path.resolve(import.meta.dirname, '..');
const read = (p: string): unknown => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const errors: string[] = [];

/** Same rule as src/domain/math/topics.ts formAnswer (advanced Worlds, decision 005). */
type FormLike = { k: string; [key: string]: unknown };
function formAnswer(f: FormLike): number {
  const v = f as Record<string, number> & FormLike;
  switch (f.k) {
    case 'fracName': return v.n;
    case 'fracOf': return (v.q / v.d) * v.n;
    case 'fracEquiv': return f.simplify ? (f.ask === 'n' ? v.n : v.d) : f.ask === 'n' ? v.n * v.m : v.d * v.m;
    case 'fracAdd': return f.op === '+' ? v.a + v.b : v.a - v.b;
    case 'decFrac': return f.ask === 'dec' ? v.n / v.den : v.n;
    case 'rect': return f.measure === 'area' ? v.l * v.w : 2 * (v.l + v.w);
    case 'side': return v.w;
    default: return NaN;
  }
}
const close = (x: number, y: number) => Math.abs(x - y) < 1e-9;

// The advanced Worlds' generators live in their own file (decision 005); each Skill must have exactly one generator.
const topicGenerators = read('src/content/topic-generators.json') as Record<string, unknown>;
const rawSkills = read('src/content/skills.json') as Array<{ id: string; generator?: unknown }>;
for (const s of rawSkills) if (s.generator && topicGenerators[s.id]) errors.push(`${s.id} has two generators`);
for (const id of Object.keys(topicGenerators)) if (!rawSkills.some((s) => s.id === id)) errors.push(`topic-generators.json: unknown skill ${id}`);
const skills = z.array(skillSchema).safeParse(rawSkills.map((s) => ({ ...s, generator: s.generator ?? topicGenerators[s.id] })));
if (!skills.success) errors.push(`skills.json: ${skills.error.message}`);
const lessons = z.array(lessonSchema).safeParse(read('src/content/lessons.json'));
if (!lessons.success) errors.push(`lessons.json: ${lessons.error.message}`);
const trophies = z.array(trophySchema).safeParse(read('src/content/trophies.json'));
if (!trophies.success) errors.push(`trophies.json: ${trophies.error.message}`);

if (skills.success && lessons.success) {
  const mvp = skills.data.filter((s) => s.scope === 'mvp');
  // 26 arithmetic Skills (PRD §6.2) + 12 advanced-World Skills (decision 005).
  if (mvp.length !== 38) errors.push(`expected 38 MVP skills, found ${mvp.length}`);
  for (const s of mvp) {
    const lesson = lessons.data.find((l) => l.skillId === s.id);
    if (!lesson) {
      errors.push(`${s.id} has no lesson`);
      continue;
    }
    const kinds = lesson.steps.map((x) => x.kind);
    if (kinds[0] !== 'hook' || kinds[kinds.length - 1] !== 'ready') errors.push(`${s.id} lesson must start with hook and end with ready`);
    const guided = lesson.steps.filter((x) => x.kind === 'guided');
    if (guided.length < 2 || guided.length > 3) errors.push(`${s.id} lesson needs 2–3 guided tries`);
    for (const g of guided) {
      if (g.kind !== 'guided') continue;
      const [a, b, c] = g.item.operands;
      const op = g.item.operation;
      const form = g.item.form as FormLike | undefined;
      const ok = form
        ? g.item.blank === 'result' && close(formAnswer(form), c)
        : close(op === 'addition' ? a + b : op === 'subtraction' ? a - b : op === 'multiplication' ? a * b : b !== 0 ? a / b : NaN, c);
      if (!ok) errors.push(`${s.id} guided item ${a},${b},${c} is false`);
      if (!form && !g.item.dp && ![a, b, c].every(Number.isInteger)) errors.push(`${s.id} guided item has decimals but no dp`);
      const answer = g.item.blank === 'a' ? a : g.item.blank === 'b' ? b : c;
      if (g.item.choices.filter((x) => x === answer).length !== 1) errors.push(`${s.id} guided choices must contain the answer exactly once`);
      if (new Set(g.item.choices).size !== g.item.choices.length) errors.push(`${s.id} guided choices must be unique`);
    }
  }
  for (const s of skills.data) for (const p of s.prerequisites) if (!skills.data.some((x) => x.id === p)) errors.push(`${s.id} prerequisite ${p} missing`);
}
if (trophies.success && trophies.data.length !== 18) errors.push(`expected 18 trophies, found ${trophies.data.length}`);

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log('✓ content: 38 skills, 38 lessons, 18 trophies valid');
