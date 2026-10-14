// Build-time content validation (agent-instructions §6.4): invalid content fails the build.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { lessonSchema, skillSchema, trophySchema } from '../src/services/content/schemas.ts';

const root = path.resolve(import.meta.dirname, '..');
const read = (p: string): unknown => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const errors: string[] = [];

const skills = z.array(skillSchema).safeParse(read('src/content/skills.json'));
if (!skills.success) errors.push(`skills.json: ${skills.error.message}`);
const lessons = z.array(lessonSchema).safeParse(read('src/content/lessons.json'));
if (!lessons.success) errors.push(`lessons.json: ${lessons.error.message}`);
const trophies = z.array(trophySchema).safeParse(read('src/content/trophies.json'));
if (!trophies.success) errors.push(`trophies.json: ${trophies.error.message}`);

if (skills.success && lessons.success) {
  const mvp = skills.data.filter((s) => s.scope === 'mvp');
  if (mvp.length !== 26) errors.push(`expected 26 MVP skills, found ${mvp.length}`);
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
      const ok = op === 'addition' ? a + b === c : op === 'subtraction' ? a - b === c : op === 'multiplication' ? a * b === c : b !== 0 && a / b === c;
      if (!ok) errors.push(`${s.id} guided item ${a},${b},${c} is false`);
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
console.log('✓ content: 26 skills, 26 lessons, 18 trophies valid');
