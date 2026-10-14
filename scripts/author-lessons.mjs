// Authoring tool: regenerates src/content/lessons.json from this compact table.
// Text lives in the locale catalogues under lesson.{SKILL}.{hook|model|keyIdea}; guided/ready prompts are shared.
import fs from 'node:fs';

const T = {
  // skill: [modelKind, modelOp, a, b, guided items [a, b, blank], keyIdea [a, b]]
  'ADD-01': ['counters', 'addition', 2, 3, [[1, 2, 'result'], [3, 1, 'result']], [2, 3]],
  'ADD-02': ['tenFrame', 'addition', 6, 3, [[5, 2, 'result'], [7, 3, 'result'], [4, 4, 'result']], [6, 3]],
  'ADD-03': ['tenFrame', 'addition', 7, 3, [[6, 4, 'b'], [8, 2, 'b']], [7, 3]],
  'ADD-04': ['numberLine', 'addition', 8, 5, [[9, 4, 'result'], [7, 6, 'result']], [8, 5]],
  'ADD-05': ['baseTen', 'addition', 23, 14, [[32, 15, 'result'], [41, 26, 'result']], [23, 14]],
  'ADD-06': ['baseTen', 'addition', 27, 15, [[38, 4, 'result'], [46, 27, 'result']], [27, 15]],
  'ADD-07': ['baseTen', 'addition', 246, 137, [[315, 128, 'result'], [264, 153, 'result']], [246, 137]],
  'SUB-01': ['counters', 'subtraction', 5, 2, [[4, 1, 'result'], [5, 3, 'result']], [5, 2]],
  'SUB-02': ['tenFrame', 'subtraction', 9, 4, [[8, 3, 'result'], [10, 6, 'result']], [9, 4]],
  'SUB-03': ['counters', 'addition', 4, 3, [[3, 4, 'b'], [5, 2, 'b']], [4, 3]],
  'SUB-04': ['numberLine', 'subtraction', 13, 5, [[12, 4, 'result'], [15, 7, 'result']], [13, 5]],
  'SUB-05': ['baseTen', 'subtraction', 48, 23, [[57, 34, 'result'], [69, 25, 'result']], [48, 23]],
  'SUB-06': ['baseTen', 'subtraction', 42, 17, [[53, 8, 'result'], [64, 38, 'result']], [42, 17]],
  'SUB-07': ['baseTen', 'subtraction', 302, 158, [[425, 162, 'result'], [503, 247, 'result']], [302, 158]],
  'MUL-01': ['groups', 'multiplication', 3, 4, [[2, 5, 'result'], [4, 3, 'result']], [3, 4]],
  'MUL-02': ['array', 'multiplication', 3, 4, [[2, 5, 'result'], [4, 3, 'result']], [3, 4]],
  'MUL-03': ['array', 'multiplication', 5, 3, [[2, 7, 'result'], [10, 4, 'result'], [0, 6, 'result']], [5, 3]],
  'MUL-04': ['array', 'multiplication', 4, 6, [[3, 5, 'result'], [4, 7, 'result']], [4, 6]],
  'MUL-05': ['array', 'multiplication', 6, 4, [[6, 3, 'result'], [7, 5, 'result']], [6, 4]],
  'MUL-06': ['array', 'multiplication', 9, 3, [[8, 4, 'result'], [9, 6, 'result']], [9, 3]],
  'DIV-01': ['plates', 'division', 12, 3, [[10, 2, 'result'], [15, 5, 'result']], [12, 3]],
  'DIV-02': ['groups', 'division', 15, 5, [[12, 4, 'result'], [18, 3, 'result']], [15, 5]],
  'DIV-03': ['groups', 'division', 20, 5, [[14, 2, 'result'], [0, 10, 'result'], [30, 10, 'result']], [20, 5]],
  'DIV-04': ['groups', 'division', 12, 4, [[21, 3, 'result'], [28, 4, 'result']], [12, 4]],
  'DIV-05': ['groups', 'division', 42, 6, [[36, 6, 'result'], [35, 7, 'result']], [42, 6]],
  'DIV-06': ['groups', 'division', 72, 8, [[56, 8, 'result'], [81, 9, 'result']], [72, 8]],
};

const skills = JSON.parse(fs.readFileSync('src/content/skills.json', 'utf8'));
const opOf = (id) => ({ ADD: 'addition', SUB: 'subtraction', MUL: 'multiplication', DIV: 'division' })[id.slice(0, 3)];

function solve(op, a, b) {
  return op === 'addition' ? a + b : op === 'subtraction' ? a - b : op === 'multiplication' ? a * b : a / b;
}

function choicesFor(answer, count, max) {
  const out = [answer];
  const cand = [answer + 1, answer + 2, answer - 2, answer + 10, answer - 10, answer + 3, answer - 3, answer + 4];
  for (const c of cand) if (out.length < count && c >= 0 && c <= max && !out.includes(c)) out.push(c);
  // deterministic rotation so the answer is not always first
  const k = answer % out.length;
  return [...out.slice(k), ...out.slice(0, k)];
}

const lessons = Object.entries(T).map(([id, [kind, mop, ma, mb, guided, key]]) => {
  const skill = skills.find((s) => s.id === id);
  const op = id === 'SUB-03' ? 'addition' : opOf(id);
  const count = skill.stage === 1 ? 3 : 4;
  const max = skill.generator.valueMax;
  const steps = [
    { kind: 'hook', textKey: `lesson.${id}.hook`, audioKey: `${id}.hook`, illustration: 'oasis' },
    { kind: 'model', textKey: `lesson.${id}.model`, audioKey: `${id}.model`, model: { kind, op: mop, a: ma, b: mb } },
    ...guided.map(([a, b, blank], i) => {
      const c = solve(op, a, b);
      const answer = blank === 'a' ? a : blank === 'b' ? b : c;
      return {
        kind: 'guided',
        textKey: 'lesson.guided.prompt',
        audioKey: `${id}.guided${i + 1}`,
        item: { operation: op, operands: [a, b, c], blank, choices: choicesFor(answer, count, max) },
      };
    }),
    { kind: 'keyIdea', textKey: `lesson.${id}.keyIdea`, audioKey: `${id}.keyIdea`, expression: { operation: mop, operands: [key[0], key[1], solve(mop, key[0], key[1])], blank: 'result' } },
    { kind: 'ready', textKey: 'lesson.ready', audioKey: 'ui.ready' },
  ];
  return { id: `lesson-${id}`, skillId: id, steps };
});

fs.writeFileSync('src/content/lessons.json', JSON.stringify(lessons, null, 2) + '\n');
console.log(`Wrote ${lessons.length} lessons`);
